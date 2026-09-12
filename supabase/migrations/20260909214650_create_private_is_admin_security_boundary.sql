-- Establish the private administrative security boundary before migrations
-- that reference private.is_admin(). This keeps a clean local database
-- self-contained and preserves the existing role-based admin model.
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'::public.app_role
  );
$$;

-- The function is intentionally callable by authenticated sessions because it
-- is used inside authenticated RLS policies. No anonymous/public execution or
-- schema creation is granted.
revoke all on schema private from public;
grant usage on schema private to authenticated;

revoke all on function private.is_admin() from public, anon, authenticated, service_role;
grant execute on function private.is_admin() to authenticated;
