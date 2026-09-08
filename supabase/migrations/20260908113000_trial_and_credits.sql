create table if not exists public.account_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_plan text check (selected_plan in ('start', 'pro', 'business')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.account_trials enable row level security;
revoke all on public.account_trials from anon;
grant select on public.account_trials to authenticated;
drop policy if exists "account_trials_select_own" on public.account_trials;
create policy "account_trials_select_own" on public.account_trials for select to authenticated using (auth.uid() = user_id);

create or replace function public.create_marcenapp_trial()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.account_trials (user_id, selected_plan, started_at, ends_at)
  values (new.id, case when new.raw_user_meta_data ->> 'plan' in ('start', 'pro', 'business') then new.raw_user_meta_data ->> 'plan' else null end, now(), now() + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_marcenapp_trial on auth.users;
create trigger on_auth_user_created_marcenapp_trial after insert on auth.users for each row execute function public.create_marcenapp_trial();

create table if not exists public.billing_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  image_credits integer not null default 0 check (image_credits >= 0),
  contract_credits integer not null default 0 check (contract_credits >= 0),
  cut_plan_credits integer not null default 0 check (cut_plan_credits >= 0),
  marcena_credits integer not null default 0 check (marcena_credits >= 0),
  updated_at timestamptz not null default now()
);

alter table public.billing_wallets enable row level security;
revoke all on public.billing_wallets from anon;
grant select on public.billing_wallets to authenticated;
drop policy if exists "billing_wallets_select_own" on public.billing_wallets;
create policy "billing_wallets_select_own" on public.billing_wallets for select to authenticated using (auth.uid() = user_id);

create table if not exists public.billing_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null,
  product_name text not null,
  credit_type text not null check (credit_type in ('image', 'contract', 'cut_plan', 'marcena')),
  credits integer not null check (credits > 0),
  amount numeric(12,2) not null check (amount > 0),
  asaas_customer_id text,
  asaas_payment_id text unique,
  status text not null default 'PENDING',
  credits_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_purchases_user_id_idx on public.billing_purchases(user_id);
create index if not exists billing_purchases_status_idx on public.billing_purchases(status);
alter table public.billing_purchases enable row level security;
revoke all on public.billing_purchases from anon;
grant select on public.billing_purchases to authenticated;
drop policy if exists "billing_purchases_select_own" on public.billing_purchases;
create policy "billing_purchases_select_own" on public.billing_purchases for select to authenticated using (auth.uid() = user_id);

create or replace function public.grant_billing_credits(p_user_id uuid, p_credit_type text, p_credits integer)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.billing_wallets (user_id) values (p_user_id) on conflict (user_id) do nothing;
  if p_credit_type = 'image' then
    update public.billing_wallets set image_credits = image_credits + p_credits, updated_at = now() where user_id = p_user_id;
  elsif p_credit_type = 'contract' then
    update public.billing_wallets set contract_credits = contract_credits + p_credits, updated_at = now() where user_id = p_user_id;
  elsif p_credit_type = 'cut_plan' then
    update public.billing_wallets set cut_plan_credits = cut_plan_credits + p_credits, updated_at = now() where user_id = p_user_id;
  elsif p_credit_type = 'marcena' then
    update public.billing_wallets set marcena_credits = marcena_credits + p_credits, updated_at = now() where user_id = p_user_id;
  else
    raise exception 'credit_type_invalid';
  end if;
end;
$$;
