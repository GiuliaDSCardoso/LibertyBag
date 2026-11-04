import { addMonths, format, parseISO } from 'date-fns';
import {
  db,
  type PaymentMethod,
  type TransactionRecord,
  type TransactionType
} from '../../db/dexie';
import { DEFAULT_SPACE_ID, DEFAULT_USER_ID } from '../../db/seed';
import { formatCentsToBRL } from '../../lib/money';

export type InterestInputMode = 'total_with_interest' | 'installment_value';

export interface InstallmentPlanInput {
  baseAmountCents: number; // Valor original à vista
  installmentsCount: number; // Quantidade de parcelas mensais (1 a 60)
  hasDownPayment?: boolean; // Se deu uma entrada à vista e parcelou o resto
  downPaymentCents?: number; // Valor da entrada em centavos
  hasInterest?: boolean; // Se teve juros no parcelamento
  interestMode?: InterestInputMode;
  totalWithInterestCents?: number; // Valor total final com juros (incluindo entrada, se houver)
  customInstallmentCents?: number; // Valor fixo de cada parcela com juros
}

export interface InstallmentPlanSummary {
  baseAmountCents: number;
  downPaymentCents: number;
  principalToFinanceCents: number;
  installmentsCount: number;
  installmentAmountsCents: number[]; // Valor exato de cada parcela (1..N)
  firstInstallmentCents: number;
  regularInstallmentCents: number;
  financedTotalCents: number; // Soma das parcelas
  finalTotalCents: number; // Entrada + Soma das parcelas
  interestCents: number; // Juros totais pagos
  hasInterest: boolean;
  summaryText: string; // Resumo em linguagem simples para a mãe ler na hora
}

/**
 * Calcula o plano completo de parcelamento (com ou sem entrada, com ou sem juros)
 * sempre em centavos inteiros.
 */
export function calculateInstallmentPlan(
  input: InstallmentPlanInput
): InstallmentPlanSummary {
  const baseAmountCents = Math.max(0, Math.round(input.baseAmountCents || 0));
  const installmentsCount = Math.max(
    1,
    Math.min(60, Math.floor(input.installmentsCount || 1))
  );

  const downPaymentCents =
    input.hasDownPayment && (input.downPaymentCents || 0) > 0
      ? Math.min(baseAmountCents, Math.max(0, Math.round(input.downPaymentCents || 0)))
      : 0;

  const principalToFinanceCents = Math.max(0, baseAmountCents - downPaymentCents);

  let financedTotalCents = principalToFinanceCents;
  let installmentAmountsCents: number[] = [];

  if (input.hasInterest) {
    if (
      input.interestMode === 'installment_value' &&
      (input.customInstallmentCents || 0) > 0
    ) {
      const fixedPerMonth = Math.round(input.customInstallmentCents || 0);
      installmentAmountsCents = Array.from(
        { length: installmentsCount },
        () => fixedPerMonth
      );
      financedTotalCents = fixedPerMonth * installmentsCount;
    } else if ((input.totalWithInterestCents || 0) > 0) {
      const informedTotal = Math.round(input.totalWithInterestCents || 0);
      financedTotalCents = Math.max(
        principalToFinanceCents,
        informedTotal - downPaymentCents
      );
      const basePerMonth = Math.floor(financedTotalCents / installmentsCount);
      const remainder = financedTotalCents - basePerMonth * installmentsCount;
      installmentAmountsCents = Array.from({ length: installmentsCount }, (_, i) =>
        i === 0 ? basePerMonth + remainder : basePerMonth
      );
    }
  }

  if (installmentAmountsCents.length === 0) {
    const basePerMonth = Math.floor(financedTotalCents / installmentsCount);
    const remainder = financedTotalCents - basePerMonth * installmentsCount;
    installmentAmountsCents = Array.from({ length: installmentsCount }, (_, i) =>
      i === 0 ? basePerMonth + remainder : basePerMonth
    );
  }

  const finalTotalCents = downPaymentCents + financedTotalCents;
  const interestCents = Math.max(0, finalTotalCents - baseAmountCents);
  const firstInstallmentCents = installmentAmountsCents[0] || 0;
  const regularInstallmentCents =
    installmentAmountsCents[installmentAmountsCents.length - 1] || firstInstallmentCents;

  // Monta frase simples e clara
  const parts: string[] = [];
  if (downPaymentCents > 0) {
    parts.push(`Entrada hoje de ${formatCentsToBRL(downPaymentCents)}`);
  }
  if (installmentsCount > 1 || downPaymentCents > 0) {
    parts.push(
      `${installmentsCount}x de ${formatCentsToBRL(regularInstallmentCents)}/mês`
    );
  } else {
    parts.push(`À vista: ${formatCentsToBRL(finalTotalCents)}`);
  }

  let summaryText = parts.join(' + ');
  if (interestCents > 0) {
    summaryText += ` • Total com juros: ${formatCentsToBRL(finalTotalCents)} (${formatCentsToBRL(
      interestCents
    )} de juros)`;
  } else if (installmentsCount > 1 || downPaymentCents > 0) {
    summaryText += ` • Total sem juros: ${formatCentsToBRL(finalTotalCents)}`;
  }

  return {
    baseAmountCents,
    downPaymentCents,
    principalToFinanceCents,
    installmentsCount,
    installmentAmountsCents,
    firstInstallmentCents,
    regularInstallmentCents,
    financedTotalCents,
    finalTotalCents,
    interestCents,
    hasInterest: interestCents > 0,
    summaryText
  };
}

