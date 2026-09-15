create table if not exists public.project_production_freezes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_version_id uuid not null references public.project_versions(id) on delete restrict,
  project_approval_id uuid not null references public.project_approvals(id) on delete restrict,
  user_id uuid not null,
  environment_id uuid references public.project_environments(id) on delete set null,
  snapshot jsonb not null,
  snapshot_hash text not null,
  status text not null default 'frozen' check (status in ('frozen', 'superseded', 'released')),
  created_at timestamptz not null default now(),
  unique (project_version_id)
);

create index if not exists project_production_freezes_project_idx
  on public.project_production_freezes (project_id, created_at desc);

create index if not exists project_production_freezes_user_idx
  on public.project_production_freezes (user_id, created_at desc);

alter table public.project_production_freezes enable row level security;

drop policy if exists "Users can view their production freezes" on public.project_production_freezes;
create policy "Users can view their production freezes"
  on public.project_production_freezes
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create their production freezes" on public.project_production_freezes;
create policy "Users can create their production freezes"
  on public.project_production_freezes
  for insert
  to authenticated
  with check (user_id = auth.uid());
