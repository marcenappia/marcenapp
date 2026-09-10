create or replace function public.refresh_project_operational_alerts(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid(); v_project public.projects%rowtype; v_dna public.marcenaria_dna%rowtype; v_cost public.project_cost_snapshots%rowtype; v_count integer := 0; v_current_thickness numeric; v_min_margin numeric; v_current_margin numeric; v_total_cost numeric;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_project from public.projects where id=p_project_id and user_id=v_user; if not found then raise exception 'project_not_found'; end if;
  select * into v_dna from public.marcenaria_dna where user_id=v_user; select * into v_cost from public.project_cost_snapshots where user_id=v_user and project_id=p_project_id;
  delete from public.operational_alerts where user_id=v_user and entity_type='project' and entity_id=p_project_id and status='open' and source='operational_intelligence';
  if v_dna.user_id is null then
    insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action) values(v_user,'DNA_NOT_CONFIGURED','INFO','project',p_project_id,'operational_intelligence','DNA da marcenaria não está configurado. Nenhuma regra comercial ou técnica foi inventada.','{"missing":"marcenaria_dna"}'::jsonb,'Configurar DNA da marcenaria'); return 1;
  end if;
  v_min_margin := v_dna.minimum_margin_pct;
  if v_cost.sale_price is not null and v_cost.sale_price > 0 and v_cost.material_cost is not null and v_cost.hardware_cost is not null and v_cost.labor_cost is not null then
    v_total_cost := coalesce(v_cost.material_cost,0)+coalesce(v_cost.hardware_cost,0)+coalesce(v_cost.labor_cost,0)+coalesce(v_cost.other_cost,0); v_current_margin := ((v_cost.sale_price-v_total_cost)/v_cost.sale_price)*100;
    if v_min_margin is not null and v_current_margin < v_min_margin then
      insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action) values(v_user,'LOW_MARGIN','ATENCAO','project',p_project_id,'operational_intelligence','Margem real calculada está abaixo do mínimo definido no DNA.',jsonb_build_object('configured_margin',v_min_margin,'current_margin',round(v_current_margin,2),'sale_price',v_cost.sale_price,'total_cost',v_total_cost),'Revisar custos e orçamento'); v_count := v_count + 1;
    end if;
  else
    insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action) values(v_user,'MARGIN_DATA_INSUFFICIENT','INFO','project',p_project_id,'operational_intelligence','Dados insuficientes para calcular margem real.',jsonb_build_object('required','sale_price,material_cost,hardware_cost,labor_cost'),'Informar custos reais e preço de venda'); v_count := v_count + 1;
  end if;
  if v_dna.standard_mdf_thickness_mm is not null then
    v_current_thickness := null; if v_project.external_material ~ 'mdf[0-9]+' then v_current_thickness := substring(v_project.external_material from 'mdf([0-9]+)')::numeric; end if;
    if v_current_thickness is not null and v_current_thickness <> v_dna.standard_mdf_thickness_mm then
      insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action) values(v_user,'MDF_THICKNESS_MISMATCH','ATENCAO','project',p_project_id,'operational_intelligence','A espessura do MDF externo do projeto diverge do padrão cadastrado no DNA.',jsonb_build_object('standard_thickness_mm',v_dna.standard_mdf_thickness_mm,'project_thickness_mm',v_current_thickness,'material',v_project.external_material),'Revisar material do projeto'); v_count := v_count + 1;
    end if;
  end if;
  if v_count = 0 then
    insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action) values(v_user,'PROJECT_CHECKED','INFO','project',p_project_id,'operational_intelligence','Projeto analisado: nenhuma divergência configurada foi encontrada.',jsonb_build_object('project_margin',v_project.profit_margin,'minimum_margin',v_min_margin,'standard_mdf_thickness_mm',v_dna.standard_mdf_thickness_mm),'Nenhuma ação necessária'); v_count := 1;
  end if; return v_count;
end;
$$;
revoke all on function public.refresh_project_operational_alerts(uuid) from public, anon; grant execute on function public.refresh_project_operational_alerts(uuid) to authenticated;
