import { type Table } from 'dexie';
import { db, type BaseEntity, type SpaceMemberRecord, type UserRecord } from '../../db/dexie';
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_CATEGORIES_SEED,
  DEFAULT_SPACE_ID,
  DEFAULT_USER_ID
} from '../../db/seed';
import { getSupabaseClient } from '../../lib/supabase';
import { useAppStore } from '../../app/store/useAppStore';

const DEFAULT_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES_SEED.map((c) => c.id));

const LAST_SYNC_STORAGE_KEY = 'libertybag_last_sync_at';
let memoryLastSyncAt: string | null = null;

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(LAST_SYNC_STORAGE_KEY);
  } catch {
    // ignora
  }
}

/**
 * Regra de resolução de conflitos Offline-First (Last-Write-Wins):
 * Compara `updatedAt` (ISO 8601) entre o registro no aparelho e o registro na nuvem.
 * Respeita exclusão lógica (`deletedAt`): se alguém apagou mais recentemente, o `deletedAt` mais novo vence.
 */
export function resolveConflictLWW<T extends BaseEntity>(local: T | undefined, remote: T): T {
  if (!local) return remote;
  if (remote.updatedAt >= local.updatedAt) {
    return remote;
  }
  return local;
}

export function getLastSyncAt(): string | null {
  return memoryLastSyncAt;
}

function setLastSyncAt(iso: string): void {
  memoryLastSyncAt = iso;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  pushedCount: number;
  pulledCount: number;
  syncedAt: string | null;
}

const SYNC_TABLES: {
  name: string;
  getDexieTable: () => Table<BaseEntity, string>;
}[] = [
  { name: 'users', getDexieTable: () => db.users as unknown as Table<BaseEntity, string> },
  { name: 'spaces', getDexieTable: () => db.spaces as unknown as Table<BaseEntity, string> },
  {
    name: 'space_members',
    getDexieTable: () => db.space_members as unknown as Table<BaseEntity, string>
  },
  { name: 'accounts', getDexieTable: () => db.accounts as unknown as Table<BaseEntity, string> },
  {
    name: 'categories',
    getDexieTable: () => db.categories as unknown as Table<BaseEntity, string>
  },
  {
    name: 'transactions',
    getDexieTable: () => db.transactions as unknown as Table<BaseEntity, string>
  },
  {
    name: 'recurrences',
    getDexieTable: () => db.recurrences as unknown as Table<BaseEntity, string>
  },
  { name: 'budgets', getDexieTable: () => db.budgets as unknown as Table<BaseEntity, string> },
  {
    name: 'savings_goals',
    getDexieTable: () => db.savings_goals as unknown as Table<BaseEntity, string>
  },
  {
    name: 'goal_movements',
    getDexieTable: () => db.goal_movements as unknown as Table<BaseEntity, string>
  },
  { name: 'trips', getDexieTable: () => db.trips as unknown as Table<BaseEntity, string> },
  {
    name: 'trip_items',
    getDexieTable: () => db.trip_items as unknown as Table<BaseEntity, string>
  }
];

/**
 * Remove registros duplicados locais e remotos (ex.: usuários com mesmo e-mail ou categorias repetidas).
 */
async function deduplicateLocalAndRemoteUsers(): Promise<void> {
  // 1. Limpa duplicatas locais de usuários no Dexie
  const localUsers = await db.users.toArray();
  if (localUsers.length > 1) {
    const byEmail = new Map<string, UserRecord>();
    const idsToDelete: string[] = [];

    for (const u of localUsers) {
      const emailKey = (u.email || '').trim().toLowerCase();
      if (!emailKey || emailKey === 'local@libertybag.app') {
        if (u.id !== DEFAULT_USER_ID) {
          idsToDelete.push(u.id);
        }
        continue;
      }
      const existing = byEmail.get(emailKey);
      if (!existing) {
        byEmail.set(emailKey, u);
      } else if (u.updatedAt > existing.updatedAt) {
        idsToDelete.push(existing.id);
        byEmail.set(emailKey, u);
      } else {
        idsToDelete.push(u.id);
      }
    }

    if (idsToDelete.length > 0) {
      await db.users.bulkDelete(idsToDelete);
    }
  }

  // 2. Limpa categorias duplicadas com mesmo (spaceId + type + nome) mantendo a original
  const allCats = await db.categories.toArray();
  const seenCatKeys = new Map<string, string>();
  const dupCatIds: string[] = [];
  for (const cat of allCats) {
    if (cat.deletedAt) continue;
    const key = `${cat.spaceId}::${cat.type}::${cat.name.trim().toLowerCase()}`;
    if (!seenCatKeys.has(key)) {
      seenCatKeys.set(key, cat.id);
    } else {
      dupCatIds.push(cat.id);
    }
  }
  if (dupCatIds.length > 0) {
    await db.categories.bulkDelete(dupCatIds);
  }
}

