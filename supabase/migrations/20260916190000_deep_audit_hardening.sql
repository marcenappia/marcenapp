begin;

-- Billing reconciliation: keep a stable internal key so an Asaas response can be
-- recovered safely if the local write fails after the remote charge succeeds.
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

-- Keep the active commercial taxonomy aligned with the catalog.
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

-- Performance: cover foreign keys reported by the Supabase advisor.
create index if not exists marcenaria_dna_rules_created_by_idx
  on public.marcenaria_dna_rules(created_by);

create index if not exists project_production_freezes_environment_idx
  on public.project_production_freezes(environment_id);

create index if not exists project_production_freezes_project_approval_idx
  on public.project_production_freezes(project_approval_id);

-- Performance: cache auth.uid() once per statement instead of once per row.
drop policy if exists marcenaria_dna_rules_delete_own on public.marcenaria_dna_rules;
drop policy if exists marcenaria_dna_rules_insert_own on public.marcenaria_dna_rules;
drop policy if exists marcenaria_dna_rules_select_own on public.marcenaria_dna_rules;
drop policy if exists marcenaria_dna_rules_update_own on public.marcenaria_dna_rules;

create policy marcenaria_dna_rules_delete_own on public.marcenaria_dna_rules
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy marcenaria_dna_rules_insert_own on public.marcenaria_dna_rules
  for insert to authenticated
  with check ((user_id = (select auth.uid())) and ((created_by is null) or (created_by = (select auth.uid()))));

create policy marcenaria_dna_rules_select_own on public.marcenaria_dna_rules
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy marcenaria_dna_rules_update_own on public.marcenaria_dna_rules
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check ((user_id = (select auth.uid())) and ((created_by is null) or (created_by = (select auth.uid()))));

drop policy if exists "Users can create their production freezes" on public.project_production_freezes;
drop policy if exists "Users can view their production freezes" on public.project_production_freezes;

create policy "Users can create their production freezes" on public.project_production_freezes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can view their production freezes" on public.project_production_freezes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- billing_plans already exposes the same active-row predicate to anon and
-- authenticated. Remove the redundant authenticated policy.
drop policy if exists billing_plans_select_authenticated on public.billing_plans;

commit;
