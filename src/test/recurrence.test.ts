import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/dexie';
import {
  createTransactionWithUndo,
  updateTransactionWithUndo
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
});
