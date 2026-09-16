-- Keep active subscription plans aligned with the included-tool contract.
-- IDs are resolved from billing_plans; no generated IDs are hardcoded.
insert into public.billing_plan_entitlements (plan_id, operation_type, access_mode, credit_cost)
select p.id, op.operation_type, 'included', 0
from public.billing_plans p
cross join (values
  ('calcularOrcamento'),
  ('gerarContrato'),
  ('gerarPlanoCorte'),
  ('gerarRender')
) as op(operation_type)
where p.code in ('essencial','profissional','empresa','pro_factory')
  and p.status = 'active'
on conflict (plan_id, operation_type) do update
set access_mode = excluded.access_mode,
    credit_cost = excluded.credit_cost;
