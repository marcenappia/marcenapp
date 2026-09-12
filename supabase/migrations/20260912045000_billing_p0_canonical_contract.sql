-- P0 financial contract hardening.
-- Canonical commercial plan codes are the active billing_plans codes:
--   essencial, profissional, empresa, pro_factory
-- Existing archived plans remain untouched.

begin;

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

-- Keep persisted subscription/trial codes tied to the same catalog used by checkout.
alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_plan_fkey;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_plan_fkey
  foreign key (plan) references public.billing_plans(code);

alter table public.account_trials
  drop constraint if exists account_trials_selected_plan_fkey;

alter table public.account_trials
  add constraint account_trials_selected_plan_fkey
  foreign key (selected_plan) references public.billing_plans(code);

-- External references are the reconciliation keys used with Asaas.
alter table public.billing_purchases
  add column if not exists external_reference text;

alter table public.billing_subscriptions
  add column if not exists external_reference text;

create unique index if not exists billing_purchases_external_reference_uidx
  on public.billing_purchases(external_reference)
  where external_reference is not null;

create unique index if not exists billing_subscriptions_external_reference_uidx
  on public.billing_subscriptions(external_reference)
  where external_reference is not null;

commit;
