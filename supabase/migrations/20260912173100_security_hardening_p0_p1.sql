-- MARCENAPP SECURITY HARDENING P0/P1
-- Intentionally additive/reversible. This migration is NOT applied by this branch.

-- Child project records must be anchored to a project owned by the caller.
-- This closes cross-tenant relation injection, especially project_share_links.

DROP POLICY IF EXISTS project_cost_delete_own ON public.project_cost_snapshots;
DROP POLICY IF EXISTS project_cost_select_own ON public.project_cost_snapshots;
DROP POLICY IF EXISTS project_cost_insert_own ON public.project_cost_snapshots;
DROP POLICY IF EXISTS project_cost_update_own ON public.project_cost_snapshots;
CREATE POLICY project_cost_select_own ON public.project_cost_snapshots FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_cost_snapshots.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_cost_insert_own ON public.project_cost_snapshots FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_cost_snapshots.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_cost_update_own ON public.project_cost_snapshots FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_cost_snapshots.project_id AND p.user_id = (select auth.uid())))
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_cost_snapshots.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_cost_delete_own ON public.project_cost_snapshots FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_cost_snapshots.project_id AND p.user_id = (select auth.uid())));

DROP POLICY IF EXISTS project_expenses_delete_own ON public.project_expenses;
DROP POLICY IF EXISTS project_expenses_select_own ON public.project_expenses;
DROP POLICY IF EXISTS project_expenses_insert_own ON public.project_expenses;
DROP POLICY IF EXISTS project_expenses_update_own ON public.project_expenses;
CREATE POLICY project_expenses_select_own ON public.project_expenses FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_expenses.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_expenses_insert_own ON public.project_expenses FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_expenses.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_expenses_update_own ON public.project_expenses FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_expenses.project_id AND p.user_id = (select auth.uid())))
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_expenses.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_expenses_delete_own ON public.project_expenses FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_expenses.project_id AND p.user_id = (select auth.uid())));

DROP POLICY IF EXISTS project_hardware_requirements_delete_own ON public.project_hardware_requirements;
DROP POLICY IF EXISTS project_hardware_requirements_select_own ON public.project_hardware_requirements;
DROP POLICY IF EXISTS project_hardware_requirements_insert_own ON public.project_hardware_requirements;
DROP POLICY IF EXISTS project_hardware_requirements_update_own ON public.project_hardware_requirements;
CREATE POLICY project_hardware_requirements_select_own ON public.project_hardware_requirements FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hardware_requirements.project_id AND p.user_id = (select auth.uid())) AND EXISTS (SELECT 1 FROM public.hardware_items h WHERE h.id = project_hardware_requirements.hardware_id AND h.user_id = (select auth.uid())));
CREATE POLICY project_hardware_requirements_insert_own ON public.project_hardware_requirements FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hardware_requirements.project_id AND p.user_id = (select auth.uid())) AND EXISTS (SELECT 1 FROM public.hardware_items h WHERE h.id = project_hardware_requirements.hardware_id AND h.user_id = (select auth.uid())));
CREATE POLICY project_hardware_requirements_update_own ON public.project_hardware_requirements FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hardware_requirements.project_id AND p.user_id = (select auth.uid())) AND EXISTS (SELECT 1 FROM public.hardware_items h WHERE h.id = project_hardware_requirements.hardware_id AND h.user_id = (select auth.uid())))
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hardware_requirements.project_id AND p.user_id = (select auth.uid())) AND EXISTS (SELECT 1 FROM public.hardware_items h WHERE h.id = project_hardware_requirements.hardware_id AND h.user_id = (select auth.uid())));
CREATE POLICY project_hardware_requirements_delete_own ON public.project_hardware_requirements FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hardware_requirements.project_id AND p.user_id = (select auth.uid())) AND EXISTS (SELECT 1 FROM public.hardware_items h WHERE h.id = project_hardware_requirements.hardware_id AND h.user_id = (select auth.uid())));

