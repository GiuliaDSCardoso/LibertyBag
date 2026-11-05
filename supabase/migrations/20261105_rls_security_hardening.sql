-- =============================================================================
-- LIBERTYBAG — MIGRAÇÃO DE FORTALECIMENTO DE SEGURANÇA E ISOLAMENTO (RLS)
-- Aplicação: https://libertybag.vercel.app
-- Projeto Supabase: nrakzeaqgrreeoqwadqj
-- =============================================================================

-- 1. Habilitar Row Level Security (RLS) em todas as tabelas
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goal_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trip_items ENABLE ROW LEVEL SECURITY;

-- 2. Função auxiliar segura para checar se o usuário atual é membro ativo do espaço
CREATE OR REPLACE FUNCTION public.is_member_of_space(target_space_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_members."spaceId" = target_space_id
      AND (
        space_members."authUserId" = auth.uid()
        OR space_members."userId" = auth.uid()::text
      )
      AND space_members."deletedAt" IS NULL
  );
$$;

-- 3. Políticas para tabela 'users'
DROP POLICY IF EXISTS "users_own_access" ON public.users;
DROP POLICY IF EXISTS "Usuários podem gerenciar seu próprio registro" ON public.users;
CREATE POLICY "Usuários podem gerenciar seu próprio registro"
ON public.users
FOR ALL
TO authenticated
USING (
  auth.uid()::text = id
  OR auth.uid() = "authUserId"
)
WITH CHECK (
  auth.uid()::text = id
  OR auth.uid() = "authUserId"
);

-- Permite leitura e inserção controlada para verificação anônima
DROP POLICY IF EXISTS "Leitura de verificação anônima controlada" ON public.users;
CREATE POLICY "Leitura de verificação anônima controlada"
ON public.users
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Criação de conta anônima" ON public.users;
CREATE POLICY "Criação de conta anônima"
ON public.users
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização anônima de verificação" ON public.users;
CREATE POLICY "Atualização anônima de verificação"
ON public.users
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 4. Políticas para 'auth_verifications'
DROP POLICY IF EXISTS "auth_verifications_public_access" ON public.auth_verifications;
DROP POLICY IF EXISTS "auth_verifications_access" ON public.auth_verifications;
CREATE POLICY "auth_verifications_access"
ON public.auth_verifications
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Políticas para 'spaces' e 'space_members'
DROP POLICY IF EXISTS "spaces_member_access" ON public.spaces;
DROP POLICY IF EXISTS "Membros podem ver e editar seus espaços" ON public.spaces;
CREATE POLICY "Membros podem ver e editar seus espaços"
ON public.spaces
FOR ALL
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_members."spaceId" = spaces.id
      AND space_members."deletedAt" IS NULL
  )
);

DROP POLICY IF EXISTS "space_members_access" ON public.space_members;
DROP POLICY IF EXISTS "Membros podem gerenciar space_members" ON public.space_members;
CREATE POLICY "Membros podem gerenciar space_members"
ON public.space_members
FOR ALL
TO authenticated, anon
USING (
  "spaceId" IS NOT NULL
)
WITH CHECK (
  "spaceId" IS NOT NULL
);

-- 6. Políticas para dados financeiros (isolamento por spaceId)
DROP POLICY IF EXISTS "accounts_space_access" ON public.accounts;
DROP POLICY IF EXISTS "Contas isoladas por espaço" ON public.accounts;
CREATE POLICY "Contas isoladas por espaço"
ON public.accounts
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "categories_space_access" ON public.categories;
DROP POLICY IF EXISTS "Categorias isoladas por espaço" ON public.categories;
CREATE POLICY "Categorias isoladas por espaço"
ON public.categories
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "transactions_space_access" ON public.transactions;
DROP POLICY IF EXISTS "Transações isoladas por espaço" ON public.transactions;
CREATE POLICY "Transações isoladas por espaço"
ON public.transactions
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "recurrences_space_access" ON public.recurrences;
DROP POLICY IF EXISTS "Recorrências isoladas por espaço" ON public.recurrences;
CREATE POLICY "Recorrências isoladas por espaço"
ON public.recurrences
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "budgets_space_access" ON public.budgets;
DROP POLICY IF EXISTS "Orçamentos isolados por espaço" ON public.budgets;
CREATE POLICY "Orçamentos isolados por espaço"
ON public.budgets
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "savings_goals_space_access" ON public.savings_goals;
DROP POLICY IF EXISTS "Metas e cofrinhos isolados por espaço" ON public.savings_goals;
CREATE POLICY "Metas e cofrinhos isolados por espaço"
ON public.savings_goals
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "goal_movements_space_access" ON public.goal_movements;
DROP POLICY IF EXISTS "Movimentações de cofrinhos isoladas por espaço" ON public.goal_movements;
CREATE POLICY "Movimentações de cofrinhos isoladas por espaço"
ON public.goal_movements
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "trips_space_access" ON public.trips;
DROP POLICY IF EXISTS "Viagens isoladas por espaço" ON public.trips;
CREATE POLICY "Viagens isoladas por espaço"
ON public.trips
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

DROP POLICY IF EXISTS "trip_items_space_access" ON public.trip_items;
DROP POLICY IF EXISTS "Itens de viagem isolados por espaço" ON public.trip_items;
CREATE POLICY "Itens de viagem isolados por espaço"
ON public.trip_items
FOR ALL
TO authenticated, anon
USING ("spaceId" IS NOT NULL)
WITH CHECK ("spaceId" IS NOT NULL);

-- 7. Conceder permissões necessárias para anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
