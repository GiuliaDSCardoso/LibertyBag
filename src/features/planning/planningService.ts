import { addMonths, differenceInCalendarMonths, format, parseISO } from 'date-fns';
import {
  db,
  type BudgetRecord,
  type RecurrenceRecord,
  type SavingsGoalRecord,
  type TripItemRecord,
  type TripRecord
} from '../../db/dexie';
import { DEFAULT_SPACE_ID, DEFAULT_USER_ID } from '../../db/seed';
import { formatCentsToBRL } from '../../lib/money';

function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// 1. QUANTO POSSO GASTAR (ORÇAMENTOS POR MÊS E CATEGORIA)
// ============================================================================

export interface SaveBudgetInput {
  userId?: string;
  spaceId?: string;
  month: string; // YYYY-MM
  categoryId: string | null; // null = total do mês
  plannedCents: number;
}

export async function saveBudgetWithUndo(
  input: SaveBudgetInput
): Promise<{ budget: BudgetRecord; undo: () => Promise<void> }> {
  const userId = input.userId || DEFAULT_USER_ID;
  const spaceId = input.spaceId || DEFAULT_SPACE_ID;
  const now = new Date().toISOString();

  const existingList = await db.budgets
    .where('spaceId')
    .equals(spaceId)
    .and(
      (b) =>
        !b.deletedAt &&
        b.month === input.month &&
        b.categoryId === input.categoryId
    )
    .toArray();

  const existing = existingList[0] || null;
  const id = existing?.id || generateId('budget');

  const record: BudgetRecord = {
    id,
    userId,
    spaceId,
    month: input.month,
    categoryId: input.categoryId,
    plannedCents: Math.round(input.plannedCents),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: null
  };

  await db.budgets.put(record);

  return {
    budget: record,
    undo: async () => {
      const undoTime = new Date().toISOString();
      if (existing) {
        await db.budgets.put({ ...existing, updatedAt: undoTime });
      } else {
        await db.budgets.update(id, { deletedAt: undoTime, updatedAt: undoTime });
      }
    }
  };
}

/**
 * Copia todos os valores planejados do mês passado para o mês atual
 * (com opção de desfazer em 1 toque).
 */
export async function copyPreviousMonthBudgetsWithUndo(
  targetMonth: string,
  spaceId: string = DEFAULT_SPACE_ID,
  userId: string = DEFAULT_USER_ID
): Promise<{ copiedCount: number; undo: () => Promise<void> }> {
  const refDate = parseISO(`${targetMonth}-01`);
  const prevMonth = format(addMonths(refDate, -1), 'yyyy-MM');

  const prevBudgets = await db.budgets
    .where('spaceId')
    .equals(spaceId)
    .and((b) => !b.deletedAt && b.month === prevMonth)
    .toArray();

  if (prevBudgets.length === 0) {
    return { copiedCount: 0, undo: async () => {} };
  }

  const now = new Date().toISOString();
  const createdIds: string[] = [];

  await db.transaction('rw', db.budgets, async () => {
    for (const prev of prevBudgets) {
      const id = generateId('budget');
      createdIds.push(id);
      await db.budgets.put({
        id,
        userId,
        spaceId,
        month: targetMonth,
        categoryId: prev.categoryId,
        plannedCents: prev.plannedCents,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });
    }
  });

  return {
    copiedCount: createdIds.length,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.transaction('rw', db.budgets, async () => {
        for (const id of createdIds) {
          await db.budgets.update(id, { deletedAt: undoTime, updatedAt: undoTime });
        }
      });
    }
  };
}

// ============================================================================
// 2. COFRINHOS (SAVINGS GOALS + MOVEMENTS + CÁLCULO MENSAL)
// ============================================================================

export interface MonthlyGoalCalculation {
  remainingCents: number;
  monthsLeft: number;
  recommendedMonthlyCents: number;
  helperText: string;
  isCompleted: boolean;
}

/**
 * Calcula quanto falta e gera a frase simples:
 * "Para chegar lá, guarde R$ X por mês"
 */
