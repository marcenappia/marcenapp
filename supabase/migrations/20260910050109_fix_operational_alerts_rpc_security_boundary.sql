create or replace function public.refresh_project_operational_alerts(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_project public.projects%rowtype;
  v_dna public.marcenaria_dna%rowtype;
  v_count integer := 0;
  v_current_thickness numeric;
  v_min_margin numeric;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_project from public.projects where id=p_project_id and user_id=v_user;
  if not found then raise exception 'project_not_found'; end if;
  select * into v_dna from public.marcenaria_dna where user_id=v_user;
  delete from public.operational_alerts where user_id=v_user and entity_type='project' and entity_id=p_project_id and status='open' and source='operational_intelligence';
  if v_dna.user_id is null then
    insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action)
    values(v_user,'DNA_NOT_CONFIGURED','INFO','project',p_project_id,'operational_intelligence','DNA da marcenaria não está configurado. Nenhuma regra comercial ou técnica foi inventada.','{"missing":"marcenaria_dna"}'::jsonb,'Configurar DNA da marcenaria');
    return 1;
  end if;
  v_min_margin := v_dna.minimum_margin_pct;
  if v_min_margin is not null and v_project.profit_margin is not null and v_project.profit_margin < v_min_margin then
    insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action)
    values(v_user,'LOW_MARGIN','ATENCAO','project',p_project_id,'operational_intelligence','Margem configurada no projeto está abaixo do mínimo definido no DNA.',jsonb_build_object('configured_margin',v_min_margin,'project_margin',v_project.profit_margin,'project_id',p_project_id),'Revisar custos e orçamento');
    v_count := v_count + 1;
  end if;
  if v_dna.standard_mdf_thickness_mm is not null then
    v_current_thickness := null;
    if v_project.external_material ~ 'mdf[0-9]+' then v_current_thickness := substring(v_project.external_material from 'mdf([0-9]+)')::numeric; end if;
    if v_current_thickness is not null and v_current_thickness <> v_dna.standard_mdf_thickness_mm then
      insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action)
      values(v_user,'MDF_THICKNESS_MISMATCH','ATENCAO','project',p_project_id,'operational_intelligence','A espessura do MDF externo do projeto diverge do padrão cadastrado no DNA.',jsonb_build_object('standard_thickness_mm',v_dna.standard_mdf_thickness_mm,'project_thickness_mm',v_current_thickness,'material',v_project.external_material),'Revisar material do projeto');
      v_count := v_count + 1;
    end if;
  end if;
  if v_count = 0 then
    insert into public.operational_alerts(user_id,alert_type,severity,entity_type,entity_id,source,message,evidence,suggested_action)
    values(v_user,'PROJECT_CHECKED','INFO','project',p_project_id,'operational_intelligence','Projeto analisado: nenhuma divergência configurada foi encontrada.',jsonb_build_object('project_margin',v_project.profit_margin,'minimum_margin',v_min_margin,'standard_mdf_thickness_mm',v_dna.standard_mdf_thickness_mm),'Nenhuma ação necessária');
    v_count := 1;
  end if;
  return v_count;
end;
$$;
revoke all on function public.refresh_project_operational_alerts(uuid) from public, anon;
grant execute on function public.refresh_project_operational_alerts(uuid) to authenticated;
