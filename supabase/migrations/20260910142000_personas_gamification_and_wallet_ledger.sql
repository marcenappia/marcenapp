-- Product segmentation, retention and wallet transparency.
-- Persona is product UX segmentation, never authorization.

alter table public.profiles
  add column if not exists usage_role text,
  add column if not exists profession text;

alter table public.profiles
  drop constraint if exists profiles_usage_role_check;
alter table public.profiles
  add constraint profiles_usage_role_check
  check (usage_role is null or usage_role in ('marceneiro','profissional_projeto','cliente_final','outro'));

create table if not exists public.billing_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_type text not null check (credit_type in ('image','contract','budget','cut_plan','marcena')),
  delta integer not null check (delta <> 0),
  reason text not null,
  source_type text,
  source_id text,
  balance_after integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists billing_wallet_ledger_user_created_idx
  on public.billing_wallet_ledger(user_id, created_at desc);
create index if not exists billing_wallet_ledger_user_type_idx
  on public.billing_wallet_ledger(user_id, credit_type, created_at desc);
alter table public.billing_wallet_ledger enable row level security;
grant select on public.billing_wallet_ledger to authenticated;
drop policy if exists billing_wallet_ledger_select_own on public.billing_wallet_ledger;
create policy billing_wallet_ledger_select_own
  on public.billing_wallet_ledger for select to authenticated
  using (user_id = auth.uid());

create table if not exists public.gamification_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gamification_missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  event_key text not null,
  target_value integer not null default 1 check (target_value > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  credit_type text,
  credit_reward integer not null default 0 check (credit_reward >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((credit_reward = 0 and credit_type is null) or (credit_reward > 0 and credit_type is not null))
);

create table if not exists public.gamification_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.gamification_missions(id) on delete cascade,
  progress_value integer not null default 0 check (progress_value >= 0),
  completed_at timestamptz,
  reward_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create table if not exists public.gamification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  idempotency_key text not null,
  project_id uuid references public.projects(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists gamification_progress_user_idx on public.gamification_progress(user_id);
create index if not exists gamification_events_user_created_idx on public.gamification_events(user_id, created_at desc);

alter table public.gamification_profiles enable row level security;
alter table public.gamification_missions enable row level security;
alter table public.gamification_progress enable row level security;
alter table public.gamification_events enable row level security;
grant select on public.gamification_profiles, public.gamification_missions, public.gamification_progress to authenticated;
drop policy if exists gamification_profiles_select_own on public.gamification_profiles;
create policy gamification_profiles_select_own on public.gamification_profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists gamification_missions_select_active on public.gamification_missions;
create policy gamification_missions_select_active on public.gamification_missions for select to authenticated using (active = true);
drop policy if exists gamification_progress_select_own on public.gamification_progress;
create policy gamification_progress_select_own on public.gamification_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists gamification_events_select_own on public.gamification_events;
create policy gamification_events_select_own on public.gamification_events for select to authenticated using (user_id = auth.uid());

-- Missions are meaningful product actions, not reward farming by repeated login.
insert into public.gamification_missions (code,name,description,event_key,target_value,xp_reward,credit_type,credit_reward)
values
  ('first_project','Primeiro projeto','Crie seu primeiro projeto no Marcenapp.','project_created',1,100,null,0),
  ('first_render','Primeiro render','Gere seu primeiro render no Estúdio.','render_generated',1,150,'image',1),
  ('three_projects','Três projetos','Conclua três projetos no Marcenapp.','project_completed',3,250,null,0),
  ('ten_projects','Dez projetos','Conclua dez projetos no Marcenapp.','project_completed',10,750,null,0)
on conflict (code) do update set
  name=excluded.name, description=excluded.description, event_key=excluded.event_key,
  target_value=excluded.target_value, xp_reward=excluded.xp_reward,
  credit_type=excluded.credit_type, credit_reward=excluded.credit_reward,
  active=true, updated_at=now();

create or replace function public.ensure_gamification_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.gamification_profiles(user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_profiles_gamification_profile on public.profiles;
create trigger trg_profiles_gamification_profile
after insert on public.profiles
for each row execute function public.ensure_gamification_profile();

-- Existing users get a profile too; this does not grant credits.
insert into public.gamification_profiles(user_id)
select user_id from public.profiles
on conflict (user_id) do nothing;
