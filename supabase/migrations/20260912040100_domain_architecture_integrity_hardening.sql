-- Domain integrity hardening for Cliente -> Projeto -> Ambiente -> Versao -> IARA.
alter table public.projects add constraint projects_id_cliente_key unique (id, cliente_id);
alter table public.project_iara_contexts add constraint project_iara_contexts_project_client_fk foreign key (project_id, client_id) references public.projects(id, cliente_id) on delete cascade;

alter table public.project_plans add constraint project_plans_id_project_key unique (id, project_id);
alter table public.project_plan_analyses add constraint project_plan_analyses_id_project_key unique (id, project_id);
alter table public.project_plan_analyses add constraint project_plan_analyses_plan_project_fk foreign key (project_plan_id, project_id) references public.project_plans(id, project_id) on delete cascade;
alter table public.project_plan_environment_suggestions add constraint project_plan_environment_suggestions_plan_project_fk foreign key (project_plan_id, project_id) references public.project_plans(id, project_id) on delete cascade;
alter table public.project_plan_environment_suggestions add constraint project_plan_environment_suggestions_analysis_project_fk foreign key (analysis_id, project_id) references public.project_plan_analyses(id, project_id) on delete cascade;

drop policy if exists project_versions_owner_all on public.project_versions;
create policy project_versions_owner_all on public.project_versions
for all to authenticated
using (user_id=auth.uid() and exists(select 1 from public.projects p where p.id=project_versions.project_id and p.user_id=auth.uid()))
with check (user_id=auth.uid() and exists(select 1 from public.projects p where p.id=project_versions.project_id and p.user_id=auth.uid()));
