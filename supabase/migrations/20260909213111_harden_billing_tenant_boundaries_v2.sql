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

alter table public.billing_customers enable row level security;

create policy "billing_customers_select_own" on public.billing_customers for select to authenticated using ((select auth.uid()) = user_id);
create policy "billing_customers_insert_own" on public.billing_customers for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "billing_customers_update_own" on public.billing_customers for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "billing_customers_delete_own" on public.billing_customers for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.billing_purchases add constraint billing_purchases_customer_owner_fk foreign key (user_id, asaas_customer_id) references public.billing_customers (user_id, asaas_customer_id) not valid;
alter table public.billing_subscriptions add constraint billing_subscriptions_customer_owner_fk foreign key (user_id, asaas_customer_id) references public.billing_customers (user_id, asaas_customer_id) not valid;

revoke all on table public.billing_purchases, public.billing_subscriptions, public.billing_wallets from anon, authenticated;
grant select on table public.billing_purchases, public.billing_subscriptions, public.billing_wallets to authenticated;
revoke all on table public.ai_rate_limits, public.asaas_webhook_events from anon, authenticated;
revoke all on table public.agent_skills_registry from anon;
revoke all on table public.profiles, public.projects, public.gallery_images, public.custom_clauses, public.clientes, public.user_roles, public.chat_messages, public.diario_entradas, public.ai_provider_settings, public.orchestrator_runs, public.account_trials, public.billing_customers from anon;

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id and (cliente_id is null or exists (select 1 from public.clientes c where c.id = cliente_id and c.user_id = (select auth.uid()))));

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (cliente_id is null or exists (select 1 from public.clientes c where c.id = cliente_id and c.user_id = (select auth.uid()))));

drop policy if exists "Users manage own diario entries" on public.diario_entradas;
create policy "Users manage own diario entries" on public.diario_entradas for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))));

drop policy if exists "Users can insert own messages" on public.chat_messages;
create policy "Users can insert own messages" on public.chat_messages for insert to authenticated with check ((select auth.uid()) = user_id and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))));

drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can delete own messages" on public.chat_messages for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.billing_purchases add constraint billing_purchases_amount_positive check (amount is null or amount > 0) not valid;
alter table public.billing_purchases add constraint billing_purchases_credits_nonnegative check (credits is null or credits >= 0) not valid;
