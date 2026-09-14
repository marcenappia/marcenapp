-- P0 billing concurrency guard: serialize external-resource creation by deterministic lock key.
-- The lock is a short-lived lease so a crashed request cannot block reconciliation forever.
create table if not exists public.billing_operation_locks (
  lock_key text primary key,
  owner_token uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_operation_locks enable row level security;
revoke all on public.billing_operation_locks from public, anon, authenticated;
grant select, insert, update, delete on public.billing_operation_locks to service_role;

create or replace function public.acquire_billing_operation_lock(
  p_lock_key text,
  p_owner_token uuid,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lock_key is null or length(trim(p_lock_key)) = 0 or p_owner_token is null then
    raise exception 'invalid_billing_lock';
  end if;

  insert into public.billing_operation_locks(lock_key, owner_token, expires_at)
  values (p_lock_key, p_owner_token, now() + make_interval(secs => greatest(10, least(p_lease_seconds, 600))))
  on conflict (lock_key) do update
    set owner_token = excluded.owner_token,
        expires_at = excluded.expires_at,
        updated_at = now()
    where public.billing_operation_locks.expires_at <= now();

  return exists (
    select 1
    from public.billing_operation_locks
    where lock_key = p_lock_key and owner_token = p_owner_token
  );
end;
$$;

create or replace function public.release_billing_operation_lock(
  p_lock_key text,
  p_owner_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.billing_operation_locks
  where lock_key = p_lock_key and owner_token = p_owner_token;
  return found;
end;
$$;

revoke all on function public.acquire_billing_operation_lock(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_billing_operation_lock(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_billing_operation_lock(text, uuid, integer) to service_role;
grant execute on function public.release_billing_operation_lock(text, uuid) to service_role;
