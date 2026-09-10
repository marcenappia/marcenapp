-- Fix MAR-007: qualify billing_credit_rules columns so PL/pgSQL output/variable names cannot shadow them.
create or replace function public.consume_billing_credit(
  p_user_id uuid,
  p_operation_type text,
  p_idempotency_key text
)
returns table(consumed boolean, credit_type text, credit_cost integer, rule_version integer, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.billing_credit_rules%rowtype;
  v_existing public.billing_credit_consumptions%rowtype;
  v_wallet public.billing_wallets%rowtype;
begin
  if p_user_id is null or p_operation_type is null or btrim(p_operation_type) = '' or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'invalid_consumption_request';
  end if;

  if auth.uid() is distinct from p_user_id and current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'user_mismatch';
  end if;

  select * into v_existing
  from public.billing_credit_consumptions c
  where c.user_id = p_user_id
    and c.operation_type = p_operation_type
    and c.idempotency_key = p_idempotency_key
  for update;

  if found then
    return query select true, v_existing.credit_type, v_existing.credit_cost, v_existing.rule_version, v_existing.status;
    return;
  end if;

  select r.* into v_rule
  from public.billing_credit_rules r
  where r.operation_type = p_operation_type
    and r.enabled = true
    and r.credit_cost is not null
    and r.credit_cost > 0
  order by r.version desc
  limit 1;

  if not found then
    raise exception 'commercial_rule_missing';
  end if;

  insert into public.billing_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.billing_wallets w
  where w.user_id = p_user_id
  for update;

  if (case v_rule.credit_type
      when 'image' then v_wallet.image_credits
      when 'contract' then v_wallet.contract_credits
      when 'cut_plan' then v_wallet.cut_plan_credits
      when 'marcena' then v_wallet.marcena_credits
    end) < v_rule.credit_cost then
    raise exception 'insufficient_credits';
  end if;

  update public.billing_wallets
  set image_credits = case when v_rule.credit_type = 'image' then image_credits - v_rule.credit_cost else image_credits end,
      contract_credits = case when v_rule.credit_type = 'contract' then contract_credits - v_rule.credit_cost else contract_credits end,
      cut_plan_credits = case when v_rule.credit_type = 'cut_plan' then cut_plan_credits - v_rule.credit_cost else cut_plan_credits end,
      marcena_credits = case when v_rule.credit_type = 'marcena' then marcena_credits - v_rule.credit_cost else marcena_credits end,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.billing_credit_consumptions(user_id, operation_type, credit_type, credit_cost, rule_version, idempotency_key)
  values (p_user_id, p_operation_type, v_rule.credit_type, v_rule.credit_cost, v_rule.version, p_idempotency_key);

  return query select true, v_rule.credit_type, v_rule.credit_cost, v_rule.version, 'consumed'::text;
exception
  when unique_violation then
    select * into v_existing
    from public.billing_credit_consumptions c
    where c.user_id = p_user_id
      and c.operation_type = p_operation_type
      and c.idempotency_key = p_idempotency_key;
    if found then
      return query select true, v_existing.credit_type, v_existing.credit_cost, v_existing.rule_version, v_existing.status;
      return;
    end if;
    raise;
end;
$$;

revoke execute on function public.consume_billing_credit(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_billing_credit(uuid, text, text) to service_role;
