create index if not exists chat_messages_environment_project_fk_idx on public.chat_messages(environment_id, project_id);
create index if not exists chat_messages_version_project_environment_fk_idx on public.chat_messages(version_id, project_id, environment_id);
create index if not exists diario_entradas_environment_project_fk_idx on public.diario_entradas(environment_id, project_id);
create index if not exists project_approvals_version_project_fk_idx on public.project_approvals(project_version_id, project_id);
create index if not exists project_approvals_version_environment_fk_idx on public.project_approvals(project_version_id, project_id, environment_id);
create index if not exists project_versions_environment_project_fk_idx on public.project_versions(environment_id, project_id);
create index if not exists project_iara_contexts_client_fk_idx on public.project_iara_contexts(client_id);
create index if not exists project_iara_contexts_environment_project_fk_idx on public.project_iara_contexts(environment_id, project_id);
create index if not exists project_iara_contexts_project_client_fk_idx on public.project_iara_contexts(project_id, client_id);
create index if not exists project_iara_contexts_version_project_environment_fk_idx on public.project_iara_contexts(version_id, project_id, environment_id);
create index if not exists project_plan_analyses_plan_project_fk_idx on public.project_plan_analyses(project_plan_id, project_id);
create index if not exists project_plan_environment_suggestions_confirmed_environment_fk_idx on public.project_plan_environment_suggestions(confirmed_environment_id);
create index if not exists project_plan_environment_suggestions_analysis_project_fk_idx on public.project_plan_environment_suggestions(analysis_id, project_id);
create index if not exists project_plan_environment_suggestions_plan_project_fk_idx on public.project_plan_environment_suggestions(project_plan_id, project_id);

-- The domain policies use initplan-safe auth evaluation for scale.
drop policy if exists project_environments_owner_all on public.project_environments;
create policy project_environments_owner_all on public.project_environments for all to authenticated using(exists(select 1 from public.projects p where p.id=project_environments.project_id and p.user_id=(select auth.uid()))) with check(exists(select 1 from public.projects p where p.id=project_environments.project_id and p.user_id=(select auth.uid())));
drop policy if exists project_plans_owner_all on public.project_plans;
create policy project_plans_owner_all on public.project_plans for all to authenticated using(exists(select 1 from public.projects p where p.id=project_plans.project_id and p.user_id=(select auth.uid()))) with check(exists(select 1 from public.projects p where p.id=project_plans.project_id and p.user_id=(select auth.uid())));
drop policy if exists project_plan_analyses_owner_all on public.project_plan_analyses;
create policy project_plan_analyses_owner_all on public.project_plan_analyses for all to authenticated using(exists(select 1 from public.projects p where p.id=project_plan_analyses.project_id and p.user_id=(select auth.uid()))) with check(exists(select 1 from public.projects p where p.id=project_plan_analyses.project_id and p.user_id=(select auth.uid())));
drop policy if exists project_plan_environment_suggestions_owner_all on public.project_plan_environment_suggestions;
create policy project_plan_environment_suggestions_owner_all on public.project_plan_environment_suggestions for all to authenticated using(exists(select 1 from public.projects p where p.id=project_plan_environment_suggestions.project_id and p.user_id=(select auth.uid()))) with check(exists(select 1 from public.projects p where p.id=project_plan_environment_suggestions.project_id and p.user_id=(select auth.uid())));
drop policy if exists project_iara_contexts_owner_all on public.project_iara_contexts;
create policy project_iara_contexts_owner_all on public.project_iara_contexts for all to authenticated using(user_id=(select auth.uid()) and ((project_id is null and client_id is null) or (client_id is not null and exists(select 1 from public.clientes c where c.id=project_iara_contexts.client_id and c.user_id=(select auth.uid()))) or (project_id is not null and exists(select 1 from public.projects p where p.id=project_iara_contexts.project_id and p.user_id=(select auth.uid()))))) with check(user_id=(select auth.uid()) and ((project_id is null and client_id is null) or (client_id is not null and exists(select 1 from public.clientes c where c.id=project_iara_contexts.client_id and c.user_id=(select auth.uid()))) or (project_id is not null and exists(select 1 from public.projects p where p.id=project_iara_contexts.project_id and p.user_id=(select auth.uid())))));
drop policy if exists project_versions_owner_all on public.project_versions;
create policy project_versions_owner_all on public.project_versions for all to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_versions.project_id and p.user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_versions.project_id and p.user_id=(select auth.uid())));
