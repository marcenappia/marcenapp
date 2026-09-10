create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'admin'::public.app_role
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to authenticated, service_role;

create or replace function public.admin_list_billing_credit_rules()
returns setof public.billing_credit_rules
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception using errcode='42501', message='admin_required';
  end if;
  return query select * from public.billing_credit_rules order by operation_type, version desc;
end;
$$;

create or replace function public.admin_upsert_billing_credit_rule(
  p_operation_type text,
  p_credit_type text,
  p_credit_cost integer,
  p_enabled boolean,
  p_version integer,
  p_idempotency boolean
)
returns public.billing_credit_rules
language plpgsql
security definer
set search_path = public
as $$
declare v_rule public.billing_credit_rules;
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception using errcode='42501', message='admin_required';
  end if;
  if p_operation_type is null or btrim(p_operation_type) = '' then
    raise exception using errcode='22023', message='operation_type_required';
  end if;
  if p_credit_type is null or btrim(p_credit_type) = '' then
    raise exception using errcode='22023', message='credit_type_required';
  end if;
  if p_credit_cost is null or p_credit_cost <= 0 then
    raise exception using errcode='22023', message='credit_cost_must_be_positive';
  end if;
  if p_version is null or p_version <= 0 then
    raise exception using errcode='22023', message='version_must_be_positive';
  end if;

  insert into public.billing_credit_rules(operation_type, credit_type, credit_cost, enabled, version, idempotency)
  values (btrim(p_operation_type), btrim(p_credit_type), p_credit_cost, coalesce(p_enabled,true), p_version, coalesce(p_idempotency,true))
  on conflict (operation_type, version) do update set
    credit_type = excluded.credit_type,
    credit_cost = excluded.credit_cost,
    enabled = excluded.enabled,
    idempotency = excluded.idempotency,
    updated_at = now()
  returning * into v_rule;

  return v_rule;
end;
$$;

revoke all on function public.admin_list_billing_credit_rules() from public;
revoke all on function public.admin_upsert_billing_credit_rule(text,text,integer,boolean,integer,boolean) from public;
grant execute on function public.admin_list_billing_credit_rules() to authenticated, service_role;
grant execute on function public.admin_upsert_billing_credit_rule(text,text,integer,boolean,integer,boolean) to authenticated, service_role;
