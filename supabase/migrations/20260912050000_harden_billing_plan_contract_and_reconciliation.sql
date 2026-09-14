-- P0 billing contract hardening.
-- Canonical commercial plan codes are sourced from public.billing_plans:
-- essencial, profissional, empresa, pro_factory.
-- Existing legacy billing rows must be explicitly migrated before this contract is applied.

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

-- These references are the reconciliation keys between Marcenapp and Asaas.
-- They are intentionally unique so a retry cannot create a second internal intent.
alter table public.billing_purchases
  add column if not exists external_reference text;

alter table public.billing_subscriptions
  add column if not exists external_reference text;

-- A subscription intent may exist before Asaas returns its resource ID.
-- This makes the DB row the durable source of truth for the create attempt.
alter table public.billing_subscriptions
  alter column asaas_subscription_id drop not null;

create unique index if not exists billing_purchases_external_reference_uidx
  on public.billing_purchases(external_reference)
  where external_reference is not null;

create unique index if not exists billing_subscriptions_external_reference_uidx
  on public.billing_subscriptions(external_reference)
  where external_reference is not null;

-- Keep trial provisioning on the same canonical commercial contract.
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
