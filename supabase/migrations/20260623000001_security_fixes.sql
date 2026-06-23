11-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION DE SEGURANÇA — SorteBIT v2.3.1
-- Corrige políticas RLS identificadas na revisão de segurança via MCP
-- Data: 2026-06-23
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. admin_user ────────────────────────────────────────────────────────────
-- PROBLEMA: Policy "Permitir leitura pública de administradores" usa USING (true)
-- expondo dados de admins (email, role) para qualquer visitante não autenticado.
DROP POLICY IF EXISTS "Permitir leitura pública de administradores" ON public.admin_user;

-- Só usuários autenticados que são eles próprios, ou o próprio admin, podem ler
CREATE POLICY "Admin pode ler seu proprio registro"
ON public.admin_user FOR SELECT
TO authenticated
USING (
  (select auth.email()) = email
  OR
  EXISTS (
    SELECT 1 FROM public.admin_user a2
    WHERE a2.email = (select auth.email())
    AND a2.role = 'admin'
  )
);

-- ── 2. estudantes ────────────────────────────────────────────────────────────
-- PROBLEMA: Policy SELECT com USING (true) expõe dados de TODOS os alunos
-- (nome, CPF, email, bitcash) para qualquer pessoa não autenticada.
DROP POLICY IF EXISTS "Permitir leitura por CPF" ON public.estudantes;

-- Alunos autenticados só leem seus próprios dados; admins leem tudo
CREATE POLICY "Estudante lê seus próprios dados"
ON public.estudantes FOR SELECT
TO authenticated
USING (
  (select auth.email()) = email
  OR EXISTS (
    SELECT 1 FROM public.admin_user a
    WHERE a.email = (select auth.email()) AND a.role = 'admin'
  )
);

-- PROBLEMA: UPDATE com USING (true) — qualquer autenticado pode alterar qualquer aluno
DROP POLICY IF EXISTS "Permitir atualizacao de estudantes" ON public.estudantes;

CREATE POLICY "Estudante atualiza seus próprios dados"
ON public.estudantes FOR UPDATE
TO authenticated
USING ((select auth.email()) = email)
WITH CHECK ((select auth.email()) = email);

-- ── 3. lottery_participations ────────────────────────────────────────────────
-- PROBLEMA: "Permitir leitura publica de participantes" com USING (true)
-- expõe nome, telefone e turma de todos os participantes para qualquer um.
DROP POLICY IF EXISTS "Permitir leitura publica de participantes" ON public.lottery_participations;
DROP POLICY IF EXISTS "Admins can view participations" ON public.lottery_participations;

-- Apenas admins podem ler participações
CREATE POLICY "Admins leem participações"
ON public.lottery_participations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user a
    WHERE a.email = (select auth.email()) AND a.role = 'admin'
  )
);

-- ── 4. feedbacks ─────────────────────────────────────────────────────────────
-- PROBLEMA: "Permitir atualizacao publica de feedbacks" com USING (true)
-- qualquer não-autenticado pode modificar feedbacks de outros usuários.
DROP POLICY IF EXISTS "Permitir atualizacao publica de feedbacks" ON public.feedbacks;

CREATE POLICY "Admins atualizam feedbacks"
ON public.feedbacks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user a
    WHERE a.email = (select auth.email()) AND a.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_user a
    WHERE a.email = (select auth.email()) AND a.role = 'admin'
  )
);

-- ── 5. Corrigir auth.uid() → (select auth.uid()) para performance ────────────
-- Atualiza as policies existentes nas tabelas com migrations oficiais
-- para usar o padrão com subquery que é avaliado uma vez por query.

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'))
WITH CHECK (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins can insert codes" ON public.student_codes;
CREATE POLICY "Admins can insert codes"
ON public.student_codes FOR INSERT
TO authenticated
WITH CHECK (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins can delete codes" ON public.student_codes;
CREATE POLICY "Admins can delete codes"
ON public.student_codes FOR DELETE
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'));