/**
 * Executa a sincronização bidirecional (Aparelho <-> Supabase) com Last-Write-Wins e deduplicação.
 */
export async function syncAllWithSupabase(): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: 'Salvo neste aparelho (Supabase ainda não conectado).',
      pushedCount: 0,
      pulledCount: 0,
      syncedAt: getLastSyncAt()
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      message: 'Sem internet agora. Tudo continua salvo no aparelho!',
      pushedCount: 0,
      pulledCount: 0,
      syncedAt: getLastSyncAt()
    };
  }

  const { data: authData } = await supabase.auth.getUser().catch(() => ({
    data: { user: null }
  }));
  const authUserId = authData?.user?.id || null;
  let pushedCount = 0;
  let pulledCount = 0;

  try {
    await deduplicateLocalAndRemoteUsers();

    if (authUserId) {
      const localMembers = await db.space_members.toArray();
      for (const m of localMembers) {
        if (!m.authUserId) {
          await db.space_members.update(m.id, { authUserId });
        }
      }
    }

    // 1. Identifica o usuário e os espaços aos quais ele tem permissão de acesso
    const userState = useAppStore.getState();
    const activeUserId = userState.activeUserId;
    const userEmail = userState.userEmail?.trim().toLowerCase();
    const activeSpaceId = userState.activeSpaceId;

    const localMembers = await db.space_members
      .where('userId')
      .equals(activeUserId)
      .and((m) => !m.deletedAt)
      .toArray();

    const allowedSpaceSet = new Set<string>(localMembers.map((m) => m.spaceId));
    if (activeSpaceId) {
      allowedSpaceSet.add(activeSpaceId);
    }

    // Busca no Supabase se este usuário foi convidado para novos espaços compartilhados
    if (activeUserId && activeUserId !== DEFAULT_USER_ID) {
      const { data: remoteMembers } = await supabase
        .from('space_members')
        .select('*')
        .eq('userId', activeUserId);
      if (remoteMembers) {
        for (const rm of remoteMembers) {
          if (!rm.deletedAt && rm.spaceId) {
            allowedSpaceSet.add(rm.spaceId);
            await db.space_members.put(rm as unknown as SpaceMemberRecord);
          }
        }
      }
    }

    const allowedSpaceIds = Array.from(allowedSpaceSet);

    // Verifica se o usuário já criou algum dado real
    const [txCount, recCount, budCount, goalCount, tripCount, allCats] = await Promise.all([
      db.transactions.count(),
      db.recurrences.count(),
      db.budgets.count(),
      db.savings_goals.count(),
      db.trips.count(),
      db.categories.toArray()
    ]);
    const customCatCount = allCats.filter((c) => !DEFAULT_CATEGORY_IDS.has(c.id)).length;
    const hasUserCreatedData =
      txCount + recCount + budCount + goalCount + tripCount + customCatCount > 0;

    for (const { name, getDexieTable } of SYNC_TABLES) {
      const table = getDexieTable();
      const localRows = await table.toArray();

      // ESCOPO RESTRITO PARA PUSH (só envia registros de espaços que o usuário tem acesso)
      let localRowsToPush = localRows;
      if (name === 'users') {
        localRowsToPush = (localRows as unknown as UserRecord[]).filter(
          (u) =>
            Boolean(u.email) &&
            u.email.trim().toLowerCase() !== 'local@libertybag.app' &&
            (userEmail ? u.email.trim().toLowerCase() === userEmail : true)
        ) as unknown as BaseEntity[];
      } else if (name === 'spaces') {
        localRowsToPush = localRows.filter((s) => allowedSpaceIds.includes(s.id));
      } else if (name === 'space_members') {
        localRowsToPush = localRows.filter((m) =>
          allowedSpaceIds.includes((m as unknown as { spaceId: string }).spaceId)
        );
      } else {
        // accounts, categories, transactions, recurrences, budgets, savings_goals, goal_movements, trips, trip_items
        localRowsToPush = localRows.filter((r) =>
          allowedSpaceIds.includes((r as unknown as { spaceId: string }).spaceId)
        );
      }

      // Nunca envia as 17 categorias padrão estáticas
      if (name === 'categories') {
        localRowsToPush = localRowsToPush.filter((c) => !DEFAULT_CATEGORY_IDS.has(c.id));
      }

      // Não envia a carteira/espaço padrão vazio se não há dados reais
      if (name === 'accounts' && !hasUserCreatedData) {
        localRowsToPush = localRowsToPush.filter((a) => a.id !== DEFAULT_ACCOUNT_ID);
      }
      if (name === 'spaces' && !hasUserCreatedData) {
        localRowsToPush = localRowsToPush.filter((s) => s.id !== DEFAULT_SPACE_ID);
      }
      if (name === 'space_members' && !hasUserCreatedData) {
        localRowsToPush = localRowsToPush.filter((m) => m.id !== 'member-personal-default');
      }

      // 1. Push
      if (localRowsToPush.length > 0) {
        const { error: pushError } = await supabase
          .from(name)
          .upsert(localRowsToPush, { onConflict: 'id' });
        if (!pushError) {
          pushedCount += localRowsToPush.length;
        }
      }

      // 2. Pull estritamente filtrado por espaço ou usuário (NUNCA select('*') global!)
      let query = supabase.from(name).select('*');
      if (name === 'users') {
        if (userEmail) {
          query = query.eq('email', userEmail);
        } else {
          query = query.eq('id', activeUserId);
        }
      } else if (name === 'spaces') {
        if (allowedSpaceIds.length > 0) {
          query = query.in('id', allowedSpaceIds);
        } else {
          continue;
        }
      } else {
        if (allowedSpaceIds.length > 0) {
          query = query.in('spaceId', allowedSpaceIds);
        } else {
          continue;
        }
      }

      const { data: remoteRows, error: pullError } = await query;
      if (!pullError && remoteRows && remoteRows.length > 0) {
        let cleanedRemoteRows = remoteRows as BaseEntity[];

        if (name === 'users') {
          const remoteUsers = remoteRows as (BaseEntity & { email?: string })[];
          const byEmail = new Map<string, BaseEntity & { email?: string }>();
          const remoteDupIds: string[] = [];

          for (const ru of remoteUsers) {
            const emailKey = (ru.email || '').trim().toLowerCase();
            if (!emailKey || emailKey === 'local@libertybag.app') {
              remoteDupIds.push(ru.id);
              continue;
            }
            const prev = byEmail.get(emailKey);
            if (!prev) {
              byEmail.set(emailKey, ru);
            } else if ((ru.updatedAt || '') >= (prev.updatedAt || '')) {
              remoteDupIds.push(prev.id);
              byEmail.set(emailKey, ru);
            } else {
              remoteDupIds.push(ru.id);
            }
          }

          if (remoteDupIds.length > 0) {
            await supabase.from('users').delete().in('id', remoteDupIds);
          }
          cleanedRemoteRows = Array.from(byEmail.values());
        }

        const localMap = new Map(localRows.map((r) => [r.id, r]));
        const toPut: BaseEntity[] = [];

        for (const remote of cleanedRemoteRows) {
          const local = localMap.get(remote.id);
          const winner = resolveConflictLWW(local, remote);
          if (!local || winner === remote) {
            toPut.push(remote);
          }
        }

        if (toPut.length > 0) {
          await table.bulkPut(toPut);
          pulledCount += toPut.length;
        }
      }
    }

    // 3. SEGURANÇA E ISOLAMENTO DE DISPOSITIVO:
    // Se o aparelho contiver transações que pertencem a espaços de outra pessoa,
    // purga-as localmente para garantir que cada usuário veja apenas seus próprios dados!
    if (allowedSpaceIds.length > 0) {
      const allLocalTxs = await db.transactions.toArray();
      const foreignTxIds = allLocalTxs
        .filter((t) => !allowedSpaceIds.includes(t.spaceId))
        .map((t) => t.id);
      if (foreignTxIds.length > 0) {
        await db.transactions.bulkDelete(foreignTxIds);
      }

      const allLocalBudgets = await db.budgets.toArray();
      const foreignBudgetIds = allLocalBudgets
        .filter((b) => !allowedSpaceIds.includes(b.spaceId))
        .map((b) => b.id);
      if (foreignBudgetIds.length > 0) {
        await db.budgets.bulkDelete(foreignBudgetIds);
      }

      const allLocalGoals = await db.savings_goals.toArray();
      const foreignGoalIds = allLocalGoals
        .filter((g) => !allowedSpaceIds.includes(g.spaceId))
        .map((g) => g.id);
      if (foreignGoalIds.length > 0) {
        await db.savings_goals.bulkDelete(foreignGoalIds);
      }
    }

    const nowISO = new Date().toISOString();
    setLastSyncAt(nowISO);

    return {
      ok: true,
      message: 'Tudo salvo e sincronizado na nuvem!',
      pushedCount,
      pulledCount,
      syncedAt: nowISO
    };
  } catch {
    return {
      ok: false,
      message: 'Não foi possível sincronizar agora, mas seus dados estão seguros no aparelho.',
      pushedCount,
      pulledCount,
      syncedAt: getLastSyncAt()
    };
  }
}
