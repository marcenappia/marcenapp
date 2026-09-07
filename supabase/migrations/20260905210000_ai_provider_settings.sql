-- BLANCH: configurable AI provider per user. No credentials are stored here.
create table if not exists public.ai_provider_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'automatic' check (provider in ('automatic','gemini','lovable')),
  updated_at timestamptz not null default now()
);

alter table public.ai_provider_settings enable row level security;
drop policy if exists "Users manage own AI provider setting" on public.ai_provider_settings;
create policy "Users manage own AI provider setting"
on public.ai_provider_settings for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.ai_provider_settings to authenticated;
grant all on public.ai_provider_settings to service_role;
