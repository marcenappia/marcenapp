drop policy if exists "Users manage own clientes" on public.clientes;
drop policy if exists "admins can read clientes" on public.clientes;
create policy "clientes_select_own_or_admin" on public.clientes for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "clientes_manage_own" on public.clientes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "clientes_update_own" on public.clientes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "clientes_delete_own" on public.clientes for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users manage own orchestrator runs" on public.orchestrator_runs;
drop policy if exists "admins can read orchestrator runs" on public.orchestrator_runs;
create policy "orchestrator_runs_select_own_or_admin" on public.orchestrator_runs for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "orchestrator_runs_insert_own" on public.orchestrator_runs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "orchestrator_runs_update_own" on public.orchestrator_runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "orchestrator_runs_delete_own" on public.orchestrator_runs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "admins can read profiles" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own profile" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own projects" on public.projects;
drop policy if exists "admins can read projects" on public.projects;
create policy "projects_select_own_or_admin" on public.projects for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));

drop policy if exists "admins can read user roles" on public.user_roles;
drop policy if exists "users can read own roles" on public.user_roles;
create policy "user_roles_select_own_or_admin" on public.user_roles for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));