DROP POLICY IF EXISTS project_production_stages_delete_own ON public.project_production_stages;
DROP POLICY IF EXISTS project_production_stages_select_own ON public.project_production_stages;
DROP POLICY IF EXISTS project_production_stages_insert_own ON public.project_production_stages;
DROP POLICY IF EXISTS project_production_stages_update_own ON public.project_production_stages;
CREATE POLICY project_production_stages_select_own ON public.project_production_stages FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_production_stages.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_production_stages_insert_own ON public.project_production_stages FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_production_stages.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_production_stages_update_own ON public.project_production_stages FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_production_stages.project_id AND p.user_id = (select auth.uid())))
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_production_stages.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_production_stages_delete_own ON public.project_production_stages FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_production_stages.project_id AND p.user_id = (select auth.uid())));

DROP POLICY IF EXISTS project_receivables_delete_own ON public.project_receivables;
DROP POLICY IF EXISTS project_receivables_select_own ON public.project_receivables;
DROP POLICY IF EXISTS project_receivables_insert_own ON public.project_receivables;
DROP POLICY IF EXISTS project_receivables_update_own ON public.project_receivables;
CREATE POLICY project_receivables_select_own ON public.project_receivables FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_receivables.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_receivables_insert_own ON public.project_receivables FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_receivables.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_receivables_update_own ON public.project_receivables FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_receivables.project_id AND p.user_id = (select auth.uid())))
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_receivables.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_receivables_delete_own ON public.project_receivables FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_receivables.project_id AND p.user_id = (select auth.uid())));

DROP POLICY IF EXISTS project_sales_delete_own ON public.project_sales;
DROP POLICY IF EXISTS project_sales_select_own ON public.project_sales;
DROP POLICY IF EXISTS project_sales_insert_own ON public.project_sales;
DROP POLICY IF EXISTS project_sales_update_own ON public.project_sales;
CREATE POLICY project_sales_select_own ON public.project_sales FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sales.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_sales_insert_own ON public.project_sales FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sales.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_sales_update_own ON public.project_sales FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sales.project_id AND p.user_id = (select auth.uid())))
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sales.project_id AND p.user_id = (select auth.uid())));
CREATE POLICY project_sales_delete_own ON public.project_sales FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sales.project_id AND p.user_id = (select auth.uid())));

DROP POLICY IF EXISTS contracts_owner_all ON public.project_contracts;
CREATE POLICY contracts_owner_all ON public.project_contracts FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_contracts.project_id AND p.user_id = (select auth.uid())))
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_contracts.project_id AND p.user_id = (select auth.uid())));

-- Share links are a privileged cross-boundary object because their token grants public access.
DROP POLICY IF EXISTS project_share_links_owner_all ON public.project_share_links;
CREATE POLICY project_share_links_owner_all ON public.project_share_links FOR ALL TO authenticated
  USING (
    (select auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_share_links.project_id AND p.user_id = (select auth.uid()))
    AND EXISTS (SELECT 1 FROM public.project_versions v WHERE v.id = project_share_links.project_version_id AND v.project_id = project_share_links.project_id)
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_share_links.project_id AND p.user_id = (select auth.uid()))
    AND EXISTS (SELECT 1 FROM public.project_versions v WHERE v.id = project_share_links.project_version_id AND v.project_id = project_share_links.project_id AND v.user_id = (select auth.uid()))
  );

-- Least privilege for RPCs that are not intentionally public share-link endpoints.
REVOKE EXECUTE ON FUNCTION public.merge_iara_context(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_iara_project_context(uuid,uuid,text,jsonb,jsonb,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_iara_context_scope(uuid,uuid,uuid,uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_project_plan_environment_suggestion(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_gamification_activity(uuid,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_agent_registry_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- is_admin_user is used by RLS and admin RPCs, but callers must not be able to probe another user's admin status.
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  select
    case
      when auth.uid() is null then false
      when p_user_id is distinct from auth.uid()
           and current_setting('request.jwt.claim.role', true) <> 'service_role' then false
      else exists (
        select 1
        from public.user_roles ur
        join auth.users u on u.id = ur.user_id
        where ur.user_id = p_user_id
          and ur.role = 'admin'::public.app_role
          and lower(coalesce(u.email, '')) = 'marcenapp.ia@gmail.com'
      )
    end;
$function$;

-- Protect future public functions from becoming callable by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
