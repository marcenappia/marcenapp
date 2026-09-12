create table if not exists public.ai_rate_limits (
  user_id uuid not null,
  fn text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (user_id, fn)
);

-- PostgreSQL cannot change a function's return row type with CREATE OR REPLACE.
-- Older/local reconstructed databases may already contain this RPC under the
-- same input signature but with a different OUT/RETURNS TABLE contract.
-- Recreate it only in that incompatible case, and refuse to use CASCADE when
-- dependencies exist so callers cannot be broken silently.
do $$
declare
  v_oid oid;
  v_return_type text;
begin
  select p.oid, pg_get_function_result(p.oid)
    into v_oid, v_return_type
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'consume_ai_rate_limit'
    and pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _fn text, _limit integer, _window_seconds integer';

  if v_oid is not null and v_return_type <> 'TABLE(allowed boolean, retry_after_seconds integer)' then
    if exists (
      select 1
      from pg_depend d
      where d.refobjid = v_oid
        and d.objid <> v_oid
        and d.deptype = 'n'
    ) then
      raise exception 'consume_ai_rate_limit has dependent database objects; refusing to DROP/CREATE incompatible return type';
    end if;

    drop function public.consume_ai_rate_limit(uuid, text, integer, integer);
  end if;
end;
$$;

create or replace function public.consume_ai_rate_limit(
  _user_id uuid,
  _fn text,
  _limit integer,
  _window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  insert into public.ai_rate_limits(user_id, fn, window_started_at, request_count)
  values (_user_id, _fn, now(), 1)
  on conflict (user_id, fn) do update
    set window_started_at = case
          when now() >= public.ai_rate_limits.window_started_at + make_interval(secs => _window_seconds)
          then now()
          else public.ai_rate_limits.window_started_at
        end,
        request_count = case
          when now() >= public.ai_rate_limits.window_started_at + make_interval(secs => _window_seconds)
          then 1
          else public.ai_rate_limits.request_count + 1
        end
  returning window_started_at, request_count into v_window, v_count;

  if v_count <= _limit then
    return query select true, 0;
  end if;

  return query
    select false,
      greatest(
        1,
        ceil(extract(epoch from (
          v_window + make_interval(secs => _window_seconds) - now()
        )))::integer
      );
end;
$$;

revoke all on function public.consume_ai_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_rate_limit(uuid, text, integer, integer) to service_role;
revoke all on table public.ai_rate_limits from public, anon, authenticated;
grant all on table public.ai_rate_limits to service_role;
