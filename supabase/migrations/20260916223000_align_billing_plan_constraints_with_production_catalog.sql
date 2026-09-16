-- Keep database plan constraints aligned with the active production catalog.
-- This prevents Asaas subscription creation from succeeding upstream while the
-- local billing record is rejected by a legacy plan constraint.

alter table public.billing_subscriptions drop constraint if exists billing_subscriptions_plan_check;
alter table public.billing_subscriptions add constraint billing_subscriptions_plan_check
  check (plan = any (array['essencial','profissional','empresa','pro_factory']));

alter table public.account_trials drop constraint if exists account_trials_selected_plan_check;
alter table public.account_trials add constraint account_trials_selected_plan_check
  check (selected_plan is null or selected_plan = any (array['essencial','profissional','empresa','pro_factory']));

create or replace function public.create_marcenapp_trial()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  insert into public.account_trials(user_id, selected_plan, started_at, ends_at)
  values (
    new.id,
    case
      when coalesce(new.raw_user_meta_data->>'plan', new.raw_user_meta_data->>'selected_plan') in ('essencial','profissional','empresa','pro_factory')
        then coalesce(new.raw_user_meta_data->>'plan', new.raw_user_meta_data->>'selected_plan')
      else null
    end,
    now(),
    now() + interval '7 days'
  )
  on conflict(user_id) do nothing;
  return new;
end;
$function$;

revoke all on function public.create_marcenapp_trial() from public, anon, authenticated;
