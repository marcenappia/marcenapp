alter table public.whatsapp_messages
  add column if not exists agent_status text not null default 'pending'
    check (agent_status in ('pending', 'processing', 'completed', 'needs_input', 'failed')),
  add column if not exists agent_processed_at timestamptz,
  add column if not exists agent_error text,
  add column if not exists agent_reply_message_id text;

create index if not exists whatsapp_messages_agent_status_idx
  on public.whatsapp_messages(agent_status, created_at);

comment on column public.whatsapp_messages.agent_status is 'Estado do processamento determinístico/IA da mensagem pela YARA.';
comment on column public.whatsapp_messages.agent_reply_message_id is 'ID externo da resposta enviada ao contato, usado para rastreabilidade e idempotência.';
