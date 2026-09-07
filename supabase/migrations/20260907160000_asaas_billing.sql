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

create index if not exists asaas_webhook_events_payment_id_idx
  on public.asaas_webhook_events(payment_id);
create index if not exists asaas_webhook_events_event_type_idx
  on public.asaas_webhook_events(event_type);
create index if not exists asaas_webhook_events_received_at_idx
  on public.asaas_webhook_events(received_at desc);

alter table public.asaas_webhook_events enable row level security;

revoke all on public.asaas_webhook_events from anon, authenticated;
