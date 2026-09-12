-- P0 billing persistence contract: the Edge Function reconciles by durable externalReference.
alter table public.billing_purchases
  add column if not exists external_reference text;

alter table public.billing_subscriptions
  add column if not exists external_reference text;

create unique index if not exists billing_purchases_user_external_reference_key
  on public.billing_purchases(user_id, external_reference)
  where external_reference is not null;

create unique index if not exists billing_subscriptions_user_external_reference_key
  on public.billing_subscriptions(user_id, external_reference)
  where external_reference is not null;
