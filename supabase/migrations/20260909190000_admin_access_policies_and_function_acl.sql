-- Administrative read access is explicitly role-gated through private.is_admin().
drop policy if exists "admins can read profiles" on public.profiles;
create policy "admins can read profiles" on public.profiles for select to authenticated using ((select private.is_admin()));

drop policy if exists "admins can read projects" on public.projects;
create policy "admins can read projects" on public.projects for select to authenticated using ((select private.is_admin()));

drop policy if exists "admins can read clientes" on public.clientes;
create policy "admins can read clientes" on public.clientes for select to authenticated using ((select private.is_admin()));

drop policy if exists "admins can read user roles" on public.user_roles;
create policy "admins can read user roles" on public.user_roles for select to authenticated using ((select private.is_admin()));

drop policy if exists "admins can read orchestrator runs" on public.orchestrator_runs;
create policy "admins can read orchestrator runs" on public.orchestrator_runs for select to authenticated using ((select private.is_admin()));

-- These SECURITY DEFINER routines are backend/trigger-only. They must not be callable through PostgREST by anon/authenticated users.
revoke execute on function public.create_marcenapp_trial() from anon, authenticated;
revoke execute on function public.grant_billing_credits(uuid, text, integer) from anon, authenticated;
grant execute on function public.grant_billing_credits(uuid, text, integer) to service_role;
