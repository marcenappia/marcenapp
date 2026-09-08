create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('start', 'pro', 'business')),
  asaas_customer_id text not null,
  asaas_subscription_id text not null unique,
  status text not null default 'ACTIVE',
  trial_ends_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_id_idx on public.billing_subscriptions(user_id);
create index if not exists billing_subscriptions_asaas_customer_id_idx on public.billing_subscriptions(asaas_customer_id);

alter table public.billing_subscriptions enable row level security;

revoke all on public.billing_subscriptions from anon;
grant select on public.billing_subscriptions to authenticated;

drop policy if exists "billing_subscriptions_select_own" on public.billing_subscriptions;
create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);
