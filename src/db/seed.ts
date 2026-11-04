import { db, type CategoryRecord, type TransactionType } from './dexie';

export const DEFAULT_USER_ID = 'user-local-default';
export const DEFAULT_SPACE_ID = 'space-personal-default';
export const DEFAULT_ACCOUNT_ID = 'account-default-wallet';

interface DefaultCategorySeed {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export const DEFAULT_CATEGORIES_SEED: DefaultCategorySeed[] = [
  // 13 Categorias de Saída
  { id: 'cat-mercado', name: 'Mercado', icon: 'ShoppingCart', color: '#2346C8', type: 'saida' },
  { id: 'cat-comida-fora', name: 'Comida fora', icon: 'Utensils', color: '#F89C3D', type: 'saida' },
  { id: 'cat-transporte', name: 'Transporte', icon: 'Bus', color: '#3B6EE8', type: 'saida' },
  { id: 'cat-casa', name: 'Casa', icon: 'Home', color: '#12206B', type: 'saida' },
  { id: 'cat-contas', name: 'Contas', icon: 'FileText', color: '#D9534F', type: 'saida' },
  { id: 'cat-saude', name: 'Saúde', icon: 'HeartPulse', color: '#2E9E6B', type: 'saida' },
  { id: 'cat-lazer', name: 'Lazer', icon: 'Sun', color: '#E6A82E', type: 'saida' },
  { id: 'cat-roupas', name: 'Roupas', icon: 'Shirt', color: '#6E56CF', type: 'saida' },
  { id: 'cat-educacao', name: 'Educação', icon: 'BookOpen', color: '#2346C8', type: 'saida' },
  { id: 'cat-presentes-saida', name: 'Presentes', icon: 'Gift', color: '#E5486D', type: 'saida' },
  { id: 'cat-viagem', name: 'Viagem', icon: 'Plane', color: '#0091FF', type: 'saida' },
  { id: 'cat-pequenos-gastos', name: 'Pequenos gastos', icon: 'Coffee', color: '#F89C3D', type: 'saida' },
  { id: 'cat-outros-saida', name: 'Outros', icon: 'MoreHorizontal', color: '#64748B', type: 'saida' },

  // 4 Categorias de Entrada
  { id: 'cat-salario', name: 'Salário', icon: 'Wallet', color: '#2E9E6B', type: 'entrada' },
  { id: 'cat-extra', name: 'Extra', icon: 'Sparkles', color: '#2346C8', type: 'entrada' },
  { id: 'cat-presente-entrada', name: 'Presente', icon: 'Gift', color: '#F89C3D', type: 'entrada' },
  { id: 'cat-outros-entrada', name: 'Outros', icon: 'PlusCircle', color: '#2E9E6B', type: 'entrada' }
];

/**
 * Garante que o usuário local, o espaço pessoal, a conta invisível padrão
 * e as categorias padrão existam no IndexedDB desde a primeira abertura offline.
 */
export async function ensureInitialDataSeeded(): Promise<void> {
  const now = new Date().toISOString();

  await db.transaction(
    'rw',
    [db.users, db.spaces, db.space_members, db.accounts, db.categories],
    async () => {
      const existingUser = await db.users.get(DEFAULT_USER_ID);
      if (!existingUser) {
        await db.users.put({
          id: DEFAULT_USER_ID,
          name: '',
          email: 'local@libertybag.app',
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }

      const existingSpace = await db.spaces.get(DEFAULT_SPACE_ID);
      if (!existingSpace) {
        await db.spaces.put({
          id: DEFAULT_SPACE_ID,
          name: 'Meu Espaço Pessoal',
          type: 'pessoal',
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });

        await db.space_members.put({
          id: 'member-personal-default',
          spaceId: DEFAULT_SPACE_ID,
          userId: DEFAULT_USER_ID,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }

      const existingAccount = await db.accounts.get(DEFAULT_ACCOUNT_ID);
      if (!existingAccount) {
        await db.accounts.put({
          id: DEFAULT_ACCOUNT_ID,
          userId: DEFAULT_USER_ID,
          spaceId: DEFAULT_SPACE_ID,
          name: 'Conta Principal',
          type: 'carteira',
          isDefault: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }

      const categoryCount = await db.categories.count();
      if (categoryCount === 0) {
        const categoriesToInsert: CategoryRecord[] = DEFAULT_CATEGORIES_SEED.map((item, idx) => ({
          id: item.id,
          userId: DEFAULT_USER_ID,
          spaceId: DEFAULT_SPACE_ID,
          name: item.name,
          icon: item.icon,
          color: item.color,
          type: item.type,
          sortOrder: idx + 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        }));
        await db.categories.bulkPut(categoriesToInsert);
      }
    }
  );
}
