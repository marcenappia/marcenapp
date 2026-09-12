-- Marcenapp Billing P0 reconciliation contract.
-- This is a new migration because the reference PR migrations are not present in
-- the definitive architecture history. It is intentionally additive/idempotent.
-- No domain hierarchy, IARA, project/environment/version, or RLS architecture is changed.

-- 1. Serialize external-resource creation with a short-lived distributed lease.
create table if not exists public.billing_operation_locks (
  lock_key text primary key,
  owner_token uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_operation_locks enable row level security;
revoke all on public.billing_operation_locks from public, anon, authenticated;
grant select, insert, update, delete on public.billing_operation_locks to service_role;

create or replace function public.acquire_billing_operation_lock(
  p_lock_key text,
  p_owner_token uuid,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lock_key is null or length(trim(p_lock_key)) = 0 or p_owner_token is null then
    raise exception 'invalid_billing_lock';
  end if;

  insert into public.billing_operation_locks(lock_key, owner_token, expires_at)
  values (
    p_lock_key,
    p_owner_token,
    now() + make_interval(secs => greatest(10, least(p_lease_seconds, 600)))
  )
  on conflict (lock_key) do update
    set owner_token = excluded.owner_token,
        expires_at = excluded.expires_at,
        updated_at = now()
    where public.billing_operation_locks.expires_at <= now();

  return exists (
    select 1
    from public.billing_operation_locks
    where lock_key = p_lock_key and owner_token = p_owner_token
  );
end;
$$;

create or replace function public.release_billing_operation_lock(
  p_lock_key text,
  p_owner_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.billing_operation_locks
  where lock_key = p_lock_key and owner_token = p_owner_token;
  return found;
end;
$$;

revoke all on function public.acquire_billing_operation_lock(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_billing_operation_lock(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_billing_operation_lock(text, uuid, integer) to service_role;
grant execute on function public.release_billing_operation_lock(text, uuid) to service_role;

-- 2. Durable external references for purchase/subscription reconciliation.
alter table public.billing_purchases
  add column if not exists external_reference text;

alter table public.billing_subscriptions
  add column if not exists external_reference text;

-- A subscription intent can exist before Asaas returns a subscription id.
alter table public.billing_subscriptions
  alter column asaas_subscription_id drop not null;

create unique index if not exists billing_purchases_user_external_reference_key
  on public.billing_purchases(user_id, external_reference)
  where external_reference is not null;

create unique index if not exists billing_subscriptions_user_external_reference_key
  on public.billing_subscriptions(user_id, external_reference)
  where external_reference is not null;

-- 3. Canonical commercial plan contract.
-- Fail closed if pre-existing data would violate the current billing_plans taxonomy.
do $$
begin
  if exists (
    select 1 from public.billing_subscriptions
    where plan not in ('essencial','profissional','empresa','pro_factory')
  ) then
    raise exception 'billing_subscriptions contains non-canonical plan codes; migrate them before applying this migration';
  end if;

  if exists (
    select 1 from public.account_trials
    where selected_plan is not null
      and selected_plan not in ('essencial','profissional','empresa','pro_factory')
  ) then
    raise exception 'account_trials contains non-canonical plan codes; migrate them before applying this migration';
  end if;
end $$;

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_plan_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_plan_check
  check (plan = any (array['essencial','profissional','empresa','pro_factory']));

alter table public.account_trials
  drop constraint if exists account_trials_selected_plan_check;

alter table public.account_trials
  add constraint account_trials_selected_plan_check
  check (selected_plan is null or selected_plan = any (array['essencial','profissional','empresa','pro_factory']));

-- Keep trial provisioning on the canonical commercial contract.
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
      when coalesce(new.raw_user_meta_data ->> 'plan', new.raw_user_meta_data ->> 'selected_plan')
        in ('essencial','profissional','empresa','pro_factory')
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

revoke execute on function public.create_marcenapp_trial() from public, anon, authenticated;
grant execute on function public.create_marcenapp_trial() to service_role;
