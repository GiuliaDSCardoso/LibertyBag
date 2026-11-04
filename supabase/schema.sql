-- =============================================================================
-- LIBERTYBAG — SCHEMA COMPLETO DO BANCO NO SUPABASE (FASE 3)
-- Como usar:
-- 1. Abra o seu projeto "LibertyBag" no painel do Supabase (https://supabase.com/dashboard/project/nrakzeaqgrreeoqwadqj/sql/new)
-- 2. Cole TODO este arquivo e clique no botão verde "Run"
-- =============================================================================

-- 1. Tabela de Perfis de Usuários
create table if not exists public.users (
  id text primary key,
  "authUserId" uuid references auth.users(id) on delete set null,
  name text not null default '',
  email text not null default '',
  "emailVerified" boolean not null default false,
  "verificationCode" text,
  "verificationExpiresAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

alter table public.users add column if not exists "emailVerified" boolean not null default false;
alter table public.users add column if not exists "verificationCode" text;
alter table public.users add column if not exists "verificationExpiresAt" text;

-- 1b. Tabela de Códigos de Verificação de 6 Dígitos (EmailJS + Confirmação por Link/Código)
create table if not exists public.auth_verifications (
  email text primary key,
  name text not null default '',
  code text not null,
  "expiresAt" text not null,
  verified boolean not null default false,
  "updatedAt" text not null
);

-- 2. Tabela de Espaços (Pessoal ou Compartilhado: ex. Você + Mãe, Você + Namorado)
create table if not exists public.spaces (
  id text primary key,
  name text not null,
  type text not null check (type in ('pessoal', 'compartilhado')),
  "inviteCode" text unique,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 3. Membros de cada Espaço
create table if not exists public.space_members (
  id text primary key,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  "userId" text not null,
  "authUserId" uuid default auth.uid(),
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

create index if not exists idx_space_members_space on public.space_members("spaceId");
create index if not exists idx_space_members_auth on public.space_members("authUserId");

-- 4. Contas / Carteiras
create table if not exists public.accounts (
  id text primary key,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  name text not null,
  type text not null,
  "isDefault" boolean default false,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 5. Categorias
create table if not exists public.categories (
  id text primary key,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  type text not null check (type in ('entrada', 'saida')),
  "sortOrder" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 6. Lançamentos (Transactions — sempre em centavos inteiros!)
create table if not exists public.transactions (
  id text primary key,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  "amountCents" bigint not null,
  type text not null check (type in ('entrada', 'saida')),
  "categoryId" text not null,
  date text not null,
  description text not null default '',
  "paymentMethod" text,
  "recurrenceId" text,
  installment jsonb,
  origin text not null default 'manual',
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

create index if not exists idx_transactions_space_date on public.transactions("spaceId", date);

-- 7. Contas Recorrentes (Recurrences)
create table if not exists public.recurrences (
  id text primary key,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  rule text not null default 'mensal',
  "nextDate" text not null,
  active boolean not null default true,
  "templateTitle" text not null,
  "amountCents" bigint not null,
  "categoryId" text not null,
  type text not null check (type in ('entrada', 'saida')),
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 8. Quanto posso gastar (Budgets)
create table if not exists public.budgets (
  id text primary key,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  month text not null,
  "categoryId" text,
  "plannedCents" bigint not null,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 9. Cofrinhos (Savings Goals)
create table if not exists public.savings_goals (
  id text primary key,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  name text not null,
  "targetCents" bigint not null,
  deadline text,
  "savedCents" bigint not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 10. Movimentos dos Cofrinhos (Goal Movements)
create table if not exists public.goal_movements (
  id text primary key,
  "goalId" text not null references public.savings_goals(id) on delete cascade,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  "amountCents" bigint not null,
  date text not null,
  note text,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 11. Viagens (Trips)
create table if not exists public.trips (
  id text primary key,
  "userId" text not null,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  name text not null,
  destination text not null,
  "startDate" text not null,
  "endDate" text not null,
  "goalId" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- 12. Partes da Viagem (Trip Items)
create table if not exists public.trip_items (
  id text primary key,
  "tripId" text not null references public.trips(id) on delete cascade,
  "spaceId" text not null references public.spaces(id) on delete cascade,
  part text not null check (part in ('passagem', 'hospedagem', 'comida', 'passeios', 'extras')),
  "plannedCents" bigint not null default 0,
  "spentCents" bigint not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — Habilitado em todas as tabelas
-- =============================================================================

alter table public.users enable row level security;
alter table public.auth_verifications enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurrences enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_movements enable row level security;
alter table public.trips enable row level security;
alter table public.trip_items enable row level security;

-- Políticas compatíveis com Publishable Key (anon + authenticated) já que a verificação de 6 dígitos é feita via EmailJS
drop policy if exists "users_own_access" on public.users;
create policy "users_own_access" on public.users
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "auth_verifications_public_access" on public.auth_verifications;
create policy "auth_verifications_public_access" on public.auth_verifications
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "spaces_member_access" on public.spaces;
create policy "spaces_member_access" on public.spaces
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "space_members_access" on public.space_members;
create policy "space_members_access" on public.space_members
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "accounts_space_access" on public.accounts;
create policy "accounts_space_access" on public.accounts
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "categories_space_access" on public.categories;
create policy "categories_space_access" on public.categories
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "transactions_space_access" on public.transactions;
create policy "transactions_space_access" on public.transactions
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "recurrences_space_access" on public.recurrences;
create policy "recurrences_space_access" on public.recurrences
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "budgets_space_access" on public.budgets;
create policy "budgets_space_access" on public.budgets
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "savings_goals_space_access" on public.savings_goals;
create policy "savings_goals_space_access" on public.savings_goals
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "goal_movements_space_access" on public.goal_movements;
create policy "goal_movements_space_access" on public.goal_movements
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "trips_space_access" on public.trips;
create policy "trips_space_access" on public.trips
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "trip_items_space_access" on public.trip_items;
create policy "trip_items_space_access" on public.trip_items
  for all to anon, authenticated
  using (true)
  with check (true);
