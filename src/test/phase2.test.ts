import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/dexie';
import { DEFAULT_SPACE_ID, ensureInitialDataSeeded } from '../db/seed';
import {
  calculateGoalMonthlyRecommendation,
  copyPreviousMonthBudgetsWithUndo,
  createRecurringBillWithUndo,
  createSavingsGoalWithUndo,
  createTripWithUndo,
  deleteRecurringBillWithUndo,
  markRecurringBillPaidWithUndo,
  moveGoalMoneyWithUndo,
  saveBudgetWithUndo,
  updateTripItemWithUndo
} from '../features/planning/planningService';
import {
  buildCategoryBreakdown,
  generateFriendlyAnalyticsSuggestions
} from '../features/analytics/analyticsService';
import { generateTransactionsCSV } from '../features/settings/exportService';
import { createTransactionWithUndo } from '../features/transactions/transactionService';

describe('LibertyBag — Regras de Negócio da Fase 2 (Planejamento, Análises e Exportação)', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.savings_goals.clear();
    await db.goal_movements.clear();
    await db.trips.clear();
    await db.trip_items.clear();
    await db.recurrences.clear();
    await db.categories.clear();
    await db.spaces.clear();
    await db.users.clear();
    await ensureInitialDataSeeded();
  });

  it('calcula quanto guardar por mês em um Cofrinho até o prazo (em linguagem simples)', () => {
    const rec = calculateGoalMonthlyRecommendation(
      120000, // R$ 1.200,00
      20000, // R$ 200,00 já guardados (faltam R$ 1.000,00)
      '2027-03-15',
      new Date('2026-11-04T12:00:00Z') // 4 meses de diferença (Nov -> Mar)
    );

    expect(rec.isCompleted).toBe(false);
    expect(rec.remainingCents).toBe(100000);
    expect(rec.monthsLeft).toBe(4);
    expect(rec.recommendedMonthlyCents).toBe(25000); // R$ 250,00 por mês
    expect(rec.helperText).toContain('Para chegar lá, guarde R$');
    expect(rec.helperText).toContain('250,00 por mês');
  });

  it('permite criar Cofrinho, guardar dinheiro, detectar conclusão de 100% e desfazer', async () => {
    const { goal } = await createSavingsGoalWithUndo({
      name: 'Reserva da Mamãe',
      targetCents: 50000,
      deadline: '2027-06-01'
    });

    const move1 = await moveGoalMoneyWithUndo(goal.id, 30000, 'Primeira parte');
    expect(move1.updatedSavedCents).toBe(30000);
    expect(move1.completedNow).toBe(false);

    const move2 = await moveGoalMoneyWithUndo(goal.id, 20000, 'Completando meta');
    expect(move2.updatedSavedCents).toBe(50000);
    expect(move2.completedNow).toBe(true);

    // Desfazer último depósito volta para R$ 300,00
    await move2.undo();
    const afterUndo = await db.savings_goals.get(goal.id);
    expect(afterUndo?.savedCents).toBe(30000);
  });

  it('salva Quanto posso gastar (orçamento) no mês e copia do mês passado com Desfazer', async () => {
    await saveBudgetWithUndo({
      month: '2026-10',
      categoryId: null,
      plannedCents: 300000
    });
    await saveBudgetWithUndo({
      month: '2026-10',
      categoryId: 'cat-mercado',
      plannedCents: 90000
    });

    const copyRes = await copyPreviousMonthBudgetsWithUndo('2026-11');
    expect(copyRes.copiedCount).toBe(2);

    const novBudgets = await db.budgets
      .where('spaceId')
      .equals(DEFAULT_SPACE_ID)
      .and((b) => !b.deletedAt && b.month === '2026-11')
      .toArray();
    expect(novBudgets).toHaveLength(2);

    await copyRes.undo();
    const afterUndo = await db.budgets
      .where('spaceId')
      .equals(DEFAULT_SPACE_ID)
      .and((b) => !b.deletedAt && b.month === '2026-11')
      .toArray();
    expect(afterUndo).toHaveLength(0);
  });

  it('cria Viagem com as 5 partes padrão (passagem, hospedagem, comida, passeios, extras) e atualiza valores', async () => {
    const { trip } = await createTripWithUndo({
      name: 'Férias de Verão',
      destination: 'Maceió em Família',
      startDate: '2027-01-10',
      endDate: '2027-01-17',
      partsPlanned: {
        passagem: 150000,
        hospedagem: 180000,
        comida: 80000,
        passeios: 40000,
        extras: 20000
      }
    });

    expect(trip.destination).toBe('Maceió em Família');

    const items = await db.trip_items.where('tripId').equals(trip.id).toArray();
    expect(items).toHaveLength(5);

    const passagemItem = items.find((i) => i.part === 'passagem')!;
    await updateTripItemWithUndo(passagemItem.id, {
      spentCents: 145000
    });

    const updatedItem = await db.trip_items.get(passagemItem.id);
    expect(updatedItem?.spentCents).toBe(145000);
  });

  it('marca Conta a pagar como "Paguei!", gera o lançamento de saída e avança a data para o próximo mês', async () => {
    const { recurrence } = await createRecurringBillWithUndo({
      title: 'Conta de Luz',
      amountCents: 18500,
      categoryId: 'cat-contas',
      nextDate: '2026-11-10'
    });

    const paid = await markRecurringBillPaidWithUndo(recurrence.id);
    expect(paid.nextDate).toBe('2026-12-10');

    const txInDb = await db.transactions.get(paid.transactionId);
    expect(txInDb?.amountCents).toBe(18500);
    expect(txInDb?.type).toBe('saida');
    expect(txInDb?.description).toContain('Esse mês pago');

    // Desfazer o pagamento restaura a data anterior e remove o lançamento
    await paid.undo();
    const recAfterUndo = await db.recurrences.get(recurrence.id);
    expect(recAfterUndo?.nextDate).toBe('2026-11-10');
  });

  it('gerencia contas a pagar com descrição, parcelas restantes, repetição e botão de apagar', async () => {
    const { recurrence } = await createRecurringBillWithUndo({
      title: 'Seguro do Carro',
      description: 'Parcelamento em 10x no débito automático',
      amountCents: 25000,
      categoryId: 'cat-contas',
      nextDate: '2026-11-15',
      totalMonths: 10,
      paidCount: 3
    });

    expect(recurrence.description).toBe('Parcelamento em 10x no débito automático');
    expect(recurrence.totalMonths).toBe(10);
    expect(recurrence.paidCount).toBe(3);

    // Marca como paga (4ª parcela)
    const paid = await markRecurringBillPaidWithUndo(recurrence.id);
    const recUpdated = await db.recurrences.get(recurrence.id);
    expect(recUpdated?.paidCount).toBe(4);
    expect(recUpdated?.lastPaidMonth).toBe('2026-11');

    const txInDb = await db.transactions.get(paid.transactionId);
    expect(txInDb?.description).toBe('Seguro do Carro - Esse mês pago (4/10)');
    expect(txInDb?.installment?.current).toBe(4);
    expect(txInDb?.installment?.total).toBe(10);

    // Apaga a conta mensal com undo
    const { undo: undoDelete } = await deleteRecurringBillWithUndo(recurrence.id);
    const recDeleted = await db.recurrences.get(recurrence.id);
    expect(recDeleted?.deletedAt).toBeTruthy();

    await undoDelete();
    const recRestored = await db.recurrences.get(recurrence.id);
    expect(recRestored?.deletedAt).toBeNull();
  });

  it('gera Análises por categoria, comparação com mês passado e explicação "Por que estou vendo isso?"', async () => {
    const categories = await db.categories.toArray();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // Mês passado (Outubro): R$ 400 em Comida fora
    const prevRes = await createTransactionWithUndo({
      type: 'saida',
      amountCents: 40000,
      date: '2026-10-15',
      categoryId: 'cat-comida-fora'
    });
    const prevTx = (await db.transactions.get(prevRes.createdIds[0]))!;

    // Mês atual (Novembro): R$ 250 em Comida fora (economizou R$ 150) + R$ 1.000 de entrada
    const currRes1 = await createTransactionWithUndo({
      type: 'saida',
      amountCents: 25000,
      date: '2026-11-12',
      categoryId: 'cat-comida-fora'
    });
    const currTx1 = (await db.transactions.get(currRes1.createdIds[0]))!;

    const currIncomeRes = await createTransactionWithUndo({
      type: 'entrada',
      amountCents: 100000,
      date: '2026-11-05',
      categoryId: 'cat-salario'
    });
    const currIncome = (await db.transactions.get(currIncomeRes.createdIds[0]))!;

    const breakdown = buildCategoryBreakdown([currTx1, currIncome], catMap);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].categoryId).toBe('cat-comida-fora');
    expect(breakdown[0].percentage).toBe(100);

    const suggestions = generateFriendlyAnalyticsSuggestions(
      [currTx1, currIncome],
      [prevTx],
      catMap
    );
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(
      suggestions.some(
        (s) =>
          s.message.includes('R$\u00a0150,00 a menos') ||
          s.message.includes('150,00 a menos')
      )
    ).toBe(true);
    expect(suggestions.every((s) => s.whyExplanation.length > 10)).toBe(true);
  });

  it('exporta lançamentos em formato CSV separado por ponto e vírgula', async () => {
    await createTransactionWithUndo({
      type: 'saida',
      amountCents: 4990,
      date: '2026-11-04',
      categoryId: 'cat-mercado',
      description: 'Pão e leite'
    });

    const csv = await generateTransactionsCSV(DEFAULT_SPACE_ID);
    expect(csv).toContain('Data;Tipo;Categoria;Valor (R$);Observação;Forma de Pagamento');
    expect(csv).toContain('2026-11-04;Dinheiro que saiu;Mercado;49,90;Pão e leite;pix');
  });
});
