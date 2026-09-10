-- MAR-007: failed paid operations must not retain a debit.
-- Execution remains server-authoritative; only service_role may call this function.

create or replace function public.refund_billing_credit(
  p_user_id uuid,
  p_operation_type text,
  p_idempotency_key text
)
returns table(refunded boolean, credit_type text, credit_cost integer, rule_version integer, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumption public.billing_credit_consumptions%rowtype;
  v_wallet public.billing_wallets%rowtype;
begin
  if p_user_id is null or p_operation_type is null or btrim(p_operation_type) = '' or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'invalid_refund_request';
  end if;

  select * into v_consumption
  from public.billing_credit_consumptions
  where user_id = p_user_id
    and operation_type = p_operation_type
    and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return query select false, null::text, null::integer, null::integer, 'not_found'::text;
    return;
  end if;

  if v_consumption.status = 'refunded' then
    return query select true, v_consumption.credit_type, v_consumption.credit_cost, v_consumption.rule_version, v_consumption.status;
    return;
  end if;

  insert into public.billing_wallets(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into v_wallet from public.billing_wallets where user_id = p_user_id for update;

  update public.billing_wallets
  set image_credits = case when v_consumption.credit_type = 'image' then image_credits + v_consumption.credit_cost else image_credits end,
      contract_credits = case when v_consumption.credit_type = 'contract' then contract_credits + v_consumption.credit_cost else contract_credits end,
      cut_plan_credits = case when v_consumption.credit_type = 'cut_plan' then cut_plan_credits + v_consumption.credit_cost else cut_plan_credits end,
      marcena_credits = case when v_consumption.credit_type = 'marcena' then marcena_credits + v_consumption.credit_cost else marcena_credits end,
      updated_at = now()
  where user_id = p_user_id;

  update public.billing_credit_consumptions
  set status = 'refunded', refunded_at = now()
  where id = v_consumption.id;

  return query select true, v_consumption.credit_type, v_consumption.credit_cost, v_consumption.rule_version, 'refunded'::text;
end;
$$;

revoke execute on function public.refund_billing_credit(uuid, text, text) from public, anon, authenticated;
grant execute on function public.refund_billing_credit(uuid, text, text) to service_role;
