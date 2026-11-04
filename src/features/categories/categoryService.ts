import { db, type CategoryRecord, type TransactionType } from '../../db/dexie';
import { DEFAULT_SPACE_ID, DEFAULT_USER_ID } from '../../db/seed';

export interface SaveCategoryInput {
  id?: string; // se presente, edita
  userId?: string;
  spaceId?: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface SaveCategoryResult {
  category: CategoryRecord;
  undo: () => Promise<void>;
}

/**
 * Normaliza texto para comparar nomes parecidos (sem acentos, minúsculo).
 */
export function normalizeCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Procura se já existe uma categoria ativa com nome igual ou muito parecido no mesmo tipo.
 */
export async function findSimilarCategory(
  name: string,
  type: TransactionType,
  spaceId: string = DEFAULT_SPACE_ID,
  ignoreId?: string
): Promise<CategoryRecord | null> {
  const target = normalizeCategoryName(name);
  if (!target) return null;

  const activeCategories = await db.categories
    .where('spaceId')
    .equals(spaceId)
    .and((c) => !c.deletedAt && c.type === type && c.id !== ignoreId)
    .toArray();

  for (const cat of activeCategories) {
    const existing = normalizeCategoryName(cat.name);
    if (
      existing === target ||
      (target.length >= 4 && (existing.includes(target) || target.includes(existing)))
    ) {
      return cat;
    }
  }
  return null;
}

/**
 * Cria ou atualiza uma categoria offline no Dexie e retorna função `undo()`.
 */
export async function saveCategoryWithUndo(
  input: SaveCategoryInput
): Promise<SaveCategoryResult> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Digite um nome para a categoria.');
  }

  const now = new Date().toISOString();
  const userId = input.userId || DEFAULT_USER_ID;
  const spaceId = input.spaceId || DEFAULT_SPACE_ID;

  if (input.id) {
    const existing = await db.categories.get(input.id);
    if (!existing) {
      throw new Error('Categoria não encontrada.');
    }

    const updated: CategoryRecord = {
      ...existing,
      name: trimmedName,
      type: input.type,
      icon: input.icon,
      color: input.color,
      updatedAt: now
    };

    await db.categories.put(updated);

    return {
      category: updated,
      undo: async () => {
        await db.categories.put({
          ...existing,
          updatedAt: new Date().toISOString()
        });
      }
    };
  }

  const count = await db.categories
    .where('spaceId')
    .equals(spaceId)
    .and((c) => c.type === input.type)
    .count();

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `cat-${crypto.randomUUID()}`
      : `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const created: CategoryRecord = {
    id,
    userId,
    spaceId,
    name: trimmedName,
    type: input.type,
    icon: input.icon,
    color: input.color,
    sortOrder: count + 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  await db.categories.put(created);

  return {
    category: created,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.categories.update(id, {
        deletedAt: undoTime,
        updatedAt: undoTime
      });
    }
  };
}

/**
 * Conta quantos lançamentos ativos usam esta categoria.
 */
export async function countTransactionsInCategory(categoryId: string): Promise<number> {
  return db.transactions
    .where('categoryId')
    .equals(categoryId)
    .and((tx) => !tx.deletedAt)
    .count();
}

/**
 * Arquiva/apaga logicamente uma categoria.
 * Se `moveToOthers` for verdadeiro, move todos os lançamentos ativos dela para a categoria "Outros" correspondente.
 * Retorna função `undo()` que restaura tanto a categoria quanto os lançamentos movidos.
 */
export async function deleteCategoryWithUndo(
  categoryId: string,
  options: { moveToOthers?: boolean } = {}
): Promise<{ movedCount: number; undo: () => Promise<void> }> {
  const category = await db.categories.get(categoryId);
  if (!category) {
    return { movedCount: 0, undo: async () => {} };
  }

  const fallbackId =
    category.type === 'entrada' ? 'cat-outros-entrada' : 'cat-outros-saida';

  const now = new Date().toISOString();
  let affectedTxIds: string[] = [];

  await db.transaction('rw', [db.categories, db.transactions], async () => {
    if (options.moveToOthers && categoryId !== fallbackId) {
      const txs = await db.transactions
        .where('categoryId')
        .equals(categoryId)
        .and((tx) => !tx.deletedAt)
        .toArray();

      affectedTxIds = txs.map((t) => t.id);

      for (const txId of affectedTxIds) {
        await db.transactions.update(txId, {
          categoryId: fallbackId,
          updatedAt: now
        });
      }
    }

    await db.categories.update(categoryId, {
      deletedAt: now,
      updatedAt: now
    });
  });

  return {
    movedCount: affectedTxIds.length,
    undo: async () => {
      const undoTime = new Date().toISOString();
      await db.transaction('rw', [db.categories, db.transactions], async () => {
        await db.categories.update(categoryId, {
          deletedAt: null,
          updatedAt: undoTime
        });
        for (const txId of affectedTxIds) {
          await db.transactions.update(txId, {
            categoryId,
            updatedAt: undoTime
          });
        }
      });
    }
  };
}
