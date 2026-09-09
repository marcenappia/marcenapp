-- Prevent client-side users from forging or changing billing customer mappings.
-- The Asaas Edge Function owns these mappings and runs with server-side privileges.

drop policy if exists billing_customers_insert_own on public.billing_customers;
drop policy if exists billing_customers_update_own on public.billing_customers;
drop policy if exists billing_customers_delete_own on public.billing_customers;

revoke insert, update, delete on public.billing_customers from anon, authenticated;
grant select on public.billing_customers to authenticated;
