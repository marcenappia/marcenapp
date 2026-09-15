import type { AgentDefinition, AgentResult, AgentTask } from './types';
import { engineerBasicCarcass, type FurnitureEngineeringSpec } from '@/lib/furniture/engineering';
import { optimizeCutList, type CutPart, type CutSheet } from '@/lib/cut/maxRects';

function complete(agentId: AgentDefinition['id'], task: AgentTask, data: Record<string, unknown>, extra: Partial<AgentResult> = {}): AgentResult {
  return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'completed', data, ...extra };
}
function needsInput(agentId: AgentDefinition['id'], task: AgentTask, fields: string[], extra: Partial<AgentResult> = {}): AgentResult {
  return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'needs_input', data: { missing: fields }, blockers: fields.map((field) => `Dado obrigatório ausente: ${field}`), ...extra };
}
function hasImage(task: AgentTask): boolean { return Boolean(task.input.photoUrl || task.input.photoUrls || task.input.images || task.input.scene); }
function parts(task: AgentTask): Array<Record<string, unknown>> | undefined { return Array.isArray(task.input.parts) ? task.input.parts as Array<Record<string, unknown>> : undefined; }
function asPositiveNumber(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null; }
function cutPlan(task: AgentTask): Array<Record<string, unknown>> | undefined { return Array.isArray(task.input.cutPlan) ? task.input.cutPlan as Array<Record<string, unknown>> : undefined; }
function sheetTemplates(task: AgentTask): CutSheet[] | undefined { return Array.isArray(task.input.sheetTemplates) ? task.input.sheetTemplates as CutSheet[] : undefined; }
function cutParts(task: AgentTask): CutPart[] | null {
  const value = parts(task);
  if (!value?.length) return null;
  const result = value.map((part) => ({ id: String(part.id ?? part.code ?? ''), width: Number(part.width), height: Number(part.height), quantity: Number(part.quantity ?? 1), material: String(part.material ?? ''), grainSensitive: Boolean(part.grainSensitive), allowRotation: part.allowRotation !== false }));
  return result.every((part) => part.id && part.width > 0 && part.height > 0 && Number.isInteger(part.quantity) && part.quantity > 0 && part.material) ? result : null;
}
function normalizedCutPlan(result: ReturnType<typeof optimizeCutList>): Array<Record<string, unknown>> {
  return result.sheets.map((sheet) => ({
    code: sheet.id,
    width: sheet.width,
    height: sheet.height,
    material: sheet.material,
    pieces: sheet.placements.map((placement) => ({
      code: placement.partId,
      id: placement.partId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotated: placement.rotated,
      material: placement.material,
    })),
  }));
}
function auditCutPlan(requested: Array<Record<string, unknown>>, sheets: Array<Record<string, unknown>>) {
  const blockers: string[] = []; const requestedCounts = new Map<string, number>(); const placedCounts = new Map<string, number>();
  for (const part of requested) { const code = String(part.code ?? part.id ?? ''); const quantity = Number(part.quantity ?? 1); const width = asPositiveNumber(part.width); const height = asPositiveNumber(part.height); if (!code || !Number.isInteger(quantity) || quantity < 1 || !width || !height) { blockers.push(`Peça solicitada inválida: ${code || 'sem código'}`); continue; } requestedCounts.set(code, (requestedCounts.get(code) ?? 0) + quantity); }
  for (const sheet of sheets) { const sheetWidth = asPositiveNumber(sheet.width); const sheetHeight = asPositiveNumber(sheet.height); const placements = Array.isArray(sheet.pieces) ? sheet.pieces as Array<Record<string, unknown>> : []; if (!sheetWidth || !sheetHeight) { blockers.push('Chapa sem largura/altura válidas.'); continue; } for (let i = 0; i < placements.length; i += 1) { const piece = placements[i]; const code = String(piece.code ?? piece.id ?? ''); const x = typeof piece.x === 'number' ? piece.x : NaN; const y = typeof piece.y === 'number' ? piece.y : NaN; const width = asPositiveNumber(piece.width); const height = asPositiveNumber(piece.height); if (!code || !Number.isFinite(x) || !Number.isFinite(y) || !width || !height) { blockers.push(`Posição inválida na chapa ${String(sheet.code ?? '?')}, peça ${i + 1}.`); continue; } if (x < 0 || y < 0 || x + width > sheetWidth || y + height > sheetHeight) blockers.push(`Peça ${code} ultrapassa os limites da chapa ${String(sheet.code ?? '?')}.`); placedCounts.set(code, (placedCounts.get(code) ?? 0) + 1); for (let j = i + 1; j < placements.length; j += 1) { const other = placements[j]; const ox = typeof other.x === 'number' ? other.x : NaN; const oy = typeof other.y === 'number' ? other.y : NaN; const ow = asPositiveNumber(other.width); const oh = asPositiveNumber(other.height); if (![ox, oy].every(Number.isFinite) || !ow || !oh) continue; if (x < ox + ow && x + width > ox && y < oy + oh && y + height > oy) blockers.push(`Sobreposição detectada entre ${code} e ${String(other.code ?? '?')} na chapa ${String(sheet.code ?? '?')}.`); } } }
  for (const [code, expected] of requestedCounts) { const placed = placedCounts.get(code) ?? 0; if (placed !== expected) blockers.push(`Cobertura incorreta da peça ${code}: esperado ${expected}, encontrado ${placed}.`); }
  for (const [code] of placedCounts) if (!requestedCounts.has(code.split('#')[0])) blockers.push(`Peça não solicitada no plano: ${code}.`);
  return blockers;
}
function engineeringSpec(task: AgentTask): FurnitureEngineeringSpec | null { const value = task.input.engineeringSpec; return value && typeof value === 'object' ? value as FurnitureEngineeringSpec : null; }