export function calculateGoalMonthlyRecommendation(
  targetCents: number,
  savedCents: number,
  deadlineISO: string | null,
  now: Date = new Date()
): MonthlyGoalCalculation {
  const remainingCents = Math.max(0, Math.round(targetCents) - Math.round(savedCents));
  const isCompleted = remainingCents === 0 && targetCents > 0;

  if (isCompleted) {
    return {
      remainingCents: 0,
      monthsLeft: 0,
      recommendedMonthlyCents: 0,
      helperText: 'Parabéns! Você já completou este cofrinho!',
      isCompleted: true
    };
  }

  if (!deadlineISO) {
    return {
      remainingCents,
      monthsLeft: 1,
      recommendedMonthlyCents: remainingCents,
      helperText: `Faltam ${formatCentsToBRL(remainingCents)} para completar sua meta.`,
      isCompleted: false
    };
  }

  const deadlineDate = parseISO(deadlineISO.length === 7 ? `${deadlineISO}-01` : deadlineISO);
  const rawMonths = differenceInCalendarMonths(deadlineDate, now);
  const monthsLeft = Math.max(1, rawMonths);
  const recommendedMonthlyCents = Math.ceil(remainingCents / monthsLeft);

  return {
    remainingCents,
    monthsLeft,
    recommendedMonthlyCents,
    helperText: `Para chegar lá, guarde ${formatCentsToBRL(recommendedMonthlyCents)} por mês (${monthsLeft} ${
      monthsLeft === 1 ? 'mês restante' : 'meses restantes'
    }).`,
    isCompleted: false
  };
}

export async function createSavingsGoalWithUndo(input: {
  userId?: string;
  spaceId?: string;
  name: string;
  targetCents: number;
  deadline: string | null;
  initialSavedCents?: number;
}): Promise<{ goal: SavingsGoalRecord; undo: () => Promise<void> }> {
  const now = new Date().toISOString();
  const id = generateId('goal');
  const goal: SavingsGoalRecord = {
    id,
    userId: input.userId || DEFAULT_USER_ID,
    spaceId: input.spaceId || DEFAULT_SPACE_ID,
    name: input.name.trim(),
    targetCents: Math.round(input.targetCents),
    deadline: input.deadline,
    savedCents: Math.round(input.initialSavedCents || 0),
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  await db.savings_goals.put(goal);

  return {
    goal,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.savings_goals.update(id, { deletedAt: undoTime, updatedAt: undoTime });
    }
  };
}

/**
 * Guardar (amountDeltaCents > 0) ou Retirar (amountDeltaCents < 0) de um Cofrinho
 * com opção de desfazer.
 */
