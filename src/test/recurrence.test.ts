import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/dexie';
import {
  createTransactionWithUndo,
  updateTransactionWithUndo,
  deleteTransactionWithScope,
  updateTransactionSeriesDurationWithUndo,
  deduplicateTransactions
} from '../features/transactions/transactionService';

describe('Recurrence series update and propagation across months', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.recurrences.clear();
  });

  it('propagates date day-of-month and amount across all repeating sibling months', async () => {
    // Cria um lançamento recorrente inicial (dia 05 de março de 2026)
    // createTransactionWithUndo já gera os meses da série com repeatMonthly: true
    const { createdIds, recurrenceId, undo } = await createTransactionWithUndo({
      spaceId: 'space-test',
      userId: 'user-test',
      type: 'saida',
      amountCents: 15000,
      categoryId: 'cat-test',
      paymentMethod: 'pix',
      date: '2026-03-05',
      description: 'Plano Academia',
      repeatMonthly: true
    });

    expect(recurrenceId).toBeDefined();
    expect(createdIds.length).toBeGreaterThan(1);

    const firstId = createdIds[0];
    const initialSiblings = await db.transactions
      .where('recurrenceId')
      .equals(recurrenceId!)
      .toArray();

    expect(initialSiblings.length).toBe(createdIds.length);
    // Todos começam com dia 05
    for (const item of initialSiblings) {
      expect(item.date.endsWith('-05')).toBe(true);
      expect(item.amountCents).toBe(15000);
      expect(item.description).toBe('Plano Academia');
    }

    // Atualiza a data do primeiro para o dia 20 e o valor para R$ 180,00 (18000 cents)
    const updateResult = await updateTransactionWithUndo(
      firstId,
      {
        date: '2026-03-20',
        amountCents: 18000,
        description: 'Plano Academia Gold'
      },
      { updateSeries: true }
    );

    expect(updateResult.isSeriesUpdate).toBe(true);
    expect(updateResult.updatedCount).toBe(createdIds.length);

    // Verifica se todos os meses foram atualizados para o dia 20 e R$ 180,00
    const updatedSiblings = await db.transactions
      .where('recurrenceId')
      .equals(recurrenceId!)
      .toArray();

    for (const item of updatedSiblings) {
      expect(item.date.endsWith('-20')).toBe(true);
      expect(item.amountCents).toBe(18000);
      expect(item.description).toBe('Plano Academia Gold');
    }

    // Testa o Desfazer (Undo) da atualização
    await updateResult.undo();

    const restoredSiblings = await db.transactions
      .where('recurrenceId')
      .equals(recurrenceId!)
      .toArray();

    for (const item of restoredSiblings) {
      expect(item.date.endsWith('-05')).toBe(true);
      expect(item.amountCents).toBe(15000);
      expect(item.description).toBe('Plano Academia');
    }

    // Testa o Desfazer da criação inicial
    await undo();
    const deletedSiblings = await db.transactions
      .where('recurrenceId')
      .equals(recurrenceId!)
      .and((t) => !t.deletedAt)
      .toArray();
    expect(deletedSiblings).toHaveLength(0);
  });

  it('clamps day-of-month correctly for months with fewer days (e.g. Feb 28)', async () => {
    const { createdIds, recurrenceId } = await createTransactionWithUndo({
      spaceId: 'space-test',
      userId: 'user-test',
      type: 'saida',
      amountCents: 9900,
      categoryId: 'cat-test',
      paymentMethod: 'pix',
      date: '2026-01-10',
      description: 'Assinatura',
      repeatMonthly: true
    });

    const firstId = createdIds[0];

    // Altera a data para o dia 31 (janeiro tem 31, fevereiro de 2026 tem 28)
    await updateTransactionWithUndo(
      firstId,
      { date: '2026-01-31' },
      { updateSeries: true }
    );

    const allSiblings = await db.transactions
      .where('recurrenceId')
      .equals(recurrenceId!)
      .toArray();

    const febSibling = allSiblings.find((s) => s.date.startsWith('2026-02'));
    expect(febSibling?.date).toBe('2026-02-28');

    const aprSibling = allSiblings.find((s) => s.date.startsWith('2026-04'));
    expect(aprSibling?.date).toBe('2026-04-30');

    const janSibling = allSiblings.find((s) => s.date.startsWith('2026-01'));
    expect(janSibling?.date).toBe('2026-01-31');
  });

  describe('Scoped deletion of recurring and installment transactions', () => {
    it('deletes only the current month with scope="only_this"', async () => {
      const { createdIds, recurrenceId } = await createTransactionWithUndo({
        spaceId: 'space-test',
        userId: 'user-test',
        type: 'saida',
        amountCents: 5000,
        categoryId: 'cat-test',
        date: '2026-01-15',
        description: 'Netflix',
        repeatMonthly: true,
        repeatMonthsCount: 6
      });

      // Pega o terceiro mês (março)
      const targetId = createdIds[2];
      const res = await deleteTransactionWithScope(targetId, 'only_this');

      expect(res.isSeriesDelete).toBe(true);
      expect(res.deletedCount).toBe(1);
      expect(res.scope).toBe('only_this');

      const remainingActive = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();

      expect(remainingActive.length).toBe(5);
      expect(remainingActive.some((t) => t.id === targetId)).toBe(false);

      // Testa Undo
      await res.undo();
      const restored = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();
      expect(restored.length).toBe(6);
    });

    it('deletes from current month forward with scope="this_and_future"', async () => {
      const { createdIds, recurrenceId } = await createTransactionWithUndo({
        spaceId: 'space-test',
        userId: 'user-test',
        type: 'saida',
        amountCents: 6000,
        categoryId: 'cat-test',
        date: '2026-01-15',
        description: 'Internet',
        repeatMonthly: true,
        repeatMonthsCount: 6
      });

      // Apaga a partir do 4º mês (índice 3 - abril) em diante
      const targetId = createdIds[3];
      const res = await deleteTransactionWithScope(targetId, 'this_and_future');

      expect(res.isSeriesDelete).toBe(true);
      expect(res.deletedCount).toBe(3); // meses 4, 5, 6

      const remainingActive = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();

      // Devem sobrar os 3 primeiros meses (janeiro, fevereiro, março)
      expect(remainingActive.length).toBe(3);

      // Regra de recorrência deve ter sido desativada
      const rec = await db.recurrences.get(recurrenceId!);
      expect(rec?.active).toBe(false);

      // Testa Undo
      await res.undo();
      const restored = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();
      expect(restored.length).toBe(6);
      const recRestored = await db.recurrences.get(recurrenceId!);
      expect(recRestored?.active).toBe(true);
    });

    it('deletes all months with scope="all"', async () => {
      const { createdIds, recurrenceId } = await createTransactionWithUndo({
        spaceId: 'space-test',
        userId: 'user-test',
        type: 'saida',
        amountCents: 7500,
        categoryId: 'cat-test',
        date: '2026-01-10',
        description: 'Academia',
        repeatMonthly: true,
        repeatMonthsCount: 5
      });

      const res = await deleteTransactionWithScope(createdIds[1], 'all');

      expect(res.isSeriesDelete).toBe(true);
      expect(res.deletedCount).toBe(5);

      const remainingActive = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();

      expect(remainingActive.length).toBe(0);

      // Testa Undo
      await res.undo();
      const restored = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();
      expect(restored.length).toBe(5);
    });
  });

  describe('Changing duration (number of months) of a series', () => {
    it('extends duration by adding future months with the same pattern', async () => {
      const { createdIds, recurrenceId } = await createTransactionWithUndo({
        spaceId: 'space-test',
        userId: 'user-test',
        type: 'saida',
        amountCents: 12000,
        categoryId: 'cat-test',
        date: '2026-01-05',
        description: 'Curso de Idiomas',
        repeatMonthly: true,
        repeatMonthsCount: 3
      });

      // Aumenta de 3 para 6 meses
      const res = await updateTransactionSeriesDurationWithUndo(createdIds[0], 6);
      expect(res.previousCount).toBe(3);
      expect(res.newCount).toBe(6);
      expect(res.addedCount).toBe(3);

      const allActive = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .sortBy('date');

      expect(allActive.length).toBe(6);
      expect(allActive[0].date).toBe('2026-01-05');
      expect(allActive[5].date).toBe('2026-06-05');
      for (const t of allActive) {
        expect(t.amountCents).toBe(12000);
        expect(t.description).toBe('Curso de Idiomas');
      }

      // Undo reverte para os 3 originais
      await res.undo();
      const afterUndo = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();
      expect(afterUndo.length).toBe(3);
    });

    it('shrinks duration by soft-deleting future excess months', async () => {
      const { createdIds, recurrenceId } = await createTransactionWithUndo({
        spaceId: 'space-test',
        userId: 'user-test',
        type: 'saida',
        amountCents: 4500,
        categoryId: 'cat-test',
        date: '2026-01-10',
        description: 'Serviço Streaming',
        repeatMonthly: true,
        repeatMonthsCount: 6
      });

      // Encurta de 6 para 2 meses
      const res = await updateTransactionSeriesDurationWithUndo(createdIds[0], 2);
      expect(res.previousCount).toBe(6);
      expect(res.newCount).toBe(2);
      expect(res.removedCount).toBe(4);

      const remaining = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();

      expect(remaining.length).toBe(2);

      // Undo restaura todos os 6
      await res.undo();
      const restored = await db.transactions
        .where('recurrenceId')
        .equals(recurrenceId!)
        .and((t) => !t.deletedAt)
        .toArray();
      expect(restored.length).toBe(6);
    });
  });

  describe('Deduplication of transactions and idempotency protection', () => {
    it('detects and removes duplicate transactions, preserving canonical record', async () => {
      // Cria manualmente transações idênticas (simulando duplo envio / sync remoto)
      const now = new Date().toISOString();
      await db.transactions.bulkPut([
        {
          id: 'tx-dup-1',
          userId: 'user-test',
          spaceId: 'space-test',
          amountCents: 3500,
          type: 'saida',
          categoryId: 'cat-test',
          date: '2026-02-15',
          description: 'Café com bolo',
          origin: 'manual',
          createdAt: '2026-02-15T10:00:00.000Z',
          updatedAt: now,
          deletedAt: null
        },
        {
          id: 'tx-dup-2',
          userId: 'user-test',
          spaceId: 'space-test',
          amountCents: 3500,
          type: 'saida',
          categoryId: 'cat-test',
          date: '2026-02-15',
          description: 'Café com bolo',
          origin: 'manual',
          createdAt: '2026-02-15T10:00:02.000Z',
          updatedAt: now,
          deletedAt: null
        },
        {
          id: 'tx-unique-3',
          userId: 'user-test',
          spaceId: 'space-test',
          amountCents: 5000,
          type: 'saida',
          categoryId: 'cat-test',
          date: '2026-02-15',
          description: 'Almoço',
          origin: 'manual',
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        }
      ]);

      const res = await deduplicateTransactions('space-test');
      expect(res.duplicatesRemoved).toBe(1);
      expect(res.remainingCount).toBe(2);

      // O canônico mais antigo 'tx-dup-1' deve continuar ativo
      const tx1 = await db.transactions.get('tx-dup-1');
      expect(tx1?.deletedAt).toBeNull();

      // A duplicata 'tx-dup-2' deve estar soft-deletada
      const tx2 = await db.transactions.get('tx-dup-2');
      expect(tx2?.deletedAt).not.toBeNull();

      // O único 'tx-unique-3' segue ativo
      const tx3 = await db.transactions.get('tx-unique-3');
      expect(tx3?.deletedAt).toBeNull();

      // Testa Undo
      await res.undo();
      const tx2Restored = await db.transactions.get('tx-dup-2');
      expect(tx2Restored?.deletedAt).toBeNull();
    });

    it('protects against rapid repeated submissions with idempotency window', async () => {
      const input = {
        spaceId: 'space-test',
        userId: 'user-test',
        type: 'saida' as const,
        amountCents: 8900,
        categoryId: 'cat-test',
        date: '2026-03-01',
        description: 'Compra Rápida',
        repeatMonthly: false
      };

      // Dois envios rápidos seguidos (duplo-clique)
      const res1 = await createTransactionWithUndo(input);
      const res2 = await createTransactionWithUndo(input);

      // res2 deve reutilizar os mesmos IDs do res1 sem criar novos clones
      expect(res1.createdIds).toEqual(res2.createdIds);

      const allActive = await db.transactions
        .where('spaceId')
        .equals('space-test')
        .and((t) => !t.deletedAt)
        .toArray();

      expect(allActive.length).toBe(1);
    });
  });

  describe('resetAllMonthsTransactions', () => {
    it('resets all transactions across all months and allows undo to restore them', async () => {
      const { resetAllMonthsTransactions } = await import('../features/transactions/transactionService');

      // Cria transações em meses diferentes
      await createTransactionWithUndo({
        spaceId: 'space-reset-test',
        userId: 'user-test',
        type: 'saida',
        amountCents: 5000,
        categoryId: 'cat-test',
        date: '2026-01-10',
        description: 'Lançamento Mês 1'
      });
      await createTransactionWithUndo({
        spaceId: 'space-reset-test',
        userId: 'user-test',
        type: 'entrada',
        amountCents: 15000,
        categoryId: 'cat-test',
        date: '2026-02-15',
        description: 'Lançamento Mês 2'
      });

      const beforeReset = await db.transactions
        .where('spaceId')
        .equals('space-reset-test')
        .and((t) => !t.deletedAt)
        .toArray();
      expect(beforeReset.length).toBe(2);

      const res = await resetAllMonthsTransactions('space-reset-test');
      expect(res.transactionsCount).toBe(2);
      expect(res.distinctMonthsCount).toBe(2);

      const afterReset = await db.transactions
        .where('spaceId')
        .equals('space-reset-test')
        .and((t) => !t.deletedAt)
        .toArray();
      expect(afterReset.length).toBe(0);

      // Desfazer (Undo)
      await res.undo();

      const afterUndo = await db.transactions
        .where('spaceId')
        .equals('space-reset-test')
        .and((t) => !t.deletedAt)
        .toArray();
      expect(afterUndo.length).toBe(2);
    });
  });
});
