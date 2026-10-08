create table if not exists public.project_budget_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete set null,
  source_files jsonb not null default '[]'::jsonb,
  evidences jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  status text not null default 'needs_confirmation' check (status in ('draft','needs_confirmation','ready_for_pricing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_budget_drafts_user_project_idx
  on public.project_budget_drafts(user_id, project_id, updated_at desc);

alter table public.project_budget_drafts enable row level security;

create policy "project_budget_drafts_select_own"
  on public.project_budget_drafts for select
  using (auth.uid() = user_id);

create policy "project_budget_drafts_insert_own"
  on public.project_budget_drafts for insert
  with check (auth.uid() = user_id);

create policy "project_budget_drafts_update_own"
  on public.project_budget_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "project_budget_drafts_delete_own"
  on public.project_budget_drafts for delete
  using (auth.uid() = user_id);
