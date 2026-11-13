import { supabase } from '@/integrations/supabase/client';
import { optimizeCutList, type CutPart, type CutSheet } from '@/lib/cut/maxRects';
import type { ToolResult } from './toolRegistry';

const db = supabase;

export type SmartAction =
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

async function currentUserId(): Promise<string | null> {
  return (await db.auth.getUser()).data.user?.id ?? null;
}

function isCutPart(value: unknown): value is CutPart {
  if (!value || typeof value !== 'object') return false;
  const part = value as Record<string, unknown>;
  const quantityValid = part.quantity === undefined
    || (typeof part.quantity === 'number' && Number.isInteger(part.quantity) && part.quantity >= 1);
  const grainValid = part.grainSensitive === undefined || typeof part.grainSensitive === 'boolean';
  const rotationValid = part.allowRotation === undefined || typeof part.allowRotation === 'boolean';
  return typeof part.id === 'string'
    && part.id.length > 0
    && typeof part.width === 'number'
    && Number.isFinite(part.width)
    && part.width > 0
    && typeof part.height === 'number'
    && Number.isFinite(part.height)
    && part.height > 0
    && typeof part.material === 'string'
    && part.material.length > 0
    && quantityValid
    && grainValid
    && rotationValid;
}

function isCutSheet(value: unknown): value is CutSheet {
  if (!value || typeof value !== 'object') return false;
  const sheet = value as Record<string, unknown>;
  const thicknessValid = sheet.thickness === undefined
    || (typeof sheet.thickness === 'number' && Number.isFinite(sheet.thickness) && sheet.thickness > 0);
  return typeof sheet.id === 'string'
    && sheet.id.length > 0
    && typeof sheet.width === 'number'
    && Number.isFinite(sheet.width)
    && sheet.width > 0
    && typeof sheet.height === 'number'
    && Number.isFinite(sheet.height)
    && sheet.height > 0
    && typeof sheet.material === 'string'
    && sheet.material.length > 0
    && thicknessValid;
}

