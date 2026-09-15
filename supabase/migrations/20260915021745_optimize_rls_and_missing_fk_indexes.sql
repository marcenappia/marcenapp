-- Performance hardening verified against the production database advisors.
DROP POLICY IF EXISTS "agent registry writable by admins" ON public.agent_registry;
CREATE POLICY "agent registry writable by admins" ON public.agent_registry
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin_user((select auth.uid()))));
CREATE POLICY "agent registry writable by admins update" ON public.agent_registry
  FOR UPDATE TO authenticated
  USING ((select public.is_admin_user((select auth.uid()))))
  WITH CHECK ((select public.is_admin_user((select auth.uid()))));
CREATE POLICY "agent registry writable by admins delete" ON public.agent_registry
  FOR DELETE TO authenticated
  USING ((select public.is_admin_user((select auth.uid()))));

DROP POLICY IF EXISTS "gamification_profiles_self" ON public.gamification_profiles;

DROP POLICY IF EXISTS "approvals_owner_select" ON public.project_approvals;
CREATE POLICY "approvals_owner_select" ON public.project_approvals
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_approvals.project_id AND p.user_id = (select auth.uid())))
    AND ((environment_id IS NULL) OR EXISTS (SELECT 1 FROM public.project_environments e WHERE e.id = project_approvals.environment_id AND e.project_id = project_approvals.project_id))
    AND (EXISTS (SELECT 1 FROM public.project_versions v WHERE v.id = project_approvals.project_version_id AND v.project_id = project_approvals.project_id AND ((v.environment_id IS NULL) OR (v.environment_id = project_approvals.environment_id))))
  );

CREATE INDEX IF NOT EXISTS idx_marcenaria_documentos_user_id ON public.marcenaria_documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_marcenaria_estoque_material_id ON public.marcenaria_estoque(material_id);
CREATE INDEX IF NOT EXISTS idx_marcenaria_estoque_user_id ON public.marcenaria_estoque(user_id);
CREATE INDEX IF NOT EXISTS idx_marcenaria_fornecedores_user_id ON public.marcenaria_fornecedores(user_id);
CREATE INDEX IF NOT EXISTS idx_marcenaria_materiais_user_id ON public.marcenaria_materiais(user_id);
