import { db, type CategoryRecord, type SpaceRecord, type SpaceType } from '../../db/dexie';
import {
  DEFAULT_CATEGORIES_SEED,
  DEFAULT_SPACE_ID,
  DEFAULT_USER_ID,
  ensureInitialDataSeeded
} from '../../db/seed';
import { getSupabaseClient } from '../../lib/supabase';

function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateInviteCode(name: string): string {
  const cleanPrefix = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'L');
  const randomDigits = Math.floor(10 + Math.random() * 90);
  return `${cleanPrefix}${randomDigits}`;
}

/**
 * Cria um novo Espaço (Pessoal ou Compartilhado — ex.: "Casa com a Mamãe" ou "Eu e Meu Amor"),
 * gravando imediatamente no Supabase (quando conectado) e espelhando para uso na tela.
 */
export async function createSpaceWithUndo(input: {
  name: string;
  type: SpaceType;
  userId?: string;
}): Promise<{ space: SpaceRecord; undo: () => Promise<void> }> {
  const now = new Date().toISOString();
  const userId = input.userId || DEFAULT_USER_ID;
  const spaceId = generateId('space');
  const memberId = generateId('member');
  const accountId = generateId('acc');
  const inviteCode =
    input.type === 'compartilhado' ? generateInviteCode(input.name) : undefined;

  const space: SpaceRecord = {
    id: spaceId,
    name: input.name.trim(),
    type: input.type,
    inviteCode,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  const memberRecord = {
    id: memberId,
    spaceId,
    userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  const accountRecord = {
    id: accountId,
    userId,
    spaceId,
    name: 'Conta Principal',
    type: 'carteira' as const,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  const categoriesToInsert: CategoryRecord[] = DEFAULT_CATEGORIES_SEED.map(
    (item, idx) => ({
      id: `${spaceId}-${item.id}`,
      userId,
      spaceId,
      name: item.name,
      icon: item.icon,
      color: item.color,
      type: item.type,
      sortOrder: idx + 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    })
  );

  await db.transaction(
    'rw',
    [db.spaces, db.space_members, db.accounts, db.categories],
    async () => {
      await db.spaces.put(space);
      await db.space_members.put(memberRecord);
      await db.accounts.put(accountRecord);
      await db.categories.bulkPut(categoriesToInsert);
    }
  );

  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('spaces').upsert(space, { onConflict: 'id' });
        await supabase.from('space_members').upsert(memberRecord, { onConflict: 'id' });
        await supabase.from('accounts').upsert(accountRecord, { onConflict: 'id' });
      } catch {
        // segue normalmente
      }
    }
  }

  return {
    space,
    undo: async () => {
      await deleteSpaceCompletely(spaceId);
    }
  };
}

/**
 * Exclui permanentemente um Espaço e TODOS os dados vinculados a ele
 * (lançamentos, contas recorrentes, orçamentos, cofrinhos, viagens, categorias e membros)
 * tanto no banco de dados Supabase quanto localmente.
 */
export async function deleteSpaceCompletely(spaceId: string): Promise<{
  nextActiveSpaceId: string;
}> {
  // 1. Apaga tudo deste espaço no Supabase (ON DELETE CASCADE + exclusão explícita)
  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await Promise.all([
          supabase.from('trip_items').delete().eq('spaceId', spaceId),
          supabase.from('trips').delete().eq('spaceId', spaceId),
          supabase.from('goal_movements').delete().eq('spaceId', spaceId),
          supabase.from('savings_goals').delete().eq('spaceId', spaceId),
          supabase.from('budgets').delete().eq('spaceId', spaceId),
          supabase.from('recurrences').delete().eq('spaceId', spaceId),
          supabase.from('transactions').delete().eq('spaceId', spaceId),
          supabase.from('categories').delete().eq('spaceId', spaceId),
          supabase.from('accounts').delete().eq('spaceId', spaceId),
          supabase.from('space_members').delete().eq('spaceId', spaceId)
        ]);
        await supabase.from('spaces').delete().eq('id', spaceId);
      } catch {
        // continua limpeza
      }
    }
  }

  // 2. Apaga tudo deste espaço no banco local
  await db.transaction(
    'rw',
    [
      db.trip_items,
      db.trips,
      db.goal_movements,
      db.savings_goals,
      db.budgets,
      db.recurrences,
      db.transactions,
      db.categories,
      db.accounts,
      db.space_members,
      db.spaces
    ],
    async () => {
      await db.trip_items.where('spaceId').equals(spaceId).delete();
      await db.trips.where('spaceId').equals(spaceId).delete();
      await db.goal_movements.where('spaceId').equals(spaceId).delete();
      await db.savings_goals.where('spaceId').equals(spaceId).delete();
      await db.budgets.where('spaceId').equals(spaceId).delete();
      await db.recurrences.where('spaceId').equals(spaceId).delete();
      await db.transactions.where('spaceId').equals(spaceId).delete();
      await db.categories.where('spaceId').equals(spaceId).delete();
      await db.accounts.where('spaceId').equals(spaceId).delete();
      await db.space_members.where('spaceId').equals(spaceId).delete();
      await db.spaces.delete(spaceId);
    }
  );

  // 3. Verifica se ainda resta algum espaço; se não restar nenhum, recria o espaço pessoal limpo
  const remainingSpaces = await db.spaces.filter((s) => !s.deletedAt).toArray();
  if (remainingSpaces.length > 0) {
    return { nextActiveSpaceId: remainingSpaces[0].id };
  }

  await ensureInitialDataSeeded();
  return { nextActiveSpaceId: DEFAULT_SPACE_ID };
}

