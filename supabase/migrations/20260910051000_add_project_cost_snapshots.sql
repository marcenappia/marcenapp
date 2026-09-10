create table if not exists public.project_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  sale_price numeric,
  material_cost numeric,
  hardware_cost numeric,
  labor_cost numeric,
  other_cost numeric,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_cost_nonnegative check (
    (sale_price is null or sale_price >= 0) and (material_cost is null or material_cost >= 0) and
    (hardware_cost is null or hardware_cost >= 0) and (labor_cost is null or labor_cost >= 0) and (other_cost is null or other_cost >= 0)
  ),
  unique(user_id, project_id)
);
create index if not exists project_cost_snapshots_user_project_idx on public.project_cost_snapshots(user_id, project_id);
alter table public.project_cost_snapshots enable row level security;
drop policy if exists project_cost_select_own on public.project_cost_snapshots;
drop policy if exists project_cost_insert_own on public.project_cost_snapshots;
drop policy if exists project_cost_update_own on public.project_cost_snapshots;
create policy project_cost_select_own on public.project_cost_snapshots for select to authenticated using (user_id=auth.uid());
create policy project_cost_insert_own on public.project_cost_snapshots for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
create policy project_cost_update_own on public.project_cost_snapshots for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
