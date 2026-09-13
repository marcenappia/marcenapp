-- MarcenApp P1 security hardening.
-- Incremental and non-destructive: no data/table/policy drops.

-- Share-link client RPCs intentionally remain callable by anon because the bearer token
-- authorizes the specific project/version. No table grants are exposed to anon.
revoke execute on function public.client_approve_project(text,text,text,jsonb) from public;
revoke execute on function public.client_request_project_change(text,text,text,text,text,text,text,text) from public;
revoke execute on function public.client_review_project(text) from public;
grant execute on function public.client_approve_project(text,text,text,jsonb) to anon, authenticated, service_role;
grant execute on function public.client_request_project_change(text,text,text,text,text,text,text,text) to anon, authenticated, service_role;
grant execute on function public.client_review_project(text) to anon, authenticated, service_role;

-- Gamification is authenticated-only; the function body already requires auth.uid() = p_user_id.
revoke execute on function public.register_gamification_activity(uuid,integer) from public;
grant execute on function public.register_gamification_activity(uuid,integer) to authenticated, service_role;

-- Administrative/owner RPCs are not public APIs. Existing body-level authorization remains.
revoke execute on function public.admin_list_billing_credit_rules() from public;
revoke execute on function public.admin_upsert_billing_credit_rule(text,text,integer,boolean,integer,boolean) from public;
revoke execute on function public.create_project_version_and_share(uuid,jsonb,text,text,text,jsonb,text,timestamptz) from public;
revoke execute on function public.is_admin_user(uuid) from public;
revoke execute on function public.refresh_project_financial_alerts(uuid) from public;
revoke execute on function public.refresh_project_hardware_alerts(uuid) from public;
revoke execute on function public.refresh_project_operational_alerts(uuid) from public;
revoke execute on function public.refresh_project_production_alerts(uuid) from public;
grant execute on function public.admin_list_billing_credit_rules() to authenticated, service_role;
grant execute on function public.admin_upsert_billing_credit_rule(text,text,integer,boolean,integer,boolean) to authenticated, service_role;
grant execute on function public.create_project_version_and_share(uuid,jsonb,text,text,text,jsonb,text,timestamptz) to authenticated, service_role;
grant execute on function public.is_admin_user(uuid) to authenticated, service_role;
grant execute on function public.refresh_project_financial_alerts(uuid) to authenticated, service_role;
grant execute on function public.refresh_project_hardware_alerts(uuid) to authenticated, service_role;
grant execute on function public.refresh_project_operational_alerts(uuid) to authenticated, service_role;
grant execute on function public.refresh_project_production_alerts(uuid) to authenticated, service_role;

-- Self-authorization probe only: callers cannot use this RPC to query another user's role.
create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when auth.uid() is null or auth.uid() <> p_user_id then false
    else exists (
      select 1
      from public.user_roles ur
      join auth.users u on u.id = ur.user_id
      where ur.user_id = p_user_id
        and ur.role = 'admin'::public.app_role
        and lower(coalesce(u.email, '')) = 'marcenapp.ia@gmail.com'
    )
  end;
$$;

-- These five tables currently grant no table privileges to anon/authenticated and are
-- consumed by privileged backend/admin paths. RLS stays enabled with no generic user
-- policy; adding one would create an access path merely to silence the advisor.
comment on table public.admin_cost_rates is
  'Internal/admin-only cost-rate data. RLS enabled; no anon/authenticated policies by design.';
comment on table public.ai_rate_limits is
  'Internal AI rate-limit state. RLS enabled; no anon/authenticated policies by design.';
comment on table public.asaas_webhook_events is
  'Internal payment webhook event log. RLS enabled; no anon/authenticated policies by design.';
comment on table public.billing_credit_consumptions is
  'Internal billing credit consumption ledger. RLS enabled; no anon/authenticated policies by design.';
comment on table public.billing_credit_rules is
  'Internal billing credit rules. RLS enabled; no anon/authenticated policies by design; admin access is via admin RPCs.';
