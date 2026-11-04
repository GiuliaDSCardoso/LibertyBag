import Dexie, { type Table } from 'dexie';

export type TransactionType = 'entrada' | 'saida';
export type AccountType = 'carteira' | 'banco' | 'cartao';
export type SpaceType = 'pessoal' | 'compartilhado';
export type TransactionOrigin = 'manual' | 'importado';
export type PaymentMethod =
  | 'pix'
  | 'credito'
  | 'pix_parcelado'
  | 'debito'
  | 'dinheiro'
  | 'cartao'
  | 'outro';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserRecord extends BaseEntity {
  name: string;
  email: string;
  authUserId?: string;
}

export interface SpaceRecord extends BaseEntity {
  name: string;
  type: SpaceType;
  inviteCode?: string;
}

export interface SpaceMemberRecord extends BaseEntity {
  spaceId: string;
  userId: string;
  authUserId?: string;
}

export interface AccountRecord extends BaseEntity {
  userId: string;
  spaceId: string;
  name: string;
  type: AccountType;
  isDefault?: boolean;
}

export interface CategoryRecord extends BaseEntity {
  userId: string;
  spaceId: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  sortOrder: number;
}

export interface InstallmentInfo {
  current: number; // 0 = entrada, 1..total = número da parcela
  total: number;
  groupId: string;
  hasInterest?: boolean;
  originalTotalCents?: number;
  finalTotalCents?: number;
  downPaymentCents?: number;
}

export interface TransactionRecord extends BaseEntity {
  userId: string;
  spaceId: string;
  amountCents: number; // sempre inteiro em centavos!
  type: TransactionType;
  categoryId: string;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod?: PaymentMethod;
  recurrenceId?: string | null;
  installment?: InstallmentInfo | null;
  origin: TransactionOrigin;
}

export interface RecurrenceRecord extends BaseEntity {
  userId: string;
  spaceId: string;
  rule: 'mensal' | 'semanal' | 'anual';
  nextDate: string; // YYYY-MM-DD
  active: boolean;
  templateTitle: string;
  amountCents: number;
  categoryId: string;
  type: TransactionType;
}

export interface BudgetRecord extends BaseEntity {
  userId: string;
  spaceId: string;
  month: string; // YYYY-MM
  categoryId: string | null; // null = orçamento total do mês
  plannedCents: number;
}

export interface SavingsGoalRecord extends BaseEntity {
  userId: string;
  spaceId: string;
  name: string;
  targetCents: number;
  deadline: string | null; // YYYY-MM-DD
  savedCents: number;
}

export interface GoalMovementRecord extends BaseEntity {
  goalId: string;
  userId: string;
  spaceId: string;
  amountCents: number; // positivo = guardar, negativo = retirar
  date: string;
  note?: string;
}

export interface TripRecord extends BaseEntity {
  userId: string;
  spaceId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  goalId?: string | null;
}

export interface TripItemRecord extends BaseEntity {
  tripId: string;
  spaceId: string;
  part: 'passagem' | 'hospedagem' | 'comida' | 'passeios' | 'extras';
  plannedCents: number;
  spentCents: number;
}

export class LibertyBagDB extends Dexie {
  users!: Table<UserRecord, string>;
  spaces!: Table<SpaceRecord, string>;
  space_members!: Table<SpaceMemberRecord, string>;
  accounts!: Table<AccountRecord, string>;
  categories!: Table<CategoryRecord, string>;
  transactions!: Table<TransactionRecord, string>;
  recurrences!: Table<RecurrenceRecord, string>;
  budgets!: Table<BudgetRecord, string>;
  savings_goals!: Table<SavingsGoalRecord, string>;
  goal_movements!: Table<GoalMovementRecord, string>;
  trips!: Table<TripRecord, string>;
  trip_items!: Table<TripItemRecord, string>;

  constructor() {
    super('LibertyBagDatabase');

    this.version(1).stores({
      users: 'id, email, updatedAt, deletedAt',
      spaces: 'id, type, updatedAt, deletedAt',
      space_members: 'id, spaceId, userId, updatedAt, deletedAt',
      accounts: 'id, userId, spaceId, type, updatedAt, deletedAt',
      categories: 'id, userId, spaceId, type, sortOrder, updatedAt, deletedAt',
      transactions: 'id, userId, spaceId, type, categoryId, date, recurrenceId, updatedAt, deletedAt',
      recurrences: 'id, userId, spaceId, nextDate, active, updatedAt, deletedAt',
      budgets: 'id, userId, spaceId, month, categoryId, updatedAt, deletedAt',
      savings_goals: 'id, userId, spaceId, updatedAt, deletedAt',
      goal_movements: 'id, goalId, userId, spaceId, date, updatedAt, deletedAt',
      trips: 'id, userId, spaceId, startDate, goalId, updatedAt, deletedAt',
      trip_items: 'id, tripId, spaceId, part, updatedAt, deletedAt'
    });
  }
}

export const db = new LibertyBagDB();