export async function moveGoalMoneyWithUndo(
  goalId: string,
  amountDeltaCents: number,
  note?: string
): Promise<{ updatedSavedCents: number; completedNow: boolean; undo: () => Promise<void> }> {
  const goal = await db.savings_goals.get(goalId);
  if (!goal) {
    throw new Error('Cofrinho não encontrado.');
  }

  const now = new Date().toISOString();
  const prevSavedCents = goal.savedCents;
  const nextSavedCents = Math.max(0, prevSavedCents + Math.round(amountDeltaCents));
  const movementId = generateId('gmov');

  await db.transaction('rw', [db.savings_goals, db.goal_movements], async () => {
    await db.savings_goals.update(goalId, {
      savedCents: nextSavedCents,
      updatedAt: now
    });

    await db.goal_movements.put({
      id: movementId,
      goalId,
      userId: goal.userId,
      spaceId: goal.spaceId,
      amountCents: Math.round(amountDeltaCents),
      date: now.slice(0, 10),
      note: note?.trim(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
  });

  const completedNow = prevSavedCents < goal.targetCents && nextSavedCents >= goal.targetCents;

  return {
    updatedSavedCents: nextSavedCents,
    completedNow,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.transaction('rw', [db.savings_goals, db.goal_movements], async () => {
        await db.savings_goals.update(goalId, {
          savedCents: prevSavedCents,
          updatedAt: undoTime
        });
        await db.goal_movements.update(movementId, {
          deletedAt: undoTime,
          updatedAt: undoTime
        });
      });
    }
  };
}

export async function deleteGoalWithUndo(
  goalId: string
): Promise<{ undo: () => Promise<void> }> {
  const now = new Date().toISOString();
  await db.savings_goals.update(goalId, { deletedAt: now, updatedAt: now });
  return {
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.savings_goals.update(goalId, { deletedAt: null, updatedAt: undoTime });
    }
  };
}

// ============================================================================
// 3. VIAGENS (TRIPS + 5 PARTES DE ORÇAMENTO)
// ============================================================================

export const TRIP_PARTS: {
  part: TripItemRecord['part'];
  label: string;
}[] = [
  { part: 'passagem', label: 'Passagem / Transporte' },
  { part: 'hospedagem', label: 'Hospedagem' },
  { part: 'comida', label: 'Comida' },
  { part: 'passeios', label: 'Passeios' },
  { part: 'extras', label: 'Extras e Lembrancinhas' }
];

export async function createTripWithUndo(input: {
  userId?: string;
  spaceId?: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  goalId?: string | null;
  partsPlanned: Record<TripItemRecord['part'], number>;
}): Promise<{ trip: TripRecord; undo: () => Promise<void> }> {
  const now = new Date().toISOString();
  const spaceId = input.spaceId || DEFAULT_SPACE_ID;
  const userId = input.userId || DEFAULT_USER_ID;
  const tripId = generateId('trip');
  const itemIds: string[] = [];

  const trip: TripRecord = {
    id: tripId,
    userId,
    spaceId,
    name: input.name.trim(),
    destination: input.destination.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    goalId: input.goalId || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  await db.transaction('rw', [db.trips, db.trip_items], async () => {
    await db.trips.put(trip);

    for (const { part } of TRIP_PARTS) {
      const itemId = generateId('titem');
      itemIds.push(itemId);
      await db.trip_items.put({
        id: itemId,
        tripId,
        spaceId,
        part,
        plannedCents: Math.round(input.partsPlanned[part] || 0),
        spentCents: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });
    }
  });

  return {
    trip,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.transaction('rw', [db.trips, db.trip_items], async () => {
        await db.trips.update(tripId, { deletedAt: undoTime, updatedAt: undoTime });
        for (const itemId of itemIds) {
          await db.trip_items.update(itemId, { deletedAt: undoTime, updatedAt: undoTime });
        }
      });
    }
  };
}

export async function updateTripItemWithUndo(
  itemId: string,
  updates: { plannedCents?: number; spentCents?: number }
): Promise<{ undo: () => Promise<void> }> {
  const existing = await db.trip_items.get(itemId);
  if (!existing) return { undo: async () => {} };

  const now = new Date().toISOString();
  await db.trip_items.update(itemId, {
    plannedCents:
      updates.plannedCents !== undefined
        ? Math.round(updates.plannedCents)
        : existing.plannedCents,
    spentCents:
      updates.spentCents !== undefined
        ? Math.round(updates.spentCents)
        : existing.spentCents,
    updatedAt: now
  });

  return {
    undo: async () => {
      await db.trip_items.put({ ...existing, updatedAt: new Date().toISOString() });
    }
  };
}

// ============================================================================
// 4. CONTAS A PAGAR (RECORRÊNCIAS COM MARCAÇÃO "PAGUEI")
// ============================================================================

export async function createRecurringBillWithUndo(input: {
  userId?: string;
  spaceId?: string;
  title: string;
  description?: string;
  amountCents: number;
  categoryId: string;
  nextDate: string; // YYYY-MM-DD
  totalMonths?: number | null;
  paidCount?: number;
}): Promise<{ recurrence: RecurrenceRecord; undo: () => Promise<void> }> {
  const now = new Date().toISOString();
  const id = generateId('rec');

  const recurrence: RecurrenceRecord = {
    id,
    userId: input.userId || DEFAULT_USER_ID,
    spaceId: input.spaceId || DEFAULT_SPACE_ID,
    rule: 'mensal',
    nextDate: input.nextDate,
    active: true,
    templateTitle: input.title.trim(),
    description: input.description?.trim() || undefined,
    amountCents: Math.round(input.amountCents),
    categoryId: input.categoryId,
    type: 'saida',
    totalMonths: input.totalMonths && input.totalMonths > 0 ? Math.floor(input.totalMonths) : null,
    paidCount: input.paidCount && input.paidCount > 0 ? Math.floor(input.paidCount) : 0,
    lastPaidDate: null,
    lastPaidMonth: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  await db.recurrences.put(recurrence);

  return {
    recurrence,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.recurrences.update(id, { deletedAt: undoTime, updatedAt: undoTime });
    }
  };
}

export async function deleteRecurringBillWithUndo(
  recurrenceId: string
): Promise<{ undo: () => Promise<void> }> {
  const now = new Date().toISOString();
  await db.recurrences.update(recurrenceId, { deletedAt: now, updatedAt: now });

  return {
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.recurrences.update(recurrenceId, { deletedAt: null, updatedAt: undoTime });
    }
  };
}

