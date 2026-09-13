-- P1 product/data hardening. Independent from the IARA P0 context work.

-- Canonical runtime table for the user's operational DNA.
create table if not exists public.marcenaria_dna (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marcenaria_dna_user_unique unique (user_id)
);
create index if not exists marcenaria_dna_user_idx on public.marcenaria_dna(user_id);
alter table public.marcenaria_dna enable row level security;
drop policy if exists "owner dna" on public.marcenaria_dna;
create policy "owner dna" on public.marcenaria_dna for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.marcenaria_dna to authenticated;

-- Keep the private obras bucket aligned with the actual DNA ingestion pipeline.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'text/csv',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]::text[]
where id = 'obras';

-- Commercial proposal fields extend the existing project cost snapshot; no second billing system.
alter table public.project_cost_snapshots
  add column if not exists discount_pct numeric not null default 0,
  add column if not exists margin_pct numeric,
  add column if not exists status text not null default 'draft',
  add column if not exists approved_at timestamptz,
  add column if not exists proposal_reference text;

alter table public.project_cost_snapshots
  drop constraint if exists project_cost_discount_pct_check,
  drop constraint if exists project_cost_margin_pct_check,
  drop constraint if exists project_cost_status_check;

alter table public.project_cost_snapshots
  add constraint project_cost_discount_pct_check check (discount_pct >= 0 and discount_pct <= 100),
  add constraint project_cost_margin_pct_check check (margin_pct is null or (margin_pct >= 0 and margin_pct < 100)),
  add constraint project_cost_status_check check (status in ('draft','sent','approved','rejected','cancelled'));

create index if not exists project_cost_snapshots_status_idx on public.project_cost_snapshots(user_id, status);

-- Harden the admin primitive around the existing user_roles role source of truth.
create or replace function public.is_admin_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_user_id
      and ur.role = 'admin'
  );
$$;
revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to authenticated;