export interface CreateTransactionInput {
  userId?: string;
  spaceId?: string;
  amountCents: number;
  type: TransactionType;
  categoryId: string;
  date: string; // YYYY-MM-DD
  description?: string;
  paymentMethod?: PaymentMethod;
  repeatMonthly?: boolean;
  repeatMonthsCount?: number | null; // se quiser gerar já para os próximos N meses fixos
  installmentsCount?: number; // ex.: 3 para 3x
  hasDownPayment?: boolean;
  downPaymentCents?: number;
  hasInterest?: boolean;
  interestMode?: InterestInputMode;
  totalWithInterestCents?: number;
  customInstallmentCents?: number;
}

export interface CreateTransactionResult {
  createdIds: string[];
  recurrenceId: string | null;
  undo: () => Promise<void>;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Cria um lançamento (à vista, parcelado no crédito/pix parcelado, com ou sem entrada,
 * com ou sem juros, ou repetindo em outros meses) em centavos no Dexie
 * e retorna uma função `undo()` para reverter tudo com 1 toque.
 */
export async function createTransactionWithUndo(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  const now = new Date().toISOString();
  const userId = input.userId || DEFAULT_USER_ID;
  const spaceId = input.spaceId || DEFAULT_SPACE_ID;
  const cleanDescription = (input.description || '').trim();

  const installmentsTotal =
    input.installmentsCount && input.installmentsCount > 1
      ? Math.min(60, Math.floor(input.installmentsCount))
      : 1;

  const isMultiInstallment =
    installmentsTotal > 1 || (!!input.hasDownPayment && (input.downPaymentCents || 0) > 0);

  const createdIds: string[] = [];
  let recurrenceId: string | null = null;

  await db.transaction('rw', [db.transactions, db.recurrences], async () => {
    if (input.repeatMonthly) {
      recurrenceId = generateId();
      const nextMonthDate = format(addMonths(parseISO(input.date), 1), 'yyyy-MM-dd');
      await db.recurrences.put({
        id: recurrenceId,
        userId,
        spaceId,
        rule: 'mensal',
        nextDate: nextMonthDate,
        active: true,
        templateTitle: cleanDescription || 'Conta mensal',
        amountCents: Math.round(input.amountCents),
        categoryId: input.categoryId,
        type: input.type,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });
    }

    // Se ativou "repete em outros meses" com uma quantidade específica de meses (ex.: repetir por 6 meses)
    if (input.repeatMonthly && input.repeatMonthsCount && input.repeatMonthsCount > 1) {
      const count = Math.min(60, Math.floor(input.repeatMonthsCount));
      const baseDate = parseISO(input.date);
      const records: TransactionRecord[] = [];
      for (let i = 0; i < count; i++) {
        const id = generateId();
        createdIds.push(id);
        records.push({
          id,
          userId,
          spaceId,
          amountCents: Math.round(input.amountCents),
          type: input.type,
          categoryId: input.categoryId,
          date: format(addMonths(baseDate, i), 'yyyy-MM-dd'),
          description: cleanDescription,
          paymentMethod: input.paymentMethod,
          recurrenceId,
          installment: null,
          origin: 'manual',
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }
      await db.transactions.bulkPut(records);
    } else if (!isMultiInstallment) {
      const id = generateId();
      createdIds.push(id);
      const record: TransactionRecord = {
        id,
        userId,
        spaceId,
        amountCents: Math.round(input.amountCents),
        type: input.type,
        categoryId: input.categoryId,
        date: input.date,
        description: cleanDescription,
        paymentMethod: input.paymentMethod,
        recurrenceId,
        installment: null,
        origin: 'manual',
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      await db.transactions.put(record);
    } else {
      // Calcula o plano completo de parcelamento (com ou sem entrada e com ou sem juros)
      const plan = calculateInstallmentPlan({
        baseAmountCents: input.amountCents,
        installmentsCount: installmentsTotal,
        hasDownPayment: input.hasDownPayment,
        downPaymentCents: input.downPaymentCents,
        hasInterest: input.hasInterest,
        interestMode: input.interestMode,
        totalWithInterestCents: input.totalWithInterestCents,
        customInstallmentCents: input.customInstallmentCents
      });

      const groupId = generateId();
      const baseDate = parseISO(input.date);
      const records: TransactionRecord[] = [];

      // 1. Se deu uma entrada à vista, registra a Entrada na data da compra
      if (plan.downPaymentCents > 0) {
        const downId = generateId();
        createdIds.push(downId);
        records.push({
          id: downId,
          userId,
          spaceId,
          amountCents: plan.downPaymentCents,
          type: input.type,
          categoryId: input.categoryId,
          date: input.date,
          description: cleanDescription ? `${cleanDescription} (Entrada)` : 'Entrada da compra',
          paymentMethod: 'pix',
          recurrenceId: null,
          installment: {
            current: 0,
            total: plan.installmentsCount,
            groupId,
            hasInterest: plan.hasInterest,
            originalTotalCents: plan.baseAmountCents,
            finalTotalCents: plan.finalTotalCents,
            downPaymentCents: plan.downPaymentCents
          },
          origin: 'manual',
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }

      // 2. Registra as N parcelas (se teve entrada, a 1ª parcela vence no mês seguinte; senão, começa no mês da compra)
      const monthOffsetStart = plan.downPaymentCents > 0 ? 1 : 0;
      for (let i = 0; i < plan.installmentsCount; i++) {
        const id = generateId();
        createdIds.push(id);
        const amountForThis = plan.installmentAmountsCents[i];
        const installmentDate = format(
          addMonths(baseDate, i + monthOffsetStart),
          'yyyy-MM-dd'
        );

        records.push({
          id,
          userId,
          spaceId,
          amountCents: amountForThis,
          type: input.type,
          categoryId: input.categoryId,
          date: installmentDate,
          description: cleanDescription,
          paymentMethod: input.paymentMethod,
          recurrenceId: null,
          installment: {
            current: i + 1,
            total: plan.installmentsCount,
            groupId,
            hasInterest: plan.hasInterest,
            originalTotalCents: plan.baseAmountCents,
            finalTotalCents: plan.finalTotalCents,
            downPaymentCents: plan.downPaymentCents
          },
          origin: 'manual',
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }

      await db.transactions.bulkPut(records);
    }
  });

  const undo = async () => {
    const undoTime = new Date().toISOString();
    await db.transaction('rw', [db.transactions, db.recurrences], async () => {
      for (const id of createdIds) {
        await db.transactions.update(id, {
          deletedAt: undoTime,
          updatedAt: undoTime
        });
      }
      if (recurrenceId) {
        await db.recurrences.update(recurrenceId, {
          deletedAt: undoTime,
          active: false,
          updatedAt: undoTime
        });
      }
    });
  };

  return { createdIds, recurrenceId, undo };
}

/**
 * Atualiza um lançamento existente e devolve função `undo()` para restaurar o estado anterior.
 */
export async function updateTransactionWithUndo(
  id: string,
  updates: Partial<
    Pick<
      TransactionRecord,
      'amountCents' | 'type' | 'categoryId' | 'date' | 'description' | 'paymentMethod'
    >
  >
): Promise<{ undo: () => Promise<void> }> {
  const previous = await db.transactions.get(id);
  if (!previous) {
    return { undo: async () => {} };
  }

  const now = new Date().toISOString();
  await db.transactions.update(id, {
    ...updates,
    updatedAt: now
  });

  return {
    undo: async () => {
      await db.transactions.put({
        ...previous,
        updatedAt: new Date().toISOString()
      });
    }
  };
}

/**
 * Apaga logicamente (deletedAt) um lançamento e devolve função `undo()` para restaurá-lo.
 */
export async function softDeleteTransactionWithUndo(
  id: string
): Promise<{ undo: () => Promise<void> }> {
  const previous = await db.transactions.get(id);
  if (!previous) {
    return { undo: async () => {} };
  }

  const now = new Date().toISOString();
  await db.transactions.update(id, {
    deletedAt: now,
    updatedAt: now
  });

  return {
    undo: async () => {
      await db.transactions.update(id, {
        deletedAt: null,
        updatedAt: new Date().toISOString()
      });
    }
  };
}
