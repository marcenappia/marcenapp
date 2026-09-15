import { supabase } from '@/integrations/supabase/client';
import type { ToolResult } from './toolRegistry';

const db = supabase;

type SmartAction =
  | 'materials'
  | 'hardware'
  | 'inventory'
  | 'production'
  | 'cut'
  | 'budget'
  | 'documents'
  | 'order'
  | 'assembly'
  | 'installation'
  | 'checklist'
  | 'delivery'
  | 'review_project'
  | 'check_measurements';

function projectIdOrError(projectId?: string): ToolResult<never> | null {
  return projectId ? null : { ok: false, error: 'Selecione ou crie um projeto antes de executar esta ação.' };
}

export async function executeIaraSmartAction(action: SmartAction, projectId?: string): Promise<ToolResult<Record<string, unknown>>> {
  const missingProject = projectIdOrError(projectId);
  if (missingProject) return missingProject;

  if (action === 'materials') {
    const [{ data: project, error: projectError }, { data: materials, error: materialError }] = await Promise.all([
      db.from('projects').select('id,nome,name,internal_material,external_material,back_material').eq('id', projectId!).maybeSingle(),
      db.from('marcenaria_materiais').select('id,nome,categoria,unidade,espessura,preco,fornecedor,ativo').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('ativo', true).order('nome'),
    ]);
    if (projectError) return { ok: false, error: projectError.message };
    if (materialError) return { ok: false, error: materialError.message };
    return { ok: true, data: { action, project, materials: materials ?? [] } };
  }

  if (action === 'hardware') {
    const { data, error } = await db.from('project_hardware_requirements').select('id,hardware_id,quantity_required,source,rule_key,hardware_items(name,category,sku,unit,unit_price,minimum_stock,active)').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { action, projectId, hardware: data ?? [] } };
  }

  if (action === 'inventory') {
    const userId = (await db.auth.getUser()).data.user?.id;
    if (!userId) return { ok: false, error: 'Sessão do usuário não encontrada.' };
    const [{ data: materials, error: materialError }, { data: hardware, error: hardwareError }] = await Promise.all([
      db.from('marcenaria_estoque').select('id,material_id,nome_item,quantidade,unidade,localizacao,atualizado_em').eq('user_id', userId).order('nome_item'),
      db.from('hardware_stock').select('id,hardware_id,quantity_on_hand,updated_at,hardware_items(name,category,sku,unit,minimum_stock,active)').eq('user_id', userId).order('updated_at', { ascending: false }),
    ]);
    if (materialError) return { ok: false, error: materialError.message };
    if (hardwareError) return { ok: false, error: hardwareError.message };
    return { ok: true, data: { action, projectId, materials: materials ?? [], hardware: hardware ?? [] } };
  }

  if (action === 'production') {
    const { data, error } = await db.from('project_production_stages').select('id,stage_key,stage_name,status,responsible,started_at,due_at,completed_at,blocked_reason,notes').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!).order('created_at');
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { action, projectId, stages: data ?? [] } };
  }

  if (action === 'cut') {
    const { data, error } = await db.from('project_versions').select('id,version_number,status,cut_plan_path,snapshot,created_at').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!).order('version_number', { ascending: false }).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data?.cut_plan_path) return { ok: false, error: 'Este projeto ainda não possui plano de corte gerado. Primeiro é necessário concluir a engenharia do móvel e a otimização de corte.' };
    return { ok: true, data: { action, projectId, version: data } };
  }

  if (action === 'budget') {
    const { data, error } = await db.from('project_cost_snapshots').select('id,project_id,sale_price,material_cost,hardware_cost,labor_cost,other_cost,source,created_at,updated_at').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'Este projeto ainda não possui um orçamento salvo.' };
    return { ok: true, data: { action, projectId, budget: data } };
  }

  if (action === 'documents') {
    const [{ data: documents, error: documentError }, { data: contracts, error: contractError }] = await Promise.all([
      db.from('marcenaria_documentos').select('id,nome,tipo,storage_path,status,metadata,created_at,updated_at').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').order('created_at', { ascending: false }),
      db.from('project_contracts').select('id,contract_number,status,document_path,document_hash,created_at,updated_at').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!).order('created_at', { ascending: false }),
    ]);
    if (documentError) return { ok: false, error: documentError.message };
    if (contractError) return { ok: false, error: contractError.message };
    return { ok: true, data: { action, projectId, documents: documents ?? [], contracts: contracts ?? [] } };
  }

  if (action === 'order') {
    const [{ data: sale, error: saleError }, { data: approvals, error: approvalError }] = await Promise.all([
      db.from('project_sales').select('id,sale_price,sold_at,status,created_at,updated_at').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!).maybeSingle(),
      db.from('project_approvals').select('id,client_name,client_email,approved_at,environment_id,created_at').eq('project_id', projectId!).order('created_at', { ascending: false }),
    ]);
    if (saleError) return { ok: false, error: saleError.message };
    if (approvalError) return { ok: false, error: approvalError.message };
    return { ok: true, data: { action, projectId, sale, approvals: approvals ?? [] } };
  }

  if (action === 'assembly' || action === 'installation' || action === 'checklist' || action === 'delivery') {
    const { data, error } = await db.from('project_production_stages').select('id,stage_key,stage_name,status,responsible,started_at,due_at,completed_at,blocked_reason,notes').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!).order('created_at');
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { action, projectId, executionStages: data ?? [], executionSupport: 'status_read_only' } };
  }

  if (action === 'review_project') {
    const [{ data: project, error: projectError }, { data: versions, error: versionError }, { data: approvals, error: approvalError }] = await Promise.all([
      db.from('projects').select('*').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('id', projectId!).maybeSingle(),
      db.from('project_versions').select('id,version_number,status,render_path,technical_drawing_path,cut_plan_path,client_budget_summary,environment_id,created_at').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('project_id', projectId!).order('version_number', { ascending: false }),
      db.from('project_approvals').select('id,client_name,client_email,approved_at,environment_id,created_at').eq('project_id', projectId!).order('created_at', { ascending: false }),
    ]);
    if (projectError) return { ok: false, error: projectError.message };
    if (versionError) return { ok: false, error: versionError.message };
    if (approvalError) return { ok: false, error: approvalError.message };
    return { ok: true, data: { action, project, versions: versions ?? [], approvals: approvals ?? [] } };
  }

  const { data: project, error } = await db.from('projects').select('id,nome,name,width,height,depth,modules,drawers,doors,internal_material,external_material,back_material').eq('user_id', (await db.auth.getUser()).data.user?.id ?? '').eq('id', projectId!).maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { action, project, note: 'Ação conectada ao contexto real do projeto; validação detalhada depende dos dados disponíveis.' } };
}