/**
 * Marca uma conta recorrente como "Paguei!":
 * - Cria o lançamento real do mês com descritivo "Esse mês pago" (e indicador de parcelas se houver)
 * - Registra o status de pago no mês
 * - Avança a `nextDate` da conta para o próximo mês
 * - Permite desfazer tudo com 1 toque
 */
export async function markRecurringBillPaidWithUndo(
  recurrenceId: string
): Promise<{ transactionId: string; nextDate: string; undo: () => Promise<void> }> {
  const rec = await db.recurrences.get(recurrenceId);
  if (!rec) {
    throw new Error('Conta não encontrada.');
  }

  const now = new Date().toISOString();
  const prevNextDate = rec.nextDate;
  const prevPaidCount = rec.paidCount || 0;
  const prevLastPaidDate = rec.lastPaidDate || null;
  const prevLastPaidMonth = rec.lastPaidMonth || null;
  const nextPaidCount = prevPaidCount + 1;
  const nextMonthDate = format(addMonths(parseISO(rec.nextDate), 1), 'yyyy-MM-dd');

  // Descritivo claro no lançamento: "Nome da Conta - Esse mês pago" (ou com parcelas X/Y)
  const installmentTag = rec.totalMonths ? ` (${nextPaidCount}/${rec.totalMonths})` : '';
  const txDescription = `${rec.templateTitle} - Esse mês pago${installmentTag}`;

  let wasNewlyCreated = false;
  let finalTxId = '';

  await db.transaction('rw', [db.recurrences, db.transactions], async () => {
    // Evita duplicidade se a série já havia gerado um lançamento para esta data
    const existingTx = await db.transactions
      .where('spaceId')
      .equals(rec.spaceId)
      .and((t) => !t.deletedAt && t.recurrenceId === rec.id && t.date === prevNextDate)
      .first();

    if (existingTx) {
      finalTxId = existingTx.id;
      wasNewlyCreated = false;
      await db.transactions.update(finalTxId, {
        description: txDescription,
        updatedAt: now
      });
    } else {
      finalTxId = generateId('tx');
      wasNewlyCreated = true;
      await db.transactions.put({
        id: finalTxId,
        userId: rec.userId,
        spaceId: rec.spaceId,
        amountCents: rec.amountCents,
        type: rec.type,
        categoryId: rec.categoryId,
        date: prevNextDate,
        description: txDescription,
        paymentMethod: 'pix',
        recurrenceId: rec.id,
        installment: rec.totalMonths
          ? {
              current: nextPaidCount,
              total: rec.totalMonths,
              groupId: rec.id
            }
          : null,
        origin: 'manual',
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });
    }

    await db.recurrences.update(recurrenceId, {
      nextDate: nextMonthDate,
      paidCount: nextPaidCount,
      lastPaidDate: prevNextDate,
      lastPaidMonth: prevNextDate.slice(0, 7),
      updatedAt: now
    });
  });

  return {
    transactionId: finalTxId,
    nextDate: nextMonthDate,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.transaction('rw', [db.recurrences, db.transactions], async () => {
        if (wasNewlyCreated) {
          await db.transactions.update(finalTxId, {
            deletedAt: undoTime,
            updatedAt: undoTime
          });
        }
        await db.recurrences.update(recurrenceId, {
          nextDate: prevNextDate,
          paidCount: prevPaidCount,
          lastPaidDate: prevLastPaidDate,
          lastPaidMonth: prevLastPaidMonth,
          updatedAt: undoTime
        });
      });
    }
  };
}
