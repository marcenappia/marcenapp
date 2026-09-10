-- RECONSTRUCTION, NOT ORIGINAL HISTORY
--
-- The production migration ledger contains historical billing migrations whose SQL
-- is no longer present in GitHub. Their original text cannot be recovered from
-- schema_migrations. This migration captures the verified production foundation
-- needed by a fresh database so the repository can reproduce the current billing
-- model going forward. It must never be represented as the original history.

create table if not exists public.account_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_plan text,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint account_trials_selected_plan_check check (selected_plan is null or selected_plan = any (array['start','pro','business']))
);

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asaas_customer_id text not null unique,
  external_reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, external_reference),
  unique(user_id, asaas_customer_id)
);

create table if not exists public.billing_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  image_credits integer not null default 0 check (image_credits >= 0),
  contract_credits integer not null default 0 check (contract_credits >= 0),
  cut_plan_credits integer not null default 0 check (cut_plan_credits >= 0),
  marcena_credits integer not null default 0 check (marcena_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null,
  product_name text not null,
  credit_type text not null check (credit_type = any (array['image','contract','cut_plan','marcena'])),
  credits integer not null check (credits > 0),
  amount numeric not null check (amount > 0),
  asaas_customer_id text,
  asaas_payment_id text unique,
  status text not null default 'PENDING',
  credits_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan = any (array['start','pro','business'])),
  asaas_customer_id text not null,
  asaas_subscription_id text not null unique,
  status text not null default 'ACTIVE',
  trial_ends_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asaas_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payment_id text,
  customer_id text,
  subscription_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create index if not exists billing_purchases_user_id_idx on public.billing_purchases(user_id);
create index if not exists billing_purchases_status_idx on public.billing_purchases(status);
create index if not exists billing_purchases_user_customer_idx on public.billing_purchases(user_id, asaas_customer_id);
create index if not exists billing_subscriptions_user_id_idx on public.billing_subscriptions(user_id);
create index if not exists billing_subscriptions_user_customer_idx on public.billing_subscriptions(user_id, asaas_customer_id);
create index if not exists billing_subscriptions_asaas_customer_id_idx on public.billing_subscriptions(asaas_customer_id);
create index if not exists asaas_webhook_events_event_type_idx on public.asaas_webhook_events(event_type);
create index if not exists asaas_webhook_events_payment_id_idx on public.asaas_webhook_events(payment_id);
create index if not exists asaas_webhook_events_received_at_idx on public.asaas_webhook_events(received_at desc);

alter table public.account_trials enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_wallets enable row level security;
alter table public.billing_purchases enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.asaas_webhook_events enable row level security;

-- These owner-read policies are part of the verified current runtime contract.
-- Billing-customer policies are intentionally left to the later tenant-hardening
-- migration because that migration owns their final policy names and definitions.
create policy if not exists "account_trials_select_own" on public.account_trials
  for select to authenticated using ((select auth.uid()) = user_id);
create policy if not exists "billing_purchases_select_own" on public.billing_purchases
  for select to authenticated using ((select auth.uid()) = user_id);
create policy if not exists "billing_subscriptions_select_own" on public.billing_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy if not exists "billing_wallets_select_own" on public.billing_wallets
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.account_trials, public.billing_customers, public.billing_wallets,
  public.billing_purchases, public.billing_subscriptions, public.asaas_webhook_events
  from anon;
revoke all on public.asaas_webhook_events from authenticated;
grant select on public.account_trials to authenticated;
grant select on public.billing_wallets, public.billing_purchases, public.billing_subscriptions to authenticated;

create or replace function public.create_marcenapp_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_trials (user_id, selected_plan, started_at, ends_at)
  values (
    new.id,
    case
      when coalesce(new.raw_user_meta_data ->> 'plan', new.raw_user_meta_data ->> 'selected_plan') in ('start','pro','business')
        then coalesce(new.raw_user_meta_data ->> 'plan', new.raw_user_meta_data ->> 'selected_plan')
      else null
    end,
    now(),
    now() + interval '7 days'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.grant_billing_credits(p_user_id uuid, p_credit_type text, p_credits integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_credits is null or p_credits <= 0 then
    raise exception 'invalid_credit_grant';
  end if;
  insert into public.billing_wallets(user_id) values (p_user_id) on conflict (user_id) do nothing;
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

create or replace function public.process_billing_payment(p_payment_id text, p_status text, p_received boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.billing_purchases%rowtype;
begin
  select * into v_purchase
  from public.billing_purchases
  where asaas_payment_id = p_payment_id
  for update;
  if not found then return false; end if;
  if p_received and v_purchase.credits_granted_at is null then
    perform public.grant_billing_credits(v_purchase.user_id, v_purchase.credit_type, v_purchase.credits);
    update public.billing_purchases set status = 'RECEIVED', credits_granted_at = now(), updated_at = now() where id = v_purchase.id;
  elsif v_purchase.credits_granted_at is null and v_purchase.status <> 'RECEIVED' then
    update public.billing_purchases set status = p_status, updated_at = now() where id = v_purchase.id;
  end if;
  return true;
end;
$$;

revoke execute on function public.create_marcenapp_trial() from public, anon, authenticated;
revoke execute on function public.grant_billing_credits(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.process_billing_payment(text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_marcenapp_trial() to service_role;
grant execute on function public.grant_billing_credits(uuid, text, integer) to service_role;
grant execute on function public.process_billing_payment(text, text, boolean) to service_role;

drop trigger if exists on_auth_user_created_marcenapp_trial on auth.users;
create trigger on_auth_user_created_marcenapp_trial
after insert on auth.users
for each row execute function public.create_marcenapp_trial();
