-- Public commercial pricing used by the landing page and Asaas purchase flow.
-- Prices are the existing Marcenapp purchase amounts already used by the Asaas function.

insert into public.billing_credit_products (code,name,description,operation_type,credit_type,credits,price_cents,status,sort_order)
values
  ('marcena_essencial','MARCENAPP Essencial','1 crédito Marcenapp para uso nas ferramentas do produto.','marcenapp','marcena',1,2990,'active',5),
  ('marcena_profissional','MARCENAPP Profissional','3 créditos Marcenapp para uso nas ferramentas do produto.','marcenapp','marcena',3,7990,'active',6)
on conflict (code) do update set
  name=excluded.name,
  description=excluded.description,
  operation_type=excluded.operation_type,
  credit_type=excluded.credit_type,
  credits=excluded.credits,
  price_cents=excluded.price_cents,
  status=excluded.status,
  sort_order=excluded.sort_order,
  updated_at=now();

grant select on public.billing_credit_products to anon;
drop policy if exists billing_credit_products_select_public_active on public.billing_credit_products;
create policy billing_credit_products_select_public_active on public.billing_credit_products for select to anon using (status = 'active');
