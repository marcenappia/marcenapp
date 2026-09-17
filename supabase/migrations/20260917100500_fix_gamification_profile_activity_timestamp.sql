-- Master audit: align gamification activity bookkeeping with the production schema.
-- The original function referenced a removed/nonexistent `last_activity_date`
-- column while `gamification_profiles` stores `last_activity_at` (timestamptz).

create or replace function public.register_gamification_activity(p_user_id uuid, p_xp integer default 10)
returns public.gamification_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.gamification_profiles;
  today date := current_date;
  delta integer := greatest(0, least(coalesce(p_xp, 10), 100));
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not_authorized';
  end if;

  insert into public.gamification_profiles(
    user_id,
    xp,
    level,
    streak_days,
    last_activity_at
  )
  values (
    p_user_id,
    delta,
    1,
    1,
    now()
  )
  on conflict (user_id) do update set
    xp = public.gamification_profiles.xp
      + case
          when public.gamification_profiles.last_activity_at is null
            or public.gamification_profiles.last_activity_at::date is distinct from today
          then delta
          else 0
        end,
    level = greatest(
      1,
      floor((
        public.gamification_profiles.xp
        + case
            when public.gamification_profiles.last_activity_at is null
              or public.gamification_profiles.last_activity_at::date is distinct from today
            then delta
            else 0
          end
      ) / 100.0)::int + 1
    ),
    streak_days = case
      when public.gamification_profiles.last_activity_at::date = today - 1 then public.gamification_profiles.streak_days + 1
      when public.gamification_profiles.last_activity_at::date = today then public.gamification_profiles.streak_days
      else 1
    end,
    last_activity_at = now(),
    updated_at = now();

  select * into r
  from public.gamification_profiles
  where user_id = p_user_id;

  return r;
end;
$$;

revoke execute on function public.register_gamification_activity(uuid, integer) from anon;
grant execute on function public.register_gamification_activity(uuid, integer) to authenticated;
