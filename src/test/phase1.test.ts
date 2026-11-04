import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateBudgetUsagePercent,
  calculatePeriodTotals,
  formatCentsToBRL,
  parseDigitsToCents,
  parseReaisStringToCents
} from '../lib/money';
import { getPeriodRange, shiftPeriodDate } from '../lib/dates';
import { db } from '../db/dexie';
import {
  DEFAULT_CATEGORIES_SEED,
  DEFAULT_SPACE_ID,
  ensureInitialDataSeeded
} from '../db/seed';
import {
  createTransactionWithUndo,
  softDeleteTransactionWithUndo,
  updateTransactionWithUndo
} from '../features/transactions/transactionService';
import {
  countTransactionsInCategory,
  deleteCategoryWithUndo,
  findSimilarCategory,
  saveCategoryWithUndo
} from '../features/categories/categoryService';

describe('Fase 1 — Regras de Negócio em Centavos (money.ts)', () => {
  it('converte dígitos do teclado numérico para centavos inteiros sem erro de float', () => {
    expect(parseDigitsToCents('')).toBe(0);
    expect(parseDigitsToCents('000')).toBe(0);
    expect(parseDigitsToCents('2500')).toBe(2500); // R$ 25,00
    expect(parseDigitsToCents('1055')).toBe(1055); // R$ 10,55
  });

  it('converte strings em reais ("45,90") para centavos inteiros (4590)', () => {
    expect(parseReaisStringToCents('45,90')).toBe(4590);
    expect(parseReaisStringToCents('1.250,50')).toBe(125050);
    expect(parseReaisStringToCents('10.55')).toBe(1055);
  });

  it('formata centavos inteiros para BRL corretamente', () => {
    const formatted = formatCentsToBRL(123456);
    expect(formatted).toContain('1.234,56');
  });

  it('soma "Entrou", "Saiu" e "Sobrou" em centavos ignorando itens apagados (deletedAt)', () => {
    // Clássico problema de ponto flutuante: R$ 10,55 + R$ 20,10 = R$ 30,65 (3065 centavos)
    const totals = calculatePeriodTotals([
      { amountCents: 200000, type: 'entrada', deletedAt: null }, // R$ 2.000,00
      { amountCents: 1055, type: 'saida', deletedAt: null }, // R$ 10,55
      { amountCents: 2010, type: 'saida', deletedAt: null }, // R$ 20,10
      { amountCents: 99999, type: 'saida', deletedAt: '2026-11-04T10:00:00Z' } // apagado!
    ]);

    expect(totals.entrou).toBe(200000);
    expect(totals.saiu).toBe(3065);
    expect(totals.sobrou).toBe(196935);
  });

  it('calcula a porcentagem de uso do "Quanto posso gastar" corretamente', () => {
    expect(calculateBudgetUsagePercent(50000, 0)).toBeNull();
    expect(calculateBudgetUsagePercent(50000, 200000)).toBe(25);
    expect(calculateBudgetUsagePercent(150000, 100000)).toBe(150);
  });
});

describe('Fase 1 — Períodos Dia | Semana | Mês (dates.ts)', () => {
  it('retorna intervalos ISO corretos para dia, semana e mês e navega entre períodos', () => {
    const ref = new Date(2026, 10, 4, 12, 0, 0); // 04/11/2026
    const dayRange = getPeriodRange('day', ref);
    expect(dayRange.startISO).toBe('2026-11-04');
    expect(dayRange.endISO).toBe('2026-11-04');

    const monthRange = getPeriodRange('month', ref);
    expect(monthRange.startISO).toBe('2026-11-01');
    expect(monthRange.endISO).toBe('2026-11-30');

    const prevMonth = shiftPeriodDate('month', ref, -1);
    const prevMonthRange = getPeriodRange('month', prevMonth);
    expect(prevMonthRange.startISO).toBe('2026-10-01');
    expect(prevMonthRange.endISO).toBe('2026-10-31');
  });
});