export function createAgent(id: AgentDefinition['id'], name: string, capabilities: string[], dependencies: AgentDefinition['id'][] = []): AgentDefinition {
  return { id, name, capabilities, dependencies, async handle(task) {
    switch (id) {
      case 'project': return task.input.clientId && task.input.workName ? complete(id, task, { ready: true, stage: 'project' }) : needsInput(id, task, ['clientId', 'workName']);
      case 'vision': return hasImage(task) ? complete(id, task, { stage: 'vision', analysisReady: true, requiresModel: true }, { confidence: 0, warnings: ['Análise visual real ainda depende de um adaptador de visão configurado; nenhuma medida foi inventada.'], assumptions: ['O agente não cria dimensões a partir de uma imagem sem evidência calibrada.'] }) : needsInput(id, task, ['photoUrl, photoUrls, images ou scene']);
      case 'perspective': return task.context?.dependencyResults.some((result) => result.agentId === 'vision' && result.status === 'completed') ? complete(id, task, { stage: 'perspective', geometryReady: true, requiresModel: true }, { confidence: 0, warnings: ['Perspectiva ainda requer o adaptador geométrico/visual; o agente não presume pontos de fuga.'] }) : needsInput(id, task, ['resultado do agente vision']);
      case 'measurement': return task.input.measurements || task.input.photoUrl ? complete(id, task, { validated: true, stage: 'measurement', source: task.input.measurements ? 'manual' : 'photo' }) : needsInput(id, task, ['measurements ou photoUrl']);
      case 'measurement_prediction': return task.context?.dependencyResults.some((result) => result.agentId === 'measurement' && result.status === 'completed') ? complete(id, task, { stage: 'measurement_prediction', predictionReady: true, requiresModel: true }, { confidence: 0, warnings: ['Predição de medidas exige referência/calibração ou modelo de visão; não há extrapolação silenciosa.'] }) : needsInput(id, task, ['resultado do agente measurement']);
      case 'multiview': return hasImage(task) ? complete(id, task, { stage: 'multiview', reconciliationReady: true }, { confidence: 0, warnings: ['Conferência multivista real será executada pelo adaptador de visão; divergências deverão bloquear o avanço.'] }) : needsInput(id, task, ['imagens/perspectivas']);
      case 'furniture_engineering': { const explicitParts = parts(task); if (explicitParts?.length) return complete(id, task, { stage: 'furniture_engineering', engineeringReady: true, parts: explicitParts, sheetTemplates: sheetTemplates(task) ?? [] }); const spec = engineeringSpec(task); if (!spec) return needsInput(id, task, ['parts ou engineeringSpec']); const engineered = engineerBasicCarcass(spec); if (engineered.blockers.length) return { ...needsInput(id, task, ['correção da engenharia do móvel']), blockers: engineered.blockers, data: { stage: 'furniture_engineering', engineeringReady: false, ...engineered } }; return complete(id, task, { stage: 'furniture_engineering', engineeringReady: true, ...engineered }); }
      case 'materials': return parts(task)?.length ? complete(id, task, { normalized: true, stage: 'materials', parts: parts(task) }) : needsInput(id, task, ['parts']);
      case 'cut_optimization': { const generatedParts = cutParts(task); const sheets = sheetTemplates(task); if (!generatedParts) return needsInput(id, task, ['parts']); if (!sheets?.length) return needsInput(id, task, ['sheetTemplates'], { warnings: ['As dimensões das chapas são uma entrada de fabricação e não serão inventadas.'] }); const result = optimizeCutList(generatedParts, sheets, typeof task.input.kerf === 'number' ? task.input.kerf : 3); return complete(id, task, { stage: 'cut_optimization', optimized: result.unplaced.length === 0, optimizer: 'max_rects_best_short_side_fit', result, cutPlan: normalizedCutPlan(result) }); }
      case 'cut_audit': { const requested = parts(task); const plan = cutPlan(task); if (!requested?.length || !plan?.length) return needsInput(id, task, ['parts', 'cutPlan']); const blockers = auditCutPlan(requested, plan); return blockers.length ? { ...needsInput(id, task, ['correção do plano de corte']), blockers, data: { stage: 'cut_audit', validated: false, blockers } } : complete(id, task, { stage: 'cut_audit', validated: true, blockers: [] }, { confidence: 1, warnings: ['Auditoria geométrica concluída. Otimalidade de aproveitamento continua separada da validação de segurança.'] }); }
      case 'render': return task.input.projectId || task.input.scene ? complete(id, task, { sceneReady: true, stage: 'render', requiresValidatedTechnicalPackage: true }) : needsInput(id, task, ['projectId ou scene']);
      case 'quality': return task.input.parts && (task.input.measurements || task.input.photoUrl) ? complete(id, task, { validated: true, blockers: [], stage: 'quality' }) : needsInput(id, task, ['parts', 'measurements ou photoUrl']);
      case 'presentation': return task.input.projectId && (task.input.scene || task.input.renderUrl) ? complete(id, task, { ready: true, stage: 'presentation' }) : needsInput(id, task, ['projectId', 'scene ou renderUrl']);
      case 'approval': return task.input.presentationId || task.input.approved !== undefined ? complete(id, task, { decisionCaptured: true, stage: 'approval' }) : needsInput(id, task, ['presentationId ou approved']);
      case 'inventory': return task.input.materials ? complete(id, task, { checked: true, stage: 'inventory' }) : needsInput(id, task, ['materials']);
      case 'production': return parts(task) ? complete(id, task, { cutListReady: true, stage: 'production' }) : needsInput(id, task, ['parts']);
      case 'budget': return task.input.materials && (task.input.approved === true || task.input.approvalId) ? complete(id, task, { readyForCortecloud: true, stage: 'budget' }) : needsInput(id, task, ['materials', 'approved ou approvalId']);
      case 'customer': return task.input.name ? complete(id, task, { customerReady: true, stage: 'customer' }) : needsInput(id, task, ['name']);
      case 'order': return task.input.projectId && task.input.budgetId ? complete(id, task, { orderReady: true, stage: 'order' }) : needsInput(id, task, ['projectId', 'budgetId']);
      case 'documents': return task.input.documentType && task.input.budgetId ? complete(id, task, { documentReady: true, stage: 'documents' }) : needsInput(id, task, ['documentType', 'budgetId']);
    }
  } };
}