export function explicitCutInputs(snapshot: unknown): { parts: CutPart[]; sheetTemplates: CutSheet[]; kerf?: number } | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const value = snapshot as Record<string, unknown>;
  const cutPlan = value.cutPlan && typeof value.cutPlan === 'object' ? value.cutPlan as Record<string, unknown> : {};
  const savedInputs = cutPlan.inputs && typeof cutPlan.inputs === 'object' ? cutPlan.inputs as Record<string, unknown> : {};
  const technical = value.technicalStructure && typeof value.technicalStructure === 'object' ? value.technicalStructure as Record<string, unknown> : {};
  const candidateParts = Array.isArray(savedInputs.parts) ? savedInputs.parts : Array.isArray(value.parts) ? value.parts : technical.parts;
  if (!Array.isArray(candidateParts) || candidateParts.length === 0) return null;
  const parts = candidateParts.map((entry, index) => {
    if (isCutPart(entry)) return entry;
    if (!entry || typeof entry !== 'object') return null;
    const part = entry as Record<string, unknown>;
    if (typeof part.widthMm !== 'number' || typeof part.heightMm !== 'number' || typeof part.material !== 'string' || !part.material.trim()) return null;
    return {
      id: typeof part.id === 'string' && part.id ? part.id : `technical-part-${index + 1}`,
      width: part.widthMm,
      height: part.heightMm,
      quantity: typeof part.quantity === 'number' ? part.quantity : 1,
      material: part.material,
      grainSensitive: typeof part.grainSensitive === 'boolean' ? part.grainSensitive : false,
      allowRotation: typeof part.allowRotation === 'boolean' ? part.allowRotation : true,
    } satisfies CutPart;
  });
  if (parts.some((part) => !part) || !parts.every((part) => part && isCutPart(part))) return null;

  const candidateSheets = Array.isArray(savedInputs.sheetTemplates)
    ? savedInputs.sheetTemplates
    : Array.isArray(value.sheetTemplates)
      ? value.sheetTemplates
      : Array.isArray(technical.sheetTemplates)
        ? technical.sheetTemplates
        : null;
  let sheetTemplates: unknown[] = candidateSheets ?? [];
  if (!sheetTemplates.length && Array.isArray(technical.materialBindings)) {
    const unique = new Map<string, CutSheet>();
    technical.materialBindings.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const binding = entry as Record<string, unknown>;
      const width = Number(binding.sheetWidthMm);
      const height = Number(binding.sheetHeightMm);
      const material = typeof binding.name === 'string' ? binding.name.trim() : '';
      if (!material || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return;
      const thickness = typeof binding.thicknessMm === 'number' && binding.thicknessMm > 0 ? binding.thicknessMm : undefined;
      const id = typeof binding.materialId === 'string' && binding.materialId ? binding.materialId : `material-sheet-${index + 1}`;
      const key = `${material}|${width}|${height}|${thickness ?? ''}`;
      unique.set(key, { id, width, height, material, ...(thickness ? { thickness } : {}) });
    });
    sheetTemplates = [...unique.values()];
  }
  if (!sheetTemplates.length || !sheetTemplates.every(isCutSheet)) return null;
  const rawKerf = savedInputs.kerf ?? cutPlan.kerf ?? value.kerf;
  const kerf = typeof rawKerf === 'number' && Number.isFinite(rawKerf) && rawKerf >= 0 ? rawKerf : 3;
  return { parts: parts as CutPart[], sheetTemplates: sheetTemplates as CutSheet[], kerf };
}
export async function executeIaraSmartAction(action: SmartAction, projectId?: string): Promise<ToolResult<Record<string, unknown>>> {
  const missingProject = projectIdOrError(projectId);
  if (missingProject) return missingProject;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Sessão do usuário não encontrada.' };

  if (action === 'materials') {
    const [{ data: project, error: projectError }, { data: materials, error: materialError }, { data: version, error: versionError }] = await Promise.all([
      db.from('projects').select('id,nome,name,internal_material,external_material,back_material').eq('user_id', userId).eq('id', projectId!).maybeSingle(),
      db.from('marcenaria_materiais').select('id,nome,categoria,unidade,espessura,preco,fornecedor,largura_chapa,altura_chapa,sentido_veio,ativo').eq('user_id', userId).eq('ativo', true).order('nome'),
      db.from('project_versions').select('snapshot').eq('user_id', userId).eq('project_id', projectId!).order('version_number', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (projectError) return { ok: false, error: projectError.message };
    if (materialError) return { ok: false, error: materialError.message };
    if (versionError) return { ok: false, error: versionError.message };
    const snapshot = version?.snapshot && typeof version.snapshot === 'object' ? version.snapshot as Record<string, unknown> : {};
    const technical = snapshot.technicalStructure && typeof snapshot.technicalStructure === 'object' ? snapshot.technicalStructure as Record<string, unknown> : {};
    return { ok: true, data: { action, project, materials: materials ?? [], projectMaterials: Array.isArray(technical.materialBindings) ? technical.materialBindings : [], projectParts: Array.isArray(technical.parts) ? technical.parts : [], missingInformation: Array.isArray(technical.missingInformation) ? technical.missingInformation : [] } };
  }

  if (action === 'hardware') {
    const { error: refreshError } = await db.rpc('refresh_project_hardware_alerts', { p_project_id: projectId! });
    if (refreshError) return { ok: false, error: refreshError.message };
    const [{ data, error }, { data: catalog, error: catalogError }, { data: dna, error: dnaError }] = await Promise.all([
      db.from('project_hardware_requirements').select('id,hardware_id,quantity_required,source,rule_key,hardware_items(name,category,sku,unit,unit_price,minimum_stock,active)').eq('user_id', userId).eq('project_id', projectId!),
      db.from('hardware_items').select('id,name,category,sku,unit,unit_price,minimum_stock,supplier_id,active').eq('user_id', userId).eq('active', true).order('name'),
      db.from('marcenaria_dna').select('construction_rules').eq('user_id', userId).maybeSingle(),
    ]);
    if (error) return { ok: false, error: error.message };
    if (catalogError) return { ok: false, error: catalogError.message };
    if (dnaError) return { ok: false, error: dnaError.message };
    const rules = dna?.construction_rules && typeof dna.construction_rules === 'object' ? (dna.construction_rules as Record<string, unknown>).hardware_rules : null;
    return { ok: true, data: { action, projectId, hardware: data ?? [], catalog: catalog ?? [], rulesConfigured: Array.isArray(rules) && rules.length > 0 } };
  }

  if (action === 'inventory') {
    const [{ data: materials, error: materialError }, { data: hardware, error: hardwareError }] = await Promise.all([
      db.from('marcenaria_estoque').select('id,material_id,nome_item,quantidade,unidade,localizacao,atualizado_em').eq('user_id', userId).order('nome_item'),
      db.from('hardware_stock').select('id,hardware_id,quantity_on_hand,updated_at,hardware_items(name,category,sku,unit,minimum_stock,active)').eq('user_id', userId).order('updated_at', { ascending: false }),
    ]);
    if (materialError) return { ok: false, error: materialError.message };
    if (hardwareError) return { ok: false, error: hardwareError.message };
    return { ok: true, data: { action, projectId, materials: materials ?? [], hardware: hardware ?? [] } };
  }

  if (action === 'production') {
    const { data, error } = await db.from('project_production_stages').select('id,stage_key,stage_name,status,responsible,started_at,due_at,completed_at,blocked_reason,notes').eq('user_id', userId).eq('project_id', projectId!).order('created_at');
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { action, projectId, stages: data ?? [] } };
  }

  if (action === 'cut') {
    const { data, error } = await db.from('project_versions').select('id,version_number,status,cut_plan_path,snapshot,created_at').eq('user_id', userId).eq('project_id', projectId!).order('version_number', { ascending: false }).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'Este projeto ainda não possui uma versão para otimizar.' };

    const snapshot = data.snapshot && typeof data.snapshot === 'object' ? data.snapshot as Record<string, unknown> : {};
    const inputs = explicitCutInputs(snapshot);
    if (inputs) {
      const result = optimizeCutList(inputs.parts, inputs.sheetTemplates, inputs.kerf);
      const cutPlanStatus = result.unplaced.length ? 'needs_confirmation' : 'ready';
      const cutPlan = {
        version: 1,
        status: cutPlanStatus,
        optimizer: 'max_rects_best_short_side_fit',
        generatedAt: new Date().toISOString(),
        kerf: inputs.kerf ?? 3,
        inputs: { parts: inputs.parts, sheetTemplates: inputs.sheetTemplates },
        result,
        warnings: result.unplaced.length ? ['Existem peças que não couberam nas chapas informadas.'] : [],
      };
      const { error: saveError } = await db.from('project_versions').update({ snapshot: { ...snapshot, cutPlan } }).eq('user_id', userId).eq('project_id', projectId!).eq('id', data.id);
      if (saveError) return { ok: false, error: saveError.message };
      return {
        ok: true,
        data: {
          action,
          projectId,
          versionId: data.id,
          versionNumber: data.version_number,
          optimizer: 'max_rects_best_short_side_fit',
          result,
          cutPlanStatus,
          persistedCutPlan: true,
        },
      };
    }

    const savedCutPlan = snapshot.cutPlan && typeof snapshot.cutPlan === 'object' ? snapshot.cutPlan as Record<string, unknown> : null;
    if (savedCutPlan?.result) return { ok: true, data: { action, projectId, versionId: data.id, versionNumber: data.version_number, cutPlan: savedCutPlan, persistedCutPlan: true } };
    if (!data.cut_plan_path) {
      return {
        ok: false,
        error: 'Não há peças e dimensões reais de chapa suficientes para otimizar. Vincule materiais com largura e altura de chapa ou informe as peças e chapas no módulo Corte. A IARA não vai inventar medidas.',
      };
    }
    return { ok: true, data: { action, projectId, version: data, note: 'Plano de corte armazenado como arquivo; o snapshot atual não contém entradas estruturadas para recalcular.' } };
  }

  if (action === 'budget') {
    const [{ data: budget, error: budgetError }, { data: draft, error: draftError }] = await Promise.all([
      db.from('project_cost_snapshots').select('id,project_id,sale_price,material_cost,hardware_cost,labor_cost,other_cost,source,created_at,updated_at').eq('user_id', userId).eq('project_id', projectId!).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('project_budget_drafts').select('id,source_files,evidences,items,missing_information,assumptions,status,created_at,updated_at').eq('user_id', userId).eq('project_id', projectId!).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (budgetError) return { ok: false, error: budgetError.message };
    if (draftError) return { ok: false, error: draftError.message };
    if (!budget && !draft) return { ok: false, error: 'Este projeto ainda não possui orçamento nem rascunho técnico salvo.' };
    return { ok: true, data: { action, projectId, budget: budget ?? null, draft: draft ?? null, hasFinalBudget: Boolean(budget), draftStatus: draft?.status ?? null } };
  }

  if (action === 'documents') {
    const [{ data: documents, error: documentError }, { data: contracts, error: contractError }] = await Promise.all([
      db.from('marcenaria_documentos').select('id,nome,tipo,storage_path,status,metadata,created_at,updated_at').eq('user_id', userId).order('created_at', { ascending: false }),
      db.from('project_contracts').select('id,contract_number,status,document_path,document_hash,created_at,updated_at').eq('user_id', userId).eq('project_id', projectId!).order('created_at', { ascending: false }),
    ]);
    if (documentError) return { ok: false, error: documentError.message };
    if (contractError) return { ok: false, error: contractError.message };
    return { ok: true, data: { action, projectId, documents: documents ?? [], contracts: contracts ?? [] } };
  }

  if (action === 'order') {
    const [{ data: sale, error: saleError }, { data: approvals, error: approvalError }] = await Promise.all([
      db.from('project_sales').select('id,sale_price,sold_at,status,created_at,updated_at').eq('user_id', userId).eq('project_id', projectId!).maybeSingle(),
      db.from('project_approvals').select('id,client_name,client_email,approved_at,environment_id,created_at').eq('project_id', projectId!).order('created_at', { ascending: false }),
    ]);
    if (saleError) return { ok: false, error: saleError.message };
    if (approvalError) return { ok: false, error: approvalError.message };
    return { ok: true, data: { action, projectId, sale, approvals: approvals ?? [] } };
  }

  if (action === 'assembly' || action === 'installation' || action === 'checklist' || action === 'delivery') {
    const { data, error } = await db.from('project_production_stages').select('id,stage_key,stage_name,status,responsible,started_at,due_at,completed_at,blocked_reason,notes').eq('user_id', userId).eq('project_id', projectId!).order('created_at');
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { action, projectId, executionStages: data ?? [], executionSupport: 'status_read_only' } };
  }

  if (action === 'review_project') {
    const [{ data: project, error: projectError }, { data: versions, error: versionError }, { data: approvals, error: approvalError }] = await Promise.all([
      db.from('projects').select('*').eq('user_id', userId).eq('id', projectId!).maybeSingle(),
      db.from('project_versions').select('id,version_number,status,render_path,technical_drawing_path,cut_plan_path,client_budget_summary,environment_id,created_at').eq('user_id', userId).eq('project_id', projectId!).order('version_number', { ascending: false }),
      db.from('project_approvals').select('id,client_name,client_email,approved_at,environment_id,created_at').eq('project_id', projectId!).order('created_at', { ascending: false }),
    ]);
    if (projectError) return { ok: false, error: projectError.message };
    if (versionError) return { ok: false, error: versionError.message };
    if (approvalError) return { ok: false, error: approvalError.message };
    return { ok: true, data: { action, project, versions: versions ?? [], approvals: approvals ?? [] } };
  }

  const { data: project, error } = await db.from('projects').select('id,nome,name,width,height,depth,modules,drawers,doors,internal_material,external_material,back_material').eq('user_id', userId).eq('id', projectId!).maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { action, project, note: 'Ação conectada ao contexto real do projeto; validação detalhada depende dos dados disponíveis.' } };
}
