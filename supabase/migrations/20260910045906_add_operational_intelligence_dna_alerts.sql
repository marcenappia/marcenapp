create table if not exists public.marcenaria_dna (
  user_id uuid primary key references auth.users(id) on delete cascade,
  standard_mdf_thickness_mm numeric,
  back_thickness_mm numeric,
  minimum_margin_pct numeric,
  labor_cost_per_hour numeric,
  waste_pct numeric,
  standard_processes jsonb not null default '{}'::jsonb,
  machines jsonb not null default '{}'::jsonb,
  suppliers jsonb not null default '{}'::jsonb,
  material_prices jsonb not null default '{}'::jsonb,
  hardware_prices jsonb not null default '{}'::jsonb,
  construction_rules jsonb not null default '{}'::jsonb,
  production_rules jsonb not null default '{}'::jsonb,
  assembly_rules jsonb not null default '{}'::jsonb,
  financial_rules jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marcenaria_dna_min_margin_nonnegative check (minimum_margin_pct is null or minimum_margin_pct >= 0),
  constraint marcenaria_dna_waste_nonnegative check (waste_pct is null or waste_pct >= 0)
);

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null,
  severity text not null check (severity in ('INFO','ATENCAO','ERRO','CRITICO')),
  entity_type text not null,
  entity_id uuid,
  source text not null,
  message text not null,
  evidence jsonb not null default '{}'::jsonb,
  suggested_action text,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_alerts_user_status_idx on public.operational_alerts(user_id,status,created_at desc);
create index if not exists operational_alerts_entity_idx on public.operational_alerts(user_id,entity_type,entity_id);

alter table public.marcenaria_dna enable row level security;
alter table public.operational_alerts enable row level security;

drop policy if exists marcenaria_dna_select_own on public.marcenaria_dna;
drop policy if exists marcenaria_dna_insert_own on public.marcenaria_dna;
drop policy if exists marcenaria_dna_update_own on public.marcenaria_dna;
create policy marcenaria_dna_select_own on public.marcenaria_dna for select to authenticated using (user_id = auth.uid());
create policy marcenaria_dna_insert_own on public.marcenaria_dna for insert to authenticated with check (user_id = auth.uid());
create policy marcenaria_dna_update_own on public.marcenaria_dna for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists operational_alerts_select_own on public.operational_alerts;
drop policy if exists operational_alerts_update_own on public.operational_alerts;
create policy operational_alerts_select_own on public.operational_alerts for select to authenticated using (user_id = auth.uid());
create policy operational_alerts_update_own on public.operational_alerts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.refresh_project_operational_alerts(p_project_id uuid)
returns integer
language plpgsql
security invoker
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
