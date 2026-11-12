alter table public.project_cost_snapshots
  add column if not exists freight_cost numeric not null default 0,
  add column if not exists installation_cost numeric not null default 0,
  add column if not exists design_cost numeric not null default 0,
  add column if not exists tax_cost numeric not null default 0,
  add column if not exists contingency_cost numeric not null default 0,
  add column if not exists discount numeric not null default 0,
  add column if not exists payment_terms text,
  add column if not exists notes text;

alter table public.project_cost_snapshots
  drop constraint if exists project_cost_nonnegative;

alter table public.project_cost_snapshots
  add constraint project_cost_nonnegative check (
    (sale_price is null or sale_price >= 0) and
    (material_cost is null or material_cost >= 0) and
    (hardware_cost is null or hardware_cost >= 0) and
    (labor_cost is null or labor_cost >= 0) and
    (other_cost is null or other_cost >= 0) and
    (freight_cost >= 0) and
    (installation_cost >= 0) and
    (design_cost >= 0) and
    (tax_cost >= 0) and
    (contingency_cost >= 0) and
    (discount >= 0)
  );
