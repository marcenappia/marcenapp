-- Marcenapp domain architecture: Cliente -> Projeto -> Ambiente -> Versao -> IARA.
-- Additive and legacy-compatible. No existing project/client/message/version/diary/approval row is rewritten.

alter table public.project_versions drop constraint if exists project_versions_project_id_version_number_key;

create table if not exists public.project_environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  slug text,
  type text,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_environments add constraint project_environments_id_project_key unique (id, project_id);
create unique index if not exists project_environments_project_name_key on public.project_environments(project_id, lower(name));
create unique index if not exists project_environments_project_slug_key on public.project_environments(project_id, lower(slug)) where slug is not null;
create index if not exists project_environments_project_id_idx on public.project_environments(project_id, position, created_at);

create table if not exists public.project_plans (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default 'Planta', file_path text, source_url text,
  status text not null default 'uploaded' check (status = any (array['uploaded','analyzing','analyzed','confirmed','archived'])),
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists project_plans_project_id_idx on public.project_plans(project_id, created_at desc);

create table if not exists public.project_plan_analyses (
  id uuid primary key default gen_random_uuid(), project_plan_id uuid not null references public.project_plans(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'pending' check (status = any (array['pending','running','completed','failed'])),
  provider text, model text, result jsonb not null default '{}'::jsonb, error text,
  created_at timestamptz not null default now(), completed_at timestamptz
);
create index if not exists project_plan_analyses_plan_idx on public.project_plan_analyses(project_plan_id, created_at desc);
create index if not exists project_plan_analyses_project_idx on public.project_plan_analyses(project_id, created_at desc);

create table if not exists public.project_plan_environment_suggestions (
  id uuid primary key default gen_random_uuid(), project_plan_id uuid not null references public.project_plans(id) on delete cascade,
  analysis_id uuid not null references public.project_plan_analyses(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null, type text, position integer not null default 0, confidence numeric,
  status text not null default 'pending' check (status = any (array['pending','confirmed','rejected','renamed','edited'])),
  confirmed_environment_id uuid references public.project_environments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists project_plan_environment_suggestions_project_idx on public.project_plan_environment_suggestions(project_id, status, created_at desc);
create index if not exists project_plan_environment_suggestions_analysis_idx on public.project_plan_environment_suggestions(analysis_id, position);

alter table public.project_versions add column if not exists environment_id uuid;
alter table public.project_versions add constraint project_versions_id_project_key unique (id, project_id);
alter table public.project_versions add constraint project_versions_id_project_environment_key unique (id, project_id, environment_id);
create unique index if not exists project_versions_project_legacy_version_key on public.project_versions(project_id, version_number) where environment_id is null;
create unique index if not exists project_versions_environment_version_key on public.project_versions(project_id, environment_id, version_number) where environment_id is not null;
create index if not exists project_versions_environment_idx on public.project_versions(environment_id, version_number desc) where environment_id is not null;
alter table public.project_versions add constraint project_versions_environment_project_fk foreign key (environment_id, project_id) references public.project_environments(id, project_id) on delete restrict;

alter table public.chat_messages add column if not exists environment_id uuid, add column if not exists version_id uuid;
create index if not exists chat_messages_environment_idx on public.chat_messages(environment_id, created_at);
create index if not exists chat_messages_project_environment_created_idx on public.chat_messages(project_id, environment_id, created_at);
alter table public.chat_messages add constraint chat_messages_environment_project_fk foreign key (environment_id, project_id) references public.project_environments(id, project_id) on delete restrict;
alter table public.chat_messages add constraint chat_messages_version_project_environment_fk foreign key (version_id, project_id, environment_id) references public.project_versions(id, project_id, environment_id) on delete restrict;
alter table public.chat_messages add constraint chat_messages_version_requires_environment_ck check (version_id is null or environment_id is not null);

alter table public.diario_entradas add column if not exists environment_id uuid;
create index if not exists diario_entradas_environment_idx on public.diario_entradas(environment_id, created_at desc);
create index if not exists diario_entradas_project_environment_idx on public.diario_entradas(project_id, environment_id, created_at desc);
alter table public.diario_entradas add constraint diario_entradas_environment_project_fk foreign key (environment_id, project_id) references public.project_environments(id, project_id) on delete restrict;

alter table public.project_approvals add column if not exists environment_id uuid;
create index if not exists project_approvals_environment_idx on public.project_approvals(environment_id, project_id);
alter table public.project_approvals add constraint project_approvals_environment_project_fk foreign key (environment_id, project_id) references public.project_environments(id, project_id) on delete restrict;
alter table public.project_approvals add constraint project_approvals_version_project_fk foreign key (project_version_id, project_id) references public.project_versions(id, project_id) on delete restrict;
alter table public.project_approvals add constraint project_approvals_version_environment_fk foreign key (project_version_id, project_id, environment_id) references public.project_versions(id, project_id, environment_id) on delete restrict;

create table if not exists public.project_iara_contexts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clientes(id) on delete cascade, project_id uuid references public.projects(id) on delete cascade,
  environment_id uuid references public.project_environments(id) on delete cascade, version_id uuid references public.project_versions(id) on delete cascade,
  summary text, decisions jsonb not null default '[]'::jsonb, artifacts jsonb not null default '[]'::jsonb, last_correlation_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint project_iara_context_hierarchy_ck check ((environment_id is null or project_id is not null) and (version_id is null or environment_id is not null))
);
create unique index if not exists project_iara_contexts_scope_key on public.project_iara_contexts(user_id, coalesce(client_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(environment_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(version_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists project_iara_contexts_project_idx on public.project_iara_contexts(project_id, updated_at desc);
create index if not exists project_iara_contexts_environment_idx on public.project_iara_contexts(environment_id, updated_at desc);
create index if not exists project_iara_contexts_version_idx on public.project_iara_contexts(version_id, updated_at desc);
alter table public.project_iara_contexts add constraint project_iara_contexts_environment_project_fk foreign key (environment_id, project_id) references public.project_environments(id, project_id) on delete cascade;
alter table public.project_iara_contexts add constraint project_iara_contexts_version_project_environment_fk foreign key (version_id, project_id, environment_id) references public.project_versions(id, project_id, environment_id) on delete cascade;

create or replace function public.validate_iara_context_scope(p_user_id uuid,p_client_id uuid,p_project_id uuid,p_environment_id uuid,p_version_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare project_client uuid;
begin
  if auth.uid() is null or p_user_id <> auth.uid() then raise exception 'Unauthorized IARA context scope'; end if;
  if p_client_id is not null and not exists(select 1 from public.clientes c where c.id=p_client_id and c.user_id=auth.uid()) then raise exception 'Client does not belong to authenticated user'; end if;
  if p_project_id is not null then
    select p.cliente_id into project_client from public.projects p where p.id=p_project_id and p.user_id=auth.uid();
    if not found then raise exception 'Project does not belong to authenticated user'; end if;
    if p_client_id is not null and project_client is not null and project_client <> p_client_id then raise exception 'Client does not match project'; end if;
  end if;
  if p_environment_id is not null and not exists(select 1 from public.project_environments e join public.projects p on p.id=e.project_id where e.id=p_environment_id and p.user_id=auth.uid() and (p_project_id is null or e.project_id=p_project_id)) then raise exception 'Environment does not match project'; end if;
  if p_version_id is not null and not exists(select 1 from public.project_versions v join public.projects p on p.id=v.project_id where v.id=p_version_id and p.user_id=auth.uid() and (p_project_id is null or v.project_id=p_project_id) and (p_environment_id is null or v.environment_id=p_environment_id)) then raise exception 'Version does not match context'; end if;
end; $$;

create or replace function public.merge_iara_context(p_user_id uuid,p_client_id uuid,p_project_id uuid,p_environment_id uuid,p_version_id uuid,p_summary text,p_decisions jsonb,p_artifacts jsonb,p_last_correlation_id text)
returns public.project_iara_contexts language plpgsql security invoker set search_path=public as $$
declare result public.project_iara_contexts; scope_hash bigint;
begin
  perform public.validate_iara_context_scope(p_user_id,p_client_id,p_project_id,p_environment_id,p_version_id);
  scope_hash := hashtextextended(concat_ws(':',p_user_id,p_client_id,p_project_id,p_environment_id,p_version_id),0);
  perform pg_advisory_xact_lock(scope_hash);
  select * into result from public.project_iara_contexts c where c.user_id=p_user_id and c.client_id is not distinct from p_client_id and c.project_id is not distinct from p_project_id and c.environment_id is not distinct from p_environment_id and c.version_id is not distinct from p_version_id for update;
  if result.id is null then
    insert into public.project_iara_contexts(user_id,client_id,project_id,environment_id,version_id,summary,decisions,artifacts,last_correlation_id)
    values(p_user_id,p_client_id,p_project_id,p_environment_id,p_version_id,p_summary,
      case when jsonb_typeof(coalesce(p_decisions,'[]'::jsonb))='array' then coalesce(p_decisions,'[]'::jsonb) else '[]'::jsonb end,
      case when jsonb_typeof(coalesce(p_artifacts,'[]'::jsonb))='array' then coalesce(p_artifacts,'[]'::jsonb) else '[]'::jsonb end,p_last_correlation_id)
    returning * into result;
  else
    update public.project_iara_contexts set
      summary=coalesce(p_summary,result.summary),
      decisions=(select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from (select value,ord from jsonb_array_elements(coalesce(result.decisions,'[]'::jsonb)||coalesce(p_decisions,'[]'::jsonb)) with ordinality as elements(value,ord) order by ord desc limit 50) bounded),
      artifacts=(select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from (select value,ord from (select value,ord,row_number() over(partition by coalesce(value->>'type',''),coalesce(value->>'id','') order by ord desc) rn from jsonb_array_elements(coalesce(result.artifacts,'[]'::jsonb)||coalesce(p_artifacts,'[]'::jsonb)) with ordinality as elements(value,ord)) ranked where rn=1 order by ord desc limit 100) bounded),
      last_correlation_id=coalesce(p_last_correlation_id,result.last_correlation_id), updated_at=now()
    where id=result.id returning * into result;
  end if;
  return result;
end; $$;

alter table public.project_environments enable row level security;
alter table public.project_plans enable row level security;
alter table public.project_plan_analyses enable row level security;
alter table public.project_plan_environment_suggestions enable row level security;
alter table public.project_iara_contexts enable row level security;
grant select,insert,update,delete on public.project_environments,public.project_plans,public.project_plan_analyses,public.project_plan_environment_suggestions,public.project_iara_contexts to authenticated;
create policy project_environments_owner_all on public.project_environments for all to authenticated using(exists(select 1 from public.projects p where p.id=project_environments.project_id and p.user_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_environments.project_id and p.user_id=auth.uid()));
create policy project_plans_owner_all on public.project_plans for all to authenticated using(exists(select 1 from public.projects p where p.id=project_plans.project_id and p.user_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_plans.project_id and p.user_id=auth.uid()));
create policy project_plan_analyses_owner_all on public.project_plan_analyses for all to authenticated using(exists(select 1 from public.projects p where p.id=project_plan_analyses.project_id and p.user_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_plan_analyses.project_id and p.user_id=auth.uid()));
create policy project_plan_environment_suggestions_owner_all on public.project_plan_environment_suggestions for all to authenticated using(exists(select 1 from public.projects p where p.id=project_plan_environment_suggestions.project_id and p.user_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_plan_environment_suggestions.project_id and p.user_id=auth.uid()));
create policy project_iara_contexts_owner_all on public.project_iara_contexts for all to authenticated using(user_id=auth.uid() and ((project_id is null and client_id is null) or (client_id is not null and exists(select 1 from public.clientes c where c.id=project_iara_contexts.client_id and c.user_id=auth.uid())) or (project_id is not null and exists(select 1 from public.projects p where p.id=project_iara_contexts.project_id and p.user_id=auth.uid())))) with check(user_id=auth.uid() and ((project_id is null and client_id is null) or (client_id is not null and exists(select 1 from public.clientes c where c.id=project_iara_contexts.client_id and c.user_id=auth.uid())) or (project_id is not null and exists(select 1 from public.projects p where p.id=project_iara_contexts.project_id and p.user_id=auth.uid()))));

drop policy if exists "Users can view own messages" on public.chat_messages;
drop policy if exists "Users can insert own messages" on public.chat_messages;
drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can view own messages" on public.chat_messages for select to authenticated using(user_id=auth.uid() and (project_id is null or exists(select 1 from public.projects p where p.id=chat_messages.project_id and p.user_id=auth.uid())) and (environment_id is null or exists(select 1 from public.project_environments e join public.projects p on p.id=e.project_id where e.id=chat_messages.environment_id and p.user_id=auth.uid() and e.project_id=chat_messages.project_id)) and (version_id is null or exists(select 1 from public.project_versions v join public.projects p on p.id=v.project_id where v.id=chat_messages.version_id and p.user_id=auth.uid() and v.project_id=chat_messages.project_id and v.environment_id=chat_messages.environment_id)));
create policy "Users can insert own messages" on public.chat_messages for insert to authenticated with check(user_id=auth.uid() and (project_id is null or exists(select 1 from public.projects p where p.id=chat_messages.project_id and p.user_id=auth.uid())) and (environment_id is null or exists(select 1 from public.project_environments e join public.projects p on p.id=e.project_id where e.id=chat_messages.environment_id and p.user_id=auth.uid() and e.project_id=chat_messages.project_id)) and (version_id is null or exists(select 1 from public.project_versions v join public.projects p on p.id=v.project_id where v.id=chat_messages.version_id and p.user_id=auth.uid() and v.project_id=chat_messages.project_id and v.environment_id=chat_messages.environment_id)));
create policy "Users can delete own messages" on public.chat_messages for delete to authenticated using(user_id=auth.uid() and (project_id is null or exists(select 1 from public.projects p where p.id=chat_messages.project_id and p.user_id=auth.uid())) and (environment_id is null or exists(select 1 from public.project_environments e join public.projects p on p.id=e.project_id where e.id=chat_messages.environment_id and p.user_id=auth.uid() and e.project_id=chat_messages.project_id)) and (version_id is null or exists(select 1 from public.project_versions v join public.projects p on p.id=v.project_id where v.id=chat_messages.version_id and p.user_id=auth.uid() and v.project_id=chat_messages.project_id and v.environment_id=chat_messages.environment_id)));

drop policy if exists "Users manage own diario entries" on public.diario_entradas;
create policy "Users manage own diario entries" on public.diario_entradas for all to authenticated using(user_id=auth.uid() and (project_id is null or exists(select 1 from public.projects p where p.id=diario_entradas.project_id and p.user_id=auth.uid())) and (environment_id is null or exists(select 1 from public.project_environments e join public.projects p on p.id=e.project_id where e.id=diario_entradas.environment_id and p.user_id=auth.uid() and e.project_id=diario_entradas.project_id))) with check(user_id=auth.uid() and (project_id is null or exists(select 1 from public.projects p where p.id=diario_entradas.project_id and p.user_id=auth.uid())) and (environment_id is null or exists(select 1 from public.project_environments e join public.projects p on p.id=e.project_id where e.id=diario_entradas.environment_id and p.user_id=auth.uid() and e.project_id=diario_entradas.project_id)));

drop policy if exists approvals_owner_select on public.project_approvals;
create policy approvals_owner_select on public.project_approvals for select to authenticated using(exists(select 1 from public.projects p where p.id=project_approvals.project_id and p.user_id=auth.uid()) and (environment_id is null or exists(select 1 from public.project_environments e where e.id=project_approvals.environment_id and e.project_id=project_approvals.project_id)) and exists(select 1 from public.project_versions v where v.id=project_approvals.project_version_id and v.project_id=project_approvals.project_id and (environment_id is null or v.environment_id=project_approvals.environment_id)));

revoke all on function public.validate_iara_context_scope(uuid,uuid,uuid,uuid,uuid) from public;
revoke all on function public.merge_iara_context(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,text) from public;
grant execute on function public.validate_iara_context_scope(uuid,uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.merge_iara_context(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,text) to authenticated;
