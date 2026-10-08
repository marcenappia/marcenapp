create table if not exists public.ai_runtime_settings (
  id text primary key default 'default',
  provider text not null default 'vercel' check (provider in ('automatic','lovable','vercel','gemini')),
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.ai_runtime_settings (id, provider)
values ('default', 'vercel')
on conflict (id) do nothing;

alter table public.ai_runtime_settings enable row level security;

drop policy if exists "Admins can read AI runtime settings" on public.ai_runtime_settings;
create policy "Admins can read AI runtime settings"
  on public.ai_runtime_settings for select to authenticated
  using ((select public.is_admin_user((select auth.uid()))));

drop policy if exists "Admins can insert AI runtime settings" on public.ai_runtime_settings;
create policy "Admins can insert AI runtime settings"
  on public.ai_runtime_settings for insert to authenticated
  with check ((select public.is_admin_user((select auth.uid()))));

drop policy if exists "Admins can update AI runtime settings" on public.ai_runtime_settings;
create policy "Admins can update AI runtime settings"
  on public.ai_runtime_settings for update to authenticated
  using ((select public.is_admin_user((select auth.uid()))))
  with check ((select public.is_admin_user((select auth.uid()))));

revoke all on table public.ai_runtime_settings from anon;
grant select, insert, update on table public.ai_runtime_settings to authenticated;