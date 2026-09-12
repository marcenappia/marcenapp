-- IARA project context: one persistent context per owned project.
create table if not exists public.project_iara_contexts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text,
  decisions jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  last_correlation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_iara_contexts_project_user_key unique (project_id, user_id)
);

create index if not exists project_iara_contexts_user_id_idx on public.project_iara_contexts(user_id);

alter table public.project_iara_contexts enable row level security;

grant select, insert, update, delete on public.project_iara_contexts to authenticated;

create policy "Users can view IARA context for owned projects"
on public.project_iara_contexts
for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_iara_contexts.project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Users can create IARA context for owned projects"
on public.project_iara_contexts
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_iara_contexts.project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Users can update IARA context for owned projects"
on public.project_iara_contexts
for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_iara_contexts.project_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_iara_contexts.project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Users can delete IARA context for owned projects"
on public.project_iara_contexts
for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_iara_contexts.project_id
      and p.user_id = (select auth.uid())
  )
);

-- Persist the project boundary on orchestration runs without changing the existing run model.
alter table public.orchestrator_runs
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists orchestrator_runs_project_id_idx on public.orchestrator_runs(project_id);

-- Tighten project-scoped run access while preserving the existing admin read path.
drop policy if exists orchestrator_runs_insert_own on public.orchestrator_runs;
drop policy if exists orchestrator_runs_select_own_or_admin on public.orchestrator_runs;
drop policy if exists orchestrator_runs_update_own on public.orchestrator_runs;
drop policy if exists orchestrator_runs_delete_own on public.orchestrator_runs;

create policy orchestrator_runs_insert_own on public.orchestrator_runs
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = orchestrator_runs.project_id
        and p.user_id = (select auth.uid())
    )
  )
);

create policy orchestrator_runs_select_own_or_admin on public.orchestrator_runs
for select to authenticated
using (
  (
    user_id = (select auth.uid())
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = orchestrator_runs.project_id
          and p.user_id = (select auth.uid())
      )
    )
  )
  or (select private.is_admin())
);

create policy orchestrator_runs_update_own on public.orchestrator_runs
for update to authenticated
using (
  user_id = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = orchestrator_runs.project_id
        and p.user_id = (select auth.uid())
    )
  )
)
with check (
  user_id = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = orchestrator_runs.project_id
        and p.user_id = (select auth.uid())
    )
  )
);

create policy orchestrator_runs_delete_own on public.orchestrator_runs
for delete to authenticated
using (
  user_id = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = orchestrator_runs.project_id
        and p.user_id = (select auth.uid())
    )
  )
);

-- chat_messages already carries project_id; enforce the same project ownership boundary on reads/writes.
drop policy if exists "Users can view own messages" on public.chat_messages;
drop policy if exists "Users can insert own messages" on public.chat_messages;
drop policy if exists "Users can delete own messages" on public.chat_messages;

create policy "Users can view own messages"
on public.chat_messages
for select to authenticated
using (
  user_id = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = chat_messages.project_id
        and p.user_id = (select auth.uid())
    )
  )
);

create policy "Users can insert own messages"
on public.chat_messages
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = chat_messages.project_id
        and p.user_id = (select auth.uid())
    )
  )
);

create policy "Users can delete own messages"
on public.chat_messages
for delete to authenticated
using (
  user_id = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = chat_messages.project_id
        and p.user_id = (select auth.uid())
    )
  )
);
