insert into public.billing_credit_rules(operation_type, credit_type, credit_cost, enabled, version, idempotency)
values ('gerarRender', 'image', 1, true, 1, true)
on conflict (operation_type, version) do update set
  credit_type = excluded.credit_type,
  credit_cost = excluded.credit_cost,
  enabled = excluded.enabled,
  idempotency = excluded.idempotency,
  updated_at = now();
