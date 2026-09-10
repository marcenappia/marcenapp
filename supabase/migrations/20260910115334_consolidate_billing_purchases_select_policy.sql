drop policy if exists billing_purchases_select_admin on public.billing_purchases;
drop policy if exists billing_purchases_select_own on public.billing_purchases;
create policy billing_purchases_select_access on public.billing_purchases
  for select to authenticated
  using (public.is_admin_user((select auth.uid())) or (select auth.uid()) = user_id);
