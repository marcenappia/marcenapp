alter view public.admin_cost_engine_monthly set (security_invoker = true);
alter view public.admin_cost_engine_by_service set (security_invoker = true);
alter view public.admin_cost_engine_by_user set (security_invoker = true);

drop policy if exists admin_cost_usage_select_admin on public.admin_cost_usage;
create policy admin_cost_usage_select_admin on public.admin_cost_usage
  for select to authenticated
  using (public.is_admin_user((select auth.uid())));

drop policy if exists billing_purchases_select_admin on public.billing_purchases;
create policy billing_purchases_select_admin on public.billing_purchases
  for select to authenticated
  using (public.is_admin_user((select auth.uid())));

revoke all on public.admin_cost_engine_monthly from anon, authenticated;
revoke all on public.admin_cost_engine_by_service from anon, authenticated;
revoke all on public.admin_cost_engine_by_user from anon, authenticated;
grant select on public.admin_cost_engine_monthly, public.admin_cost_engine_by_service, public.admin_cost_engine_by_user to authenticated;
