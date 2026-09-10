-- Marcenapp commercial access model
-- Plans grant entitlements; credit products can be scoped to one tool.
-- Prices intentionally remain NULL until unit economics are validated.

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  monthly_price_cents integer,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.billing_plans(id) on delete cascade,
  operation_type text not null,
  access_mode text not null default 'included' check (access_mode in ('included','credit','blocked')),
  credit_cost integer not null default 0 check (credit_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, operation_type)
);

create table if not exists public.billing_credit_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  operation_type text not null,
  credit_type text not null,
  credits integer not null default 1 check (credits > 0),
  price_cents integer,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_plan_entitlements_operation_idx on public.billing_plan_entitlements(operation_type);
create index if not exists billing_credit_products_operation_idx on public.billing_credit_products(operation_type);

-- Budget is a first-class credit scope, so extend the existing type constraint.
alter table public.billing_credit_rules drop constraint if exists billing_credit_rules_credit_type_check;
alter table public.billing_credit_rules add constraint billing_credit_rules_credit_type_check check (credit_type in ('image','contract','budget','cut_plan','marcena'));

alter table public.billing_plans enable row level security;
alter table public.billing_plan_entitlements enable row level security;
alter table public.billing_credit_products enable row level security;
grant select on public.billing_plans, public.billing_plan_entitlements, public.billing_credit_products to authenticated;

drop policy if exists billing_plans_select_authenticated on public.billing_plans;
create policy billing_plans_select_authenticated on public.billing_plans for select to authenticated using (status = 'active');

drop policy if exists billing_plan_entitlements_select_authenticated on public.billing_plan_entitlements;
create policy billing_plan_entitlements_select_authenticated on public.billing_plan_entitlements for select to authenticated using (exists (select 1 from public.billing_plans p where p.id = plan_id and p.status = 'active'));

drop policy if exists billing_credit_products_select_authenticated on public.billing_credit_products;
create policy billing_credit_products_select_authenticated on public.billing_credit_products for select to authenticated using (status = 'active');

insert into public.billing_plans (code,name,description,status,sort_order)
values ('master','Master','Plano completo com acesso às ferramentas premium do Marcenapp.','draft',100)
on conflict (code) do update set name=excluded.name,description=excluded.description,updated_at=now();

insert into public.billing_plan_entitlements (plan_id,operation_type,access_mode,credit_cost)
select p.id,v.operation_type,'included',0 from public.billing_plans p
cross join (values ('gerarRender'),('gerarContrato'),('calcularOrcamento'),('gerarPlanoCorte')) v(operation_type)
where p.code='master'
on conflict (plan_id,operation_type) do update set access_mode=excluded.access_mode,credit_cost=excluded.credit_cost,updated_at=now();

insert into public.billing_credit_products (code,name,description,operation_type,credit_type,credits,status,sort_order) values
('render_unit','Crédito de Render','Um uso de render do Estúdio.','gerarRender','image',1,'draft',10),
('contract_unit','Crédito de Contrato','Uma geração de contrato/cláusulas assistidas por IA.','gerarContrato','contract',1,'draft',20),
('budget_unit','Crédito de Orçamento','Uma operação de orçamento do Marcenapp.','calcularOrcamento','budget',1,'draft',30),
('cut_plan_unit','Crédito de Plano de Corte','Uma geração de plano de corte.','gerarPlanoCorte','cut_plan',1,'draft',40)
on conflict (code) do update set name=excluded.name,description=excluded.description,operation_type=excluded.operation_type,credit_type=excluded.credit_type,credits=excluded.credits,updated_at=now();

insert into public.billing_credit_rules(operation_type,credit_type,credit_cost,enabled,version,idempotency) values
('calcularOrcamento','budget',1,false,1,true),('gerarPlanoCorte','cut_plan',1,false,1,true)
on conflict (operation_type,version) do update set credit_type=excluded.credit_type,credit_cost=excluded.credit_cost,enabled=excluded.enabled,idempotency=excluded.idempotency,updated_at=now();

comment on table public.billing_plans is 'Commercial subscription plans and lifecycle state.';
comment on table public.billing_plan_entitlements is 'Per-tool access rules for each subscription plan.';
comment on table public.billing_credit_products is 'Purchasable credit packs, optionally scoped to one tool.';
