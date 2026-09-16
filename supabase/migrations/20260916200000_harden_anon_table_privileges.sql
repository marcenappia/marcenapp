-- Security hardening: anon must not receive direct CRUD privileges on internal tables.
-- Public pricing remains readable for the unauthenticated landing page.
do $$
declare
  r record;
begin
  for r in
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  loop
    execute format('revoke all privileges on table %I.%I from anon', r.table_schema, r.table_name);
  end loop;

  grant select on table public.billing_plans to anon;
  grant select on table public.billing_credit_products to anon;
end
$$;
