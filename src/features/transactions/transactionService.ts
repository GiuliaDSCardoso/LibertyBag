import { addMonths, format, parseISO } from 'date-fns';
import {
  db,
  type BudgetRecord,
  type PaymentMethod,
  type RecurrenceRecord,
  type TransactionRecord,
  type TransactionType
} from '../../db/dexie';
import { DEFAULT_SPACE_ID, DEFAULT_USER_ID } from '../../db/seed';
import { formatCentsToBRL } from '../../lib/money';
import { getSupabaseClient } from '../../lib/supabase';
import { syncAllWithSupabase } from '../sync/syncService';

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
    Math.min(360, Math.floor(input.installmentsCount || 1))
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

// Janela deslizante de idempotência contra cliques repetidos / duplo envio rápido (4 segundos)
interface RecentSubmission {
  signature: string;
  result: CreateTransactionResult;
  timestamp: number;
}
const recentSubmissions: RecentSubmission[] = [];

function cleanOldSubmissions(): void {
  const now = Date.now();
  while (recentSubmissions.length > 0 && now - recentSubmissions[0].timestamp > 4000) {
    recentSubmissions.shift();
  }
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

  cleanOldSubmissions();
  const signature = `${spaceId}|${userId}|${input.amountCents}|${input.type}|${input.categoryId}|${input.date}|${cleanDescription}|${input.paymentMethod || ''}|${input.repeatMonthly ? 'rep' : 'no'}|${input.installmentsCount || 1}|${input.hasDownPayment ? input.downPaymentCents : 0}`;

  const existingMatch = recentSubmissions.find((s) => s.signature === signature);
  if (existingMatch && Date.now() - existingMatch.timestamp < 3500) {
    return existingMatch.result;
  }

  const installmentsTotal =
    input.installmentsCount && input.installmentsCount > 1
      ? Math.min(360, Math.floor(input.installmentsCount))
      : 1;

  const isMultiInstallment =
    installmentsTotal > 1 || (!!input.hasDownPayment && (input.downPaymentCents || 0) > 0);

  const createdIds: string[] = [];
  let recurrenceId: string | null = null;

  await db.transaction('rw', [db.transactions, db.recurrences], async () => {
    // Se ativou "repete em outros meses" (tanto para saída quanto para entrada),
    // gera um recurrenceId para vincular todos os lançamentos da série!
    if (input.repeatMonthly) {
      recurrenceId = generateId();
      if (input.type === 'saida') {
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
          type: 'saida',
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }
    }

    // Se ativou "repete em outros meses" (com quantidade específica ou padrão de 12 meses)
    if (input.repeatMonthly) {
      const count =
        input.repeatMonthsCount && input.repeatMonthsCount > 1
          ? Math.min(360, Math.floor(input.repeatMonthsCount))
          : 12;
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

  const finalResult: CreateTransactionResult = { createdIds, recurrenceId, undo };
  recentSubmissions.push({ signature, result: finalResult, timestamp: Date.now() });
  return finalResult;
}

export interface UpdateTransactionOptions {
  updateSeries?: boolean; // Se true, atualiza todos os lançamentos da repetição/série
}

/**
 * Atualiza um lançamento existente. Se fizer parte de uma repetição (`recurrenceId`),
 * propaga as alterações (inclusive dia da data) para todos os meses da série.
 * Devolve função `undo()` atômica para restaurar todos com 1 toque.
 */
export async function updateTransactionWithUndo(
  id: string,
  updates: Partial<
    Pick<
      TransactionRecord,
      'amountCents' | 'type' | 'categoryId' | 'date' | 'description' | 'paymentMethod'
    >
  >,
  options?: UpdateTransactionOptions
): Promise<{ undo: () => Promise<void>; updatedCount: number; isSeriesUpdate: boolean }> {
  const previous = await db.transactions.get(id);
  if (!previous) {
    return { undo: async () => {}, updatedCount: 0, isSeriesUpdate: false };
  }

  const now = new Date().toISOString();

  // Verifica se o item pertence a uma série repetida
  let siblings: TransactionRecord[] = [];
  if (previous.recurrenceId) {
    siblings = await db.transactions
      .where('spaceId')
      .equals(previous.spaceId)
      .and((t) => !t.deletedAt && t.recurrenceId === previous.recurrenceId)
      .toArray();
  } else if (previous.installment?.groupId) {
    siblings = await db.transactions
      .where('spaceId')
      .equals(previous.spaceId)
      .and((t) => !t.deletedAt && t.installment?.groupId === previous.installment?.groupId)
      .toArray();
  }

  const shouldUpdateSeries =
    options?.updateSeries !== false && siblings.length > 1;

  if (shouldUpdateSeries) {
    // Extrai o novo dia se a data foi modificada (ex.: 2026-11-15 -> dia 15)
    let newDayOfMonth: number | null = null;
    if (updates.date) {
      const parts = updates.date.split('-');
      if (parts.length === 3) {
        newDayOfMonth = Number(parts[2]);
      }
    }

    const updatedSiblings: TransactionRecord[] = siblings.map((sib) => {
      let targetDate = sib.date;
      if (sib.id === id && updates.date) {
        targetDate = updates.date;
      } else if (newDayOfMonth !== null) {
        // Alinha o dia no mês específico deste irmão respeitando a quantidade de dias do mês
        const [sibYearStr, sibMonthStr] = sib.date.split('-');
        const sibYear = Number(sibYearStr);
        const sibMonth = Number(sibMonthStr);
        const maxDaysInMonth = new Date(sibYear, sibMonth, 0).getDate();
        const adjustedDay = Math.min(newDayOfMonth, maxDaysInMonth);
        targetDate = `${sibYearStr}-${sibMonthStr}-${String(adjustedDay).padStart(2, '0')}`;
      }

      return {
        ...sib,
        amountCents:
          updates.amountCents !== undefined ? updates.amountCents : sib.amountCents,
        type: updates.type !== undefined ? updates.type : sib.type,
        categoryId:
          updates.categoryId !== undefined ? updates.categoryId : sib.categoryId,
        description:
          updates.description !== undefined ? updates.description : sib.description,
        paymentMethod:
          updates.paymentMethod !== undefined ? updates.paymentMethod : sib.paymentMethod,
        date: targetDate,
        updatedAt: now
      };
    });

    await db.transactions.bulkPut(updatedSiblings);

    // Se houver registro correspondente em db.recurrences, atualiza o modelo
    if (previous.recurrenceId) {
      const rec = await db.recurrences.get(previous.recurrenceId);
      if (rec) {
        await db.recurrences.update(previous.recurrenceId, {
          amountCents: updates.amountCents ?? rec.amountCents,
          categoryId: updates.categoryId ?? rec.categoryId,
          templateTitle: updates.description ?? rec.templateTitle,
          type: updates.type ?? rec.type,
          updatedAt: now
        });
      }
    }

    void syncAllWithSupabase();

    return {
      updatedCount: updatedSiblings.length,
      isSeriesUpdate: true,
      undo: async () => {
        const undoTime = new Date().toISOString();
        const restoredSiblings = siblings.map((s) => ({
          ...s,
          updatedAt: undoTime
        }));
        await db.transactions.bulkPut(restoredSiblings);
        void syncAllWithSupabase();
      }
    };
  }

  // Atualização individual (apenas este lançamento)
  await db.transactions.update(id, {
    ...updates,
    updatedAt: now
  });

  void syncAllWithSupabase();

  return {
    updatedCount: 1,
    isSeriesUpdate: false,
    undo: async () => {
      await db.transactions.put({
        ...previous,
        updatedAt: new Date().toISOString()
      });
      void syncAllWithSupabase();
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

/**
 * Apaga logicamente (deletedAt) múltiplos lançamentos selecionados de uma só vez
 * e devolve função `undo()` para restaurar todos com 1 toque.
 */
export async function bulkSoftDeleteTransactionsWithUndo(
  ids: string[]
): Promise<{ deletedCount: number; undo: () => Promise<void> }> {
  if (!ids || ids.length === 0) {
    return { deletedCount: 0, undo: async () => {} };
  }

  const now = new Date().toISOString();
  const rawList = await db.transactions.bulkGet(ids);
  const validRecords: TransactionRecord[] = [];
  for (const t of rawList) {
    if (t && !t.deletedAt) {
      validRecords.push(t);
    }
  }

  if (validRecords.length === 0) {
    return { deletedCount: 0, undo: async () => {} };
  }

  const softDeleted = validRecords.map((t) => ({
    ...t,
    deletedAt: now,
    updatedAt: now
  }));
  await db.transactions.bulkPut(softDeleted);
  void syncAllWithSupabase();

  return {
    deletedCount: validRecords.length,
    undo: async () => {
      const undoTime = new Date().toISOString();
      const restored = validRecords.map((t) => ({
        ...t,
        deletedAt: null,
        updatedAt: undoTime
      }));
      await db.transactions.bulkPut(restored);
      void syncAllWithSupabase();
    }
  };
}

export type DeleteSeriesScope = 'only_this' | 'this_and_future' | 'all';

export interface DeleteTransactionResult {
  deletedCount: number;
  isSeriesDelete: boolean;
  scope: DeleteSeriesScope;
  undo: () => Promise<void>;
}

/**
 * Apaga um lançamento com controle inteligente de escopo para repetições e parcelamentos:
 * - 'only_this': Apaga apenas o mês selecionado.
 * - 'this_and_future': Apaga deste mês em diante, mantendo o histórico dos meses passados.
 * - 'all': Apaga todos os meses da repetição/parcelamento.
 */
export async function deleteTransactionWithScope(
  id: string,
  scope: DeleteSeriesScope = 'only_this'
): Promise<DeleteTransactionResult> {
  const current = await db.transactions.get(id);
  if (!current) {
    return {
      deletedCount: 0,
      isSeriesDelete: false,
      scope,
      undo: async () => {}
    };
  }

  const now = new Date().toISOString();

  // Busca todos os lançamentos que pertencem à mesma série
  let siblings: TransactionRecord[] = [];
  if (current.recurrenceId) {
    siblings = await db.transactions
      .where('spaceId')
      .equals(current.spaceId)
      .and((t) => !t.deletedAt && t.recurrenceId === current.recurrenceId)
      .toArray();
  } else if (current.installment?.groupId) {
    siblings = await db.transactions
      .where('spaceId')
      .equals(current.spaceId)
      .and((t) => !t.deletedAt && t.installment?.groupId === current.installment?.groupId)
      .toArray();
  }

  // Se não é repetido ou há só 1 item, escopo é apenas este
  if (siblings.length <= 1) {
    await db.transactions.update(id, {
      deletedAt: now,
      updatedAt: now
    });
    void syncAllWithSupabase();

    return {
      deletedCount: 1,
      isSeriesDelete: false,
      scope: 'only_this',
      undo: async () => {
        await db.transactions.update(id, {
          deletedAt: null,
          updatedAt: new Date().toISOString()
        });
        void syncAllWithSupabase();
      }
    };
  }

  let toDelete: TransactionRecord[] = [];
  if (scope === 'only_this') {
    toDelete = [current];
  } else if (scope === 'this_and_future') {
    toDelete = siblings.filter((s) => s.date >= current.date);
  } else {
    // 'all'
    toDelete = siblings;
  }

  const deletedRecords = toDelete.map((t) => ({
    ...t,
    deletedAt: now,
    updatedAt: now
  }));

  let previousRecurrence: RecurrenceRecord | undefined;
  if (current.recurrenceId && (scope === 'all' || scope === 'this_and_future')) {
    previousRecurrence = await db.recurrences.get(current.recurrenceId);
  }

  await db.transaction('rw', [db.transactions, db.recurrences], async () => {
    await db.transactions.bulkPut(deletedRecords);

    if (current.recurrenceId && (scope === 'all' || scope === 'this_and_future')) {
      await db.recurrences.update(current.recurrenceId, {
        active: false,
        deletedAt: scope === 'all' ? now : null,
        updatedAt: now
      });
    }
  });

  void syncAllWithSupabase();

  return {
    deletedCount: toDelete.length,
    isSeriesDelete: true,
    scope,
    undo: async () => {
      const undoTime = new Date().toISOString();
      const restored = toDelete.map((t) => ({
        ...t,
        deletedAt: null,
        updatedAt: undoTime
      }));

      await db.transaction('rw', [db.transactions, db.recurrences], async () => {
        await db.transactions.bulkPut(restored);
        if (previousRecurrence) {
          await db.recurrences.put({
            ...previousRecurrence,
            updatedAt: undoTime
          });
        }
      });
      void syncAllWithSupabase();
    }
  };
}

export interface UpdateSeriesDurationResult {
  previousCount: number;
  newCount: number;
  addedCount: number;
  removedCount: number;
  undo: () => Promise<void>;
}

/**
 * Altera a quantidade de meses que um lançamento recorrente ou parcelado percorre.
 * Se aumentar a duração: cria novos meses mantendo o padrão da série.
 * Se encurtar a duração: apaga logicamente os meses excedentes mais futuros.
 */
export async function updateTransactionSeriesDurationWithUndo(
  id: string,
  newTotalMonths: number
): Promise<UpdateSeriesDurationResult> {
  const current = await db.transactions.get(id);
  if (!current) {
    return { previousCount: 0, newCount: 0, addedCount: 0, removedCount: 0, undo: async () => {} };
  }

  const targetMonths = Math.max(1, Math.min(360, Math.round(newTotalMonths)));
  const now = new Date().toISOString();

  let siblings: TransactionRecord[] = [];
  if (current.recurrenceId) {
    siblings = await db.transactions
      .where('spaceId')
      .equals(current.spaceId)
      .and((t) => !t.deletedAt && t.recurrenceId === current.recurrenceId)
      .toArray();
  } else if (current.installment?.groupId) {
    siblings = await db.transactions
      .where('spaceId')
      .equals(current.spaceId)
      .and((t) => !t.deletedAt && t.installment?.groupId === current.installment?.groupId)
      .toArray();
  } else {
    siblings = [current];
  }

  siblings.sort((a, b) => a.date.localeCompare(b.date));
  const previousCount = siblings.length;

  if (previousCount === targetMonths) {
    return { previousCount, newCount: targetMonths, addedCount: 0, removedCount: 0, undo: async () => {} };
  }

  if (targetMonths < previousCount) {
    const toKeep = siblings.slice(0, targetMonths);
    const toRemove = siblings.slice(targetMonths);
    const removedWithDeleted = toRemove.map((t) => ({
      ...t,
      deletedAt: now,
      updatedAt: now
    }));

    const updatedKeep = toKeep.map((t) => {
      if (t.installment) {
        return {
          ...t,
          installment: {
            ...t.installment,
            total: targetMonths
          },
          updatedAt: now
        };
      }
      return t;
    });

    await db.transactions.bulkPut([...removedWithDeleted, ...updatedKeep]);
    void syncAllWithSupabase();

    return {
      previousCount,
      newCount: targetMonths,
      addedCount: 0,
      removedCount: toRemove.length,
      undo: async () => {
        const undoTime = new Date().toISOString();
        const restored = siblings.map((s) => ({
          ...s,
          deletedAt: null,
          updatedAt: undoTime
        }));
        await db.transactions.bulkPut(restored);
        void syncAllWithSupabase();
      }
    };
  }

  // targetMonths > previousCount: Adiciona meses futuros
  const addedCount = targetMonths - previousCount;
  const lastSibling = siblings[siblings.length - 1];
  const firstSibling = siblings[0];

  const [, , firstDayStr] = firstSibling.date.split('-');
  const desiredDay = Number(firstDayStr);

  const seriesRecurrenceId = current.recurrenceId || generateId();
  const seriesGroupId = current.installment?.groupId || (current.installment ? generateId() : undefined);

  const updatedFirstIfNeeded: TransactionRecord[] = [];
  if (!current.recurrenceId && !current.installment) {
    updatedFirstIfNeeded.push({
      ...current,
      recurrenceId: seriesRecurrenceId,
      updatedAt: now
    });
  }

  const newRecords: TransactionRecord[] = [];
  const baseDateForAddition = parseISO(lastSibling.date);

  for (let i = 1; i <= addedCount; i++) {
    const nextMonthObj = addMonths(baseDateForAddition, i);
    const y = nextMonthObj.getFullYear();
    const m = nextMonthObj.getMonth() + 1;
    const maxDays = new Date(y, m, 0).getDate();
    const actualDay = Math.min(desiredDay, maxDays);
    const newDateStr = `${y}-${String(m).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;

    const newId = generateId();
    newRecords.push({
      id: newId,
      userId: current.userId,
      spaceId: current.spaceId,
      amountCents: current.amountCents,
      type: current.type,
      categoryId: current.categoryId,
      date: newDateStr,
      description: current.description,
      paymentMethod: current.paymentMethod,
      recurrenceId: seriesRecurrenceId,
      installment: current.installment
        ? {
            ...current.installment,
            current: previousCount + i,
            total: targetMonths,
            groupId: seriesGroupId || current.installment.groupId
          }
        : null,
      origin: 'manual',
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
  }

  let updatedExisting = [...siblings];
  if (current.installment) {
    updatedExisting = siblings.map((s) => ({
      ...s,
      installment: {
        ...s.installment!,
        total: targetMonths
      },
      updatedAt: now
    }));
  }

  await db.transactions.bulkPut([...updatedFirstIfNeeded, ...updatedExisting, ...newRecords]);
  void syncAllWithSupabase();

  return {
    previousCount,
    newCount: targetMonths,
    addedCount,
    removedCount: 0,
    undo: async () => {
      const undoTime = new Date().toISOString();
      const softDeleteAdded = newRecords.map((r) => ({
        ...r,
        deletedAt: undoTime,
        updatedAt: undoTime
      }));
      const restoredSiblings = siblings.map((s) => ({
        ...s,
        updatedAt: undoTime
      }));
      await db.transactions.bulkPut([...softDeleteAdded, ...restoredSiblings]);
      void syncAllWithSupabase();
    }
  };
}

export interface DeduplicateResult {
  duplicatesRemoved: number;
  remainingCount: number;
  undo: () => Promise<void>;
}

/**
 * Localiza e remove com segurança lançamentos idênticos duplicados no espaço,
 * mantendo o primeiro registro original intacto.
 */
export async function deduplicateTransactions(spaceId?: string): Promise<DeduplicateResult> {
  let query = db.transactions.toCollection();
  if (spaceId) {
    query = db.transactions.where('spaceId').equals(spaceId);
  }

  const allActive = await query.and((t) => !t.deletedAt).toArray();
  if (allActive.length <= 1) {
    return { duplicatesRemoved: 0, remainingCount: allActive.length, undo: async () => {} };
  }

  const fingerprintMap = new Map<string, TransactionRecord[]>();

  for (const tx of allActive) {
    const cleanDesc = (tx.description || '').trim().toLowerCase();
    const instPart = tx.installment ? `${tx.installment.current}/${tx.installment.total}` : 'no-inst';
    const recPart = tx.recurrenceId ? 'rec' : 'no-rec';
    const key = `${tx.spaceId}|${tx.date}|${tx.amountCents}|${tx.type}|${tx.categoryId}|${cleanDesc}|${tx.paymentMethod || 'none'}|${instPart}|${recPart}`;

    const existing = fingerprintMap.get(key);
    if (existing) {
      existing.push(tx);
    } else {
      fingerprintMap.set(key, [tx]);
    }
  }

  const duplicatesToDelete: TransactionRecord[] = [];

  for (const group of fingerprintMap.values()) {
    if (group.length > 1) {
      group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (let i = 1; i < group.length; i++) {
        duplicatesToDelete.push(group[i]);
      }
    }
  }

  if (duplicatesToDelete.length === 0) {
    return { duplicatesRemoved: 0, remainingCount: allActive.length, undo: async () => {} };
  }

  const now = new Date().toISOString();
  const softDeleted = duplicatesToDelete.map((t) => ({
    ...t,
    deletedAt: now,
    updatedAt: now
  }));

  await db.transactions.bulkPut(softDeleted);

  const supabase = getSupabaseClient();
  if (supabase) {
    const dupIds = duplicatesToDelete.map((t) => t.id);
    void supabase.from('transactions').delete().in('id', dupIds);
  }

  return {
    duplicatesRemoved: duplicatesToDelete.length,
    remainingCount: allActive.length - duplicatesToDelete.length,
    undo: async () => {
      const undoTime = new Date().toISOString();
      const restored = duplicatesToDelete.map((t) => ({
        ...t,
        deletedAt: null,
        updatedAt: undoTime
      }));
      await db.transactions.bulkPut(restored);
      void syncAllWithSupabase();
    }
  };
}

export interface ResetAllMonthsOptions {
  includeBudgets?: boolean;
}

export interface ResetAllMonthsResult {
  transactionsCount: number;
  budgetsCount: number;
  distinctMonthsCount: number;
  undo: () => Promise<void>;
}

/**
 * Reseta todos os lançamentos ativos de todos os meses de forma segura com Soft Delete.
 * Oferece reversão instantânea (Undo) restaurando exatamente o estado anterior.
 */
export async function resetAllMonthsTransactions(
  spaceId?: string,
  options?: ResetAllMonthsOptions
): Promise<ResetAllMonthsResult> {
  let txQuery = db.transactions.toCollection();
  if (spaceId) {
    txQuery = db.transactions.where('spaceId').equals(spaceId);
  }

  const allActiveTxs = await txQuery.and((t) => !t.deletedAt).toArray();
  const distinctMonths = new Set(allActiveTxs.map((t) => t.date.slice(0, 7)));
  const now = new Date().toISOString();

  if (allActiveTxs.length > 0) {
    const softDeletedTxs = allActiveTxs.map((t) => ({
      ...t,
      deletedAt: now,
      updatedAt: now
    }));
    await db.transactions.bulkPut(softDeletedTxs);
  }

  let activeBudgets: BudgetRecord[] = [];
  if (options?.includeBudgets) {
    let bQuery = db.budgets.toCollection();
    if (spaceId) {
      bQuery = db.budgets.where('spaceId').equals(spaceId);
    }
    activeBudgets = await bQuery.and((b) => !b.deletedAt).toArray();
    if (activeBudgets.length > 0) {
      const softDeletedBudgets = activeBudgets.map((b) => ({
        ...b,
        deletedAt: now,
        updatedAt: now
      }));
      await db.budgets.bulkPut(softDeletedBudgets);
    }
  }

  // Sincroniza exclusões com Supabase se houver conexão
  const supabase = getSupabaseClient();
  if (supabase) {
    if (allActiveTxs.length > 0) {
      const txIds = allActiveTxs.map((t) => t.id);
      void supabase.from('transactions').delete().in('id', txIds);
    }
    if (activeBudgets.length > 0) {
      const bIds = activeBudgets.map((b) => b.id);
      void supabase.from('budgets').delete().in('id', bIds);
    }
  }

  return {
    transactionsCount: allActiveTxs.length,
    budgetsCount: activeBudgets.length,
    distinctMonthsCount: distinctMonths.size,
    undo: async () => {
      const undoTime = new Date().toISOString();
      if (allActiveTxs.length > 0) {
        const restoredTxs = allActiveTxs.map((t) => ({
          ...t,
          deletedAt: null,
          updatedAt: undoTime
        }));
        await db.transactions.bulkPut(restoredTxs);
      }

      if (activeBudgets.length > 0) {
        const restoredBudgets = activeBudgets.map((b) => ({
          ...b,
          deletedAt: null,
          updatedAt: undoTime
        }));
        await db.budgets.bulkPut(restoredBudgets);
      }
      void syncAllWithSupabase();
    }
  };
}
