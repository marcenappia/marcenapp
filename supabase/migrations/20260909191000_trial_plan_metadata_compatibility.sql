create or replace function public.create_marcenapp_trial()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.account_trials (user_id, selected_plan, started_at, ends_at)
  values (
    new.id,
    case
      when coalesce(new.raw_user_meta_data ->> 'plan', new.raw_user_meta_data ->> 'selected_plan') in ('start', 'pro', 'business')
        then coalesce(new.raw_user_meta_data ->> 'plan', new.raw_user_meta_data ->> 'selected_plan')
      else null
    end,
    now(),
    now() + interval '7 days'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.create_marcenapp_trial() from anon, authenticated;
