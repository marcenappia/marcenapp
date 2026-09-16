-- Keep public-share rate-limit state outside the exposed Data API schema.
-- Supabase recommends a private schema for internal rate-limit state.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.public_share_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0
);

insert into private.public_share_rate_limits(bucket_key, window_started_at, request_count)
select bucket_key, window_started_at, request_count
from public.public_share_rate_limits
on conflict (bucket_key) do update set
  window_started_at = excluded.window_started_at,
  request_count = excluded.request_count;

alter table private.public_share_rate_limits enable row level security;
revoke all privileges on table private.public_share_rate_limits from public, anon, authenticated;

create or replace function public.consume_public_share_rate_limit(
  p_operation text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_headers jsonb;
  v_ip text;
  v_key text;
  v_now timestamptz := now();
  v_row private.public_share_rate_limits;
begin
  if p_operation is null
     or p_operation not in ('review', 'approve', 'change')
     or p_limit < 1
     or p_window_seconds < 1 then
    return false;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := coalesce(
    nullif(trim(v_headers->>'cf-connecting-ip'), ''),
    nullif(trim(split_part(v_headers->>'x-forwarded-for', ',', 1)), ''),
    'unknown'
  );

  v_key := 'share:' || p_operation || ':' || left(v_ip, 128);

  insert into private.public_share_rate_limits(bucket_key, window_started_at, request_count)
  values(v_key, v_now, 1)
  on conflict (bucket_key) do update
    set request_count = case
      when v_now - private.public_share_rate_limits.window_started_at >= make_interval(secs => p_window_seconds)
        then 1
      else private.public_share_rate_limits.request_count + 1
    end,
    window_started_at = case
      when v_now - private.public_share_rate_limits.window_started_at >= make_interval(secs => p_window_seconds)
        then v_now
      else private.public_share_rate_limits.window_started_at
    end
  returning * into v_row;

  return v_row.request_count <= p_limit;
end;
$function$;

revoke all on function public.consume_public_share_rate_limit(text, integer, integer) from public, anon, authenticated;

drop table public.public_share_rate_limits;