describe('Fase 1 — Banco Offline Dexie, Seed, Parcelas, Recorrência e Desfazer', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.recurrences.clear();
    await db.categories.clear();
    await db.spaces.clear();
    await db.users.clear();
    await ensureInitialDataSeeded();
  });

  it('semeia as 17 categorias padrão (13 saídas e 4 entradas) e espaço pessoal com spaceId', async () => {
    const categories = await db.categories.toArray();
    expect(categories.length).toBe(DEFAULT_CATEGORIES_SEED.length);
    expect(categories.every((c) => c.spaceId === DEFAULT_SPACE_ID)).toBe(true);

    const saidas = categories.filter((c) => c.type === 'saida');
    const entradas = categories.filter((c) => c.type === 'entrada');
    expect(saidas.length).toBe(13);
    expect(entradas.length).toBe(4);
  });

  it('cria lançamento simples e permite desfazer com 1 toque (exclusão lógica)', async () => {
    const { createdIds, undo } = await createTransactionWithUndo({
      amountCents: 4590,
      type: 'saida',
      categoryId: 'cat-mercado',
      date: '2026-11-04',
      description: 'Frutas e pão'
    });

    expect(createdIds.length).toBe(1);
    let saved = await db.transactions.get(createdIds[0]);
    expect(saved?.amountCents).toBe(4590);
    expect(saved?.spaceId).toBe(DEFAULT_SPACE_ID);
    expect(saved?.deletedAt).toBeNull();

    // Executa Desfazer
    await undo();
    saved = await db.transactions.get(createdIds[0]);
    expect(saved?.deletedAt).not.toBeNull();
  });

  it('divide compra parcelada em centavos exatos (resto na 1ª parcela) e permite desfazer todas', async () => {
    // R$ 100,00 (10000 centavos) em 3x -> 3334 + 3333 + 3333 = 10000 centavos
    const { createdIds, undo } = await createTransactionWithUndo({
      amountCents: 10000,
      type: 'saida',
      categoryId: 'cat-roupas',
      date: '2026-11-04',
      description: 'Casaco',
      installmentsCount: 3
    });

    expect(createdIds.length).toBe(3);
    const items = await db.transactions.bulkGet(createdIds);
    const amounts = items.map((i) => i!.amountCents);
    expect(amounts).toEqual([3334, 3333, 3333]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(items[0]?.date).toBe('2026-11-04');
    expect(items[1]?.date).toBe('2026-12-04');
    expect(items[2]?.date).toBe('2027-01-04');

    // Desfazer apaga logicamente as 3 parcelas
    await undo();
    const afterUndo = await db.transactions.bulkGet(createdIds);
    expect(afterUndo.every((i) => i?.deletedAt !== null)).toBe(true);
  });

  it('permite editar e apagar um lançamento com opção de desfazer', async () => {
    const { createdIds } = await createTransactionWithUndo({
      amountCents: 3000,
      type: 'saida',
      categoryId: 'cat-pequenos-gastos',
      date: '2026-11-04'
    });
    const txId = createdIds[0];

    // Edita para 3500 centavos
    const { undo: undoEdit } = await updateTransactionWithUndo(txId, {
      amountCents: 3500
    });
    expect((await db.transactions.get(txId))?.amountCents).toBe(3500);

    // Desfaz edição -> volta para 3000 centavos
    await undoEdit();
    expect((await db.transactions.get(txId))?.amountCents).toBe(3000);

    // Apaga logicamente
    const { undo: undoDelete } = await softDeleteTransactionWithUndo(txId);
    expect((await db.transactions.get(txId))?.deletedAt).not.toBeNull();

    // Desfaz exclusão -> volta a ficar ativo
    await undoDelete();
    expect((await db.transactions.get(txId))?.deletedAt).toBeNull();
  });

  it('cria, edita, detecta nome parecido e apaga categoria movendo lançamentos para Outros com desfazer', async () => {
    // 1. Cria nova categoria offline
    const { category, undo: undoCreate } = await saveCategoryWithUndo({
      name: 'Farmácia',
      type: 'saida',
      icon: 'HeartPulse',
      color: '#2E9E6B'
    });
    expect(category.name).toBe('Farmácia');

    // 2. Detecta nome parecido (sem acento / minúsculo)
    const similar = await findSimilarCategory('farmacia', 'saida');
    expect(similar?.id).toBe(category.id);

    // 3. Edita nome e cor da categoria e testa undo
    const { category: updated, undo: undoEditCat } = await saveCategoryWithUndo({
      id: category.id,
      name: 'Farmácia e Remédios',
      type: 'saida',
      icon: 'Stethoscope',
      color: '#2346C8'
    });
    expect(updated.name).toBe('Farmácia e Remédios');

    await undoEditCat();
    expect((await db.categories.get(category.id))?.name).toBe('Farmácia');

    // 4. Cria lançamento nesta categoria e apaga movendo para "Outros"
    const { createdIds } = await createTransactionWithUndo({
      amountCents: 8900,
      type: 'saida',
      categoryId: category.id,
      date: '2026-11-04',
      description: 'Vitamina'
    });
    expect(await countTransactionsInCategory(category.id)).toBe(1);

    const { movedCount, undo: undoDeleteCat } = await deleteCategoryWithUndo(category.id, {
      moveToOthers: true
    });
    expect(movedCount).toBe(1);
    expect((await db.transactions.get(createdIds[0]))?.categoryId).toBe('cat-outros-saida');
    expect((await db.categories.get(category.id))?.deletedAt).not.toBeNull();

    // 5. Desfaz exclusão da categoria -> restaura categoria e devolve o lançamento para ela
    await undoDeleteCat();
    expect((await db.categories.get(category.id))?.deletedAt).toBeNull();
    expect((await db.transactions.get(createdIds[0]))?.categoryId).toBe(category.id);

    // Também testa o undo da criação inicial
    await undoCreate();
    expect((await db.categories.get(category.id))?.deletedAt).not.toBeNull();
  });
});
