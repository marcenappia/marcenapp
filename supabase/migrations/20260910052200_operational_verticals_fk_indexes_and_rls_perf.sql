-- Performance hardening for new operational FKs and tenant RLS predicates.
create index if not exists idx_hardware_items_supplier on public.hardware_items(supplier_id);
create index if not exists idx_hardware_purchase_items_hardware on public.hardware_purchase_items(hardware_id);
create index if not exists idx_hardware_purchase_items_purchase on public.hardware_purchase_items(purchase_id);
create index if not exists idx_hardware_purchases_supplier on public.hardware_purchases(supplier_id);
create index if not exists idx_hardware_stock_hardware on public.hardware_stock(hardware_id);
create index if not exists idx_project_hardware_requirements_hardware on public.project_hardware_requirements(hardware_id);
create index if not exists idx_project_production_project_fk on public.project_production_stages(project_id);
create index if not exists idx_project_sales_project_fk on public.project_sales(project_id);
create index if not exists idx_project_receivables_project_fk on public.project_receivables(project_id);
create index if not exists idx_project_expenses_project_fk on public.project_expenses(project_id);
create index if not exists idx_project_cost_snapshots_project_fk on public.project_cost_snapshots(project_id);

drop policy if exists marcenaria_dna_select_own on public.marcenaria_dna;
drop policy if exists marcenaria_dna_insert_own on public.marcenaria_dna;
drop policy if exists marcenaria_dna_update_own on public.marcenaria_dna;
drop policy if exists marcenaria_dna_delete_own on public.marcenaria_dna;
create policy marcenaria_dna_select_own on public.marcenaria_dna for select to authenticated using ((select auth.uid()) = user_id);
create policy marcenaria_dna_insert_own on public.marcenaria_dna for insert to authenticated with check ((select auth.uid()) = user_id);
create policy marcenaria_dna_update_own on public.marcenaria_dna for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy marcenaria_dna_delete_own on public.marcenaria_dna for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists operational_alerts_select_own on public.operational_alerts;
drop policy if exists operational_alerts_insert_own on public.operational_alerts;
drop policy if exists operational_alerts_update_own on public.operational_alerts;
drop policy if exists operational_alerts_delete_own on public.operational_alerts;
create policy operational_alerts_select_own on public.operational_alerts for select to authenticated using ((select auth.uid()) = user_id);
create policy operational_alerts_insert_own on public.operational_alerts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy operational_alerts_update_own on public.operational_alerts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy operational_alerts_delete_own on public.operational_alerts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists project_cost_select_own on public.project_cost_snapshots;
drop policy if exists project_cost_insert_own on public.project_cost_snapshots;
drop policy if exists project_cost_update_own on public.project_cost_snapshots;
drop policy if exists project_cost_delete_own on public.project_cost_snapshots;
create policy project_cost_select_own on public.project_cost_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy project_cost_insert_own on public.project_cost_snapshots for insert to authenticated with check ((select auth.uid()) = user_id and exists(select 1 from public.projects p where p.id=project_cost_snapshots.project_id and p.user_id=(select auth.uid())));
create policy project_cost_update_own on public.project_cost_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists(select 1 from public.projects p where p.id=project_cost_snapshots.project_id and p.user_id=(select auth.uid())));
create policy project_cost_delete_own on public.project_cost_snapshots for delete to authenticated using ((select auth.uid()) = user_id);