/**
 * Apaga TODOS os dados de todas as tabelas (tanto no Supabase quanto localmente)
 * quando o usuário confirma a exclusão total dos dados.
 */
export async function wipeAllDatabaseData(): Promise<void> {
  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const tablesInDeleteOrder = [
          'trip_items',
          'trips',
          'goal_movements',
          'savings_goals',
          'budgets',
          'recurrences',
          'transactions',
          'categories',
          'accounts',
          'space_members',
          'spaces'
        ];
        for (const tableName of tablesInDeleteOrder) {
          await supabase.from(tableName).delete().neq('id', '__never__');
        }
      } catch {
        // segue limpeza
      }
    }
  }

  await db.transaction(
    'rw',
    [
      db.trip_items,
      db.trips,
      db.goal_movements,
      db.savings_goals,
      db.budgets,
      db.recurrences,
      db.transactions,
      db.categories,
      db.accounts,
      db.space_members,
      db.spaces
    ],
    async () => {
      await db.trip_items.clear();
      await db.trips.clear();
      await db.goal_movements.clear();
      await db.savings_goals.clear();
      await db.budgets.clear();
      await db.recurrences.clear();
      await db.transactions.clear();
      await db.categories.clear();
      await db.accounts.clear();
      await db.space_members.clear();
      await db.spaces.clear();
    }
  );

  await ensureInitialDataSeeded();
}

/**
 * Entra em um Espaço Compartilhado existente na nuvem (Supabase) usando o código de 6 caracteres.
 */
export async function joinSharedSpaceByCode(
  rawCode: string,
  userId: string = DEFAULT_USER_ID
): Promise<{ space: SpaceRecord }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    throw new Error('Digite o código do espaço compartilhado.');
  }

  const localMatch = await db.spaces
    .filter((s) => !s.deletedAt && s.inviteCode?.toUpperCase() === code)
    .first();

  const supabase = getSupabaseClient();
  if (!supabase) {
    if (localMatch) return { space: localMatch };
    throw new Error('Banco na nuvem não disponível no momento.');
  }

  const { data: userSession } = await supabase.auth.getUser();
  const authUserId = userSession.user?.id;

  const { data: remoteSpace, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('inviteCode', code)
    .is('deletedAt', null)
    .maybeSingle();

  if (error || !remoteSpace) {
    throw new Error(
      `Não encontramos nenhum espaço com o código "${code}". Confira se digitou certinho.`
    );
  }

  const now = new Date().toISOString();
  const spaceRecord: SpaceRecord = {
    id: remoteSpace.id,
    name: remoteSpace.name,
    type: remoteSpace.type,
    inviteCode: remoteSpace.inviteCode,
    createdAt: remoteSpace.createdAt || now,
    updatedAt: remoteSpace.updatedAt || now,
    deletedAt: null
  };

  const memberId = `member-${spaceRecord.id}-${authUserId || userId}`;

  await supabase.from('space_members').upsert({
    id: memberId,
    spaceId: spaceRecord.id,
    userId,
    authUserId: authUserId || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  await db.transaction('rw', [db.spaces, db.space_members], async () => {
    await db.spaces.put(spaceRecord);
    await db.space_members.put({
      id: memberId,
      spaceId: spaceRecord.id,
      userId,
      authUserId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
  });

  return { space: spaceRecord };
}
