create table if not exists public.whatsapp_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_number_id text not null unique,
  business_account_id text,
  display_phone_number text,
  display_name text,
  status text not null default 'active' check (status in ('active', 'paused', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.whatsapp_integrations(id) on delete cascade,
  wa_id text not null,
  contact_name text,
  client_id uuid references public.clientes(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, wa_id)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  external_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text',
  body text,
  media_id text,
  status text not null default 'received' check (status in ('received', 'queued', 'sent', 'delivered', 'read', 'failed')),
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_integrations_user_id_idx on public.whatsapp_integrations(user_id);
create index if not exists whatsapp_conversations_user_id_updated_idx on public.whatsapp_conversations(user_id, updated_at desc);
create index if not exists whatsapp_messages_conversation_created_idx on public.whatsapp_messages(conversation_id, created_at asc);

alter table public.whatsapp_integrations enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

create policy "Users can manage their WhatsApp integrations"
  on public.whatsapp_integrations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their WhatsApp conversations"
  on public.whatsapp_conversations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their WhatsApp messages"
  on public.whatsapp_messages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.whatsapp_integrations is 'Configuração pública da conta WhatsApp; tokens ficam apenas nos secrets das Edge Functions.';
comment on table public.whatsapp_conversations is 'Inbox multitenant do WhatsApp vinculada a clientes e projetos.';
comment on table public.whatsapp_messages is 'Mensagens recebidas/enviadas pelo WhatsApp Cloud API com idempotência por external_message_id.';
