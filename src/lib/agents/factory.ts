import type { AgentDefinition, AgentResult, AgentTask } from './types';

function complete(agentId: AgentDefinition['id'], task: AgentTask, data: Record<string, unknown>, extra: Partial<AgentResult> = {}): AgentResult {
  return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'completed', data, ...extra };
}

function needsInput(agentId: AgentDefinition['id'], task: AgentTask, fields: string[], extra: Partial<AgentResult> = {}): AgentResult {
  return {
    agentId, taskId: task.id, correlationId: task.correlationId, status: 'needs_input',
    data: { missing: fields }, blockers: fields.map((field) => `Dado obrigatório ausente: ${field}`), ...extra,
  };
}
function hasImage(task: AgentTask): boolean { return Boolean(task.input.photoUrl || task.input.photoUrls || task.input.images || task.input.scene); }
function parts(task: AgentTask): Array<Record<string, unknown>> | undefined { return Array.isArray(task.input.parts) ? task.input.parts as Array<Record<string, unknown>> : undefined; }
function asPositiveNumber(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null; }
function cutPlan(task: AgentTask): Array<Record<string, unknown>> | undefined { return Array.isArray(task.input.cutPlan) ? task.input.cutPlan as Array<Record<string, unknown>> : undefined; }

function auditCutPlan(requested: Array<Record<string, unknown>>, sheets: Array<Record<string, unknown>>) {
  const blockers: string[] = [];
  const requestedCounts = new Map<string, number>(); const placedCounts = new Map<string, number>();
  for (const part of requested) {
    const code = String(part.code ?? ''); const quantity = Number(part.quantity ?? 1); const width = asPositiveNumber(part.width); const height = asPositiveNumber(part.height);
    if (!code || !Number.isInteger(quantity) || quantity < 1 || !width || !height) { blockers.push(`Peça solicitada inválida: ${code || 'sem código'}`); continue; }
    requestedCounts.set(code, (requestedCounts.get(code) ?? 0) + quantity);
  }
  for (const sheet of sheets) {
    const sheetWidth = asPositiveNumber(sheet.width); const sheetHeight = asPositiveNumber(sheet.height); const placements = Array.isArray(sheet.pieces) ? sheet.pieces as Array<Record<string, unknown>> : [];
    if (!sheetWidth || !sheetHeight) { blockers.push('Chapa sem largura/altura válidas.'); continue; }
    for (let i = 0; i < placements.length; i += 1) {
      const piece = placements[i]; const code = String(piece.code ?? ''); const x = typeof piece.x === 'number' ? piece.x : NaN; const y = typeof piece.y === 'number' ? piece.y : NaN; const width = asPositiveNumber(piece.width); const height = asPositiveNumber(piece.height);
      if (!code || !Number.isFinite(x) || !Number.isFinite(y) || !width || !height) { blockers.push(`Posição inválida na chapa ${String(sheet.code ?? '?')}, peça ${i + 1}.`); continue; }
      if (x < 0 || y < 0 || x + width > sheetWidth || y + height > sheetHeight) blockers.push(`Peça ${code} ultrapassa os limites da chapa ${String(sheet.code ?? '?')}.`);
      placedCounts.set(code, (placedCounts.get(code) ?? 0) + 1);
      for (let j = i + 1; j < placements.length; j += 1) {
        const other = placements[j]; const ox = typeof other.x === 'number' ? other.x : NaN; const oy = typeof other.y === 'number' ? other.y : NaN; const ow = asPositiveNumber(other.width); const oh = asPositiveNumber(other.height);
        if (![ox, oy].every(Number.isFinite) || !ow || !oh) continue;
        if (x < ox + ow && x + width > ox && y < oy + oh && y + height > oy) blockers.push(`Sobreposição detectada entre ${code} e ${String(other.code ?? '?')} na chapa ${String(sheet.code ?? '?')}.`);
      }
    }
  }
  for (const [code, expected] of requestedCounts) { const placed = placedCounts.get(code) ?? 0; if (placed !== expected) blockers.push(`Cobertura incorreta da peça ${code}: esperado ${expected}, encontrado ${placed}.`); }
  for (const [code] of placedCounts) if (!requestedCounts.has(code)) blockers.push(`Peça não solicitada no plano: ${code}.`);
  return blockers;
}

export function createAgent(id: AgentDefinition['id'], name: string, capabilities: string[], dependencies: AgentDefinition['id'][] = []): AgentDefinition {
  return { id, name, capabilities, dependencies, async handle(task) {
    switch (id) {
      case 'project': return task.input.clientId && task.input.workName ? complete(id, task, { ready: true, stage: 'project' }) : needsInput(id, task, ['clientId', 'workName']);
      case 'vision': return hasImage(task) ? complete(id, task, { stage: 'vision', analysisReady: true, requiresModel: true }, { confidence: 0, warnings: ['Análise visual real ainda depende de um adaptador de visão configurado; nenhuma medida foi inventada.'], assumptions: ['O agente não cria dimensões a partir de uma imagem sem evidência calibrada.'] }) : needsInput(id, task, ['photoUrl, photoUrls, images ou scene']);
      case 'perspective': return task.context?.dependencyResults.some((result) => result.agentId === 'vision' && result.status === 'completed') ? complete(id, task, { stage: 'perspective', geometryReady: true, requiresModel: true }, { confidence: 0, warnings: ['Perspectiva ainda requer o adaptador geométrico/visual; o agente não presume pontos de fuga.'] }) : needsInput(id, task, ['resultado do agente vision']);
      case 'measurement': return task.input.measurements || task.input.photoUrl ? complete(id, task, { validated: true, stage: 'measurement', source: task.input.measurements ? 'manual' : 'photo' }) : needsInput(id, task, ['measurements ou photoUrl']);
      case 'measurement_prediction': return task.context?.dependencyResults.some((result) => result.agentId === 'measurement' && result.status === 'completed') ? complete(id, task, { stage: 'measurement_prediction', predictionReady: true, requiresModel: true }, { confidence: 0, warnings: ['Predição de medidas exige referência/calibração ou modelo de visão; não há extrapolação silenciosa.'] }) : needsInput(id, task, ['resultado do agente measurement']);
      case 'multiview': return hasImage(task) ? complete(id, task, { stage: 'multiview', reconciliationReady: true }, { confidence: 0, warnings: ['Conferência multivista real será executada pelo adaptador de visão; divergências deverão bloquear o avanço.'] }) : needsInput(id, task, ['imagens/perspectivas']);
      case 'furniture_engineering': return parts(task)?.length ? complete(id, task, { stage: 'furniture_engineering', engineeringReady: true }) : needsInput(id, task, ['parts']);
      case 'materials': return parts(task)?.length ? complete(id, task, { normalized: true, stage: 'materials' }) : needsInput(id, task, ['parts']);
      case 'cut_optimization': if (!parts(task)?.length) return needsInput(id, task, ['parts']); if (!cutPlan(task)?.length) return needsInput(id, task, ['cutPlan'], { warnings: ['O motor de otimização ainda não está conectado; o sistema não pode declarar um plano ótimo por conta própria.'] }); return complete(id, task, { stage: 'cut_optimization', candidatePlanReady: true, optimized: false }, { warnings: ['Plano recebido é candidato e ainda não foi declarado ótimo sem motor de otimização reproduzível.'] });
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
  }};
}
