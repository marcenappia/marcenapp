import { getAgent } from './registry';
import { runAgentPlan, type AgentPlanResult, type AgentPlanStep } from './orchestrator';
import { runOrchestrator, type OrchestratorRun } from '@/core/orchestrator';
import type { ExecutionContext } from '@/core/toolRegistry';
import type { AgentId } from './types';

export type DomainId = 'project' | 'production' | 'business' | 'execution';
export type DomainArtifact = { type: string; id?: string };
export type DomainPanel = { type: string };
export type DomainRequest = { input: Record<string, unknown>; intent?: string; projectId?: string; correlationId?: string };
export type DomainResponse = { orchestrator: 'IARA'; domain: DomainId; domainAgent: 'IARA' | 'BENTO' | 'ESTELA' | 'JUCA'; projectId?: string; action: string; plan: AgentPlanResult; artifacts: DomainArtifact[]; panel?: DomainPanel };
export type DomainIntent = { domain: DomainId; action: string; agent: 'IARA' | 'BENTO' | 'ESTELA' | 'JUCA' };
export type DomainConversationRequest = { input: Record<string, unknown>; intent?: string; projectId?: string; correlationId?: string; execution: ExecutionContext; context?: Record<string, unknown> };
export type DomainConversationResponse = { orchestrator: 'IARA'; domain: DomainId; domainAgent: 'IARA' | 'BENTO' | 'ESTELA' | 'JUCA'; action: string; projectId?: string; correlationId: string; intent: DomainIntent; run: OrchestratorRun; artifacts: DomainArtifact[]; panel?: DomainPanel };
export type DomainAgentDefinition = { id: DomainId; name: 'Inteligência do Projeto' | 'BENTO' | 'ESTELA' | 'JUCA'; role: string; technicalAgents: AgentId[] };

export const domainAgents: DomainAgentDefinition[] = [
  { id: 'project', name: 'Inteligência do Projeto', role: 'Sub-orquestrador de projeto sob IARA', technicalAgents: ['customer', 'project', 'vision', 'perspective', 'measurement', 'measurement_prediction', 'multiview', 'furniture_engineering', 'render', 'quality', 'presentation', 'approval'] },
  { id: 'production', name: 'BENTO', role: 'Sub-orquestrador de produção sob IARA', technicalAgents: ['materials', 'cut_optimization', 'cut_audit', 'inventory', 'production'] },
  { id: 'business', name: 'ESTELA', role: 'Sub-orquestrador de negócio sob IARA', technicalAgents: ['budget', 'documents', 'order'] },
  { id: 'execution', name: 'JUCA', role: 'Sub-orquestrador de execução sob IARA', technicalAgents: [] },
];
export const domainAgentRegistry: Record<DomainId, DomainAgentDefinition> = Object.fromEntries(domainAgents.map((agent) => [agent.id, agent])) as Record<DomainId, DomainAgentDefinition>;

const productionKeywords = ['material', 'mdf', 'chapa', 'corte', 'ferragem', 'estoque', 'produção', 'fabricar', 'fabricação'];
const businessKeywords = ['orçamento', 'orcamento', 'custo', 'custos', 'preço', 'preco', 'margem', 'documento', 'documentos', 'pedido', 'cobrar'];
const executionKeywords = ['montagem', 'montar', 'instalação', 'instalacao', 'instalar', 'checklist', 'entrega'];
function normalize(value: unknown): string { return String(value ?? '').toLocaleLowerCase('pt-BR'); }
function matches(intent: string, keywords: string[]): boolean { return keywords.some((keyword) => intent.includes(keyword)); }
function requestIntent(request: DomainRequest): string { return normalize(request.intent ?? request.input.intent ?? request.input.message ?? request.input.prompt ?? request.input.request); }
export function resolveDomain(request: DomainRequest): DomainId { const explicit = normalize(request.input.domain ?? request.input.domainId); if (explicit === 'project' || explicit === 'production' || explicit === 'business' || explicit === 'execution') return explicit; const intent = requestIntent(request); if (matches(intent, executionKeywords)) return 'execution'; if (matches(intent, businessKeywords)) return 'business'; if (matches(intent, productionKeywords)) return 'production'; return 'project'; }

function actionFor(domain: DomainId, input: Record<string, unknown>): string {
  const explicitAction = normalize(input.action);
  const smartAliases: Record<string, string> = {
    'project.analyze': 'analyze_environment', 'project.create': 'create_project', 'project.measurements': 'check_measurements',
    'project.render': 'render', 'project.review': 'review_project', 'project.elevation': 'presentation',
    'production.materials': 'materials', 'production.hardware': 'hardware', 'production.cut': 'cut', 'production.inventory': 'inventory', 'production.production': 'production',
    'business.budget': 'budget', 'business.documents': 'documents', 'business.order': 'order',
    'execution.assembly': 'assembly', 'execution.installation': 'installation', 'execution.checklist': 'checklist', 'execution.delivery': 'delivery',
  };
  const canonicalAction = smartAliases[explicitAction] ?? explicitAction;
  const allowedActions: Record<DomainId, string[]> = {
    project: ['analyze_environment', 'create_project', 'check_measurements', 'render', 'review_project', 'approval', 'presentation'],
    production: ['materials', 'hardware', 'cut', 'inventory', 'production'],
    business: ['budget', 'documents', 'order'],
    execution: ['assembly', 'installation', 'checklist', 'delivery', 'execution'],
  };
  if (allowedActions[domain].includes(canonicalAction)) {
    if (domain === 'production' && canonicalAction === 'hardware') return 'materials';
    if (domain === 'project' && ['analyze_environment', 'check_measurements', 'review_project'].includes(canonicalAction)) return 'project_intelligence';
    if (domain === 'execution') return 'execution';
    return canonicalAction;
  }
  const intent = requestIntent({ input });
  if (domain === 'project') {
    if (matches(intent, ['crie ', 'criar ', 'cria ', 'novo projeto', 'novo móvel', 'novo movel'])) return 'create_project';
    return matches(intent, ['render', 'imagem', 'visualização', 'visualizacao']) ? 'render' : matches(intent, ['aprovação', 'aprovacao']) ? 'approval' : matches(intent, ['apresentação', 'apresentacao']) ? 'presentation' : 'project_intelligence';
  }
  if (domain === 'production') return matches(intent, ['corte', 'chapa']) ? 'cut' : matches(intent, ['estoque']) ? 'inventory' : matches(intent, ['produção', 'producao', 'fabric']) ? 'production' : 'materials';
  if (domain === 'business') return matches(intent, ['pedido']) ? 'order' : matches(intent, ['documento']) ? 'documents' : 'budget';
  return 'execution';
}

export function createDomainIntent(input: Record<string, unknown>, intent?: string): DomainIntent { const domain = resolveDomain({ input, intent }); const action = actionFor(domain, input); const agent = domain === 'production' ? 'BENTO' : domain === 'business' ? 'ESTELA' : domain === 'execution' ? 'JUCA' : 'IARA'; return { domain, action, agent }; }
function targetFor(domain: DomainId, action: string): AgentId[] { if (domain === 'project') { if (action === 'render') return ['render']; if (action === 'approval') return ['approval']; if (action === 'presentation') return ['presentation']; return ['furniture_engineering']; } if (domain === 'production') { if (action === 'cut') return ['cut_audit']; if (action === 'inventory') return ['inventory']; if (action === 'production') return ['production']; return ['materials']; } if (domain === 'business') { if (action === 'documents') return ['documents']; if (action === 'order') return ['order']; return ['budget']; } return []; }
function dependencyClosure(targets: AgentId[]): AgentId[] { const ordered: AgentId[] = []; const visited = new Set<AgentId>(); const visit = (id: AgentId) => { if (visited.has(id)) return; visited.add(id); for (const dependency of getAgent(id).dependencies ?? []) visit(dependency); ordered.push(id); }; targets.forEach(visit); return ordered; }
function artifactsFor(domain: DomainId, action: string, input: Record<string, unknown>): DomainArtifact[] { const id = typeof input.artifactId === 'string' ? input.artifactId : typeof input.projectId === 'string' ? input.projectId : undefined; if (domain === 'project' && action === 'render') return [{ type: 'render', id }]; if (domain === 'project' && action === 'create_project') return [{ type: 'project', id }]; if (domain === 'production' && action === 'cut') return [{ type: 'cut_plan', id }]; if (domain === 'business' && action === 'budget') return [{ type: 'budget', id }]; if (domain === 'business' && action === 'documents') return [{ type: 'document', id }]; if (domain === 'business' && action === 'order') return [{ type: 'order', id }]; return []; }
function artifactsFromExecution(run: OrchestratorRun, input: Record<string, unknown>): DomainArtifact[] { const fallbackId = typeof input.projectId === 'string' ? input.projectId : undefined; const toolArtifacts: Record<string, string> = { createProjeto: 'project', gerarRender: 'render', calcularOrcamento: 'budget', gerarContrato: 'contract', operationalIntelligence: 'production' }; return run.results.flatMap(({ tool, result }) => { if (!result.ok) return []; const type = toolArtifacts[tool]; if (!type) return []; const data = result.data as Record<string, unknown>; const id = typeof data?.studioCommandId === 'string' ? data.studioCommandId : typeof data?.projetoId === 'string' ? data.projetoId : typeof data?.id === 'string' ? data.id : fallbackId; return [{ type, id }]; }); }
function extractDimension(value: string, axis: 'width' | 'height' | 'depth'): number | undefined { const normalized = value.replace(/,/g, '.').toLocaleLowerCase('pt-BR'); const numbers = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []; if (!numbers.length) return undefined; const n = numbers[axis === 'width' ? 0 : axis === 'height' ? 1 : 2]; if (!Number.isFinite(n)) return undefined; const unit = normalized.match(/(mm|cm|m)\b/g)?.[0]; if (unit === 'm') return n * 1000; if (unit === 'cm') return n * 10; return n; }
export function parseCreateProjectInput(input: Record<string, unknown>, intent?: string): Record<string, unknown> | undefined { const raw = normalize(intent ?? input.message ?? input.prompt ?? input.request); const explicit = input.createProjectArgs; if (explicit && typeof explicit === 'object') return explicit as Record<string, unknown>; const dimensions = raw.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?/i); if (!dimensions) return undefined; const unitFor = (value: string, unit?: string) => { const n = Number(value.replace(',', '.')); const u = unit ?? 'mm'; return u === 'm' ? n * 1000 : u === 'cm' ? n * 10 : n; }; const width = unitFor(dimensions[1], dimensions[2]); const height = unitFor(dimensions[3], dimensions[4]); const depth = unitFor(dimensions[5], dimensions[6]); if (![width, height, depth].every((n) => Number.isFinite(n) && n > 0)) return undefined; const typeMatch = raw.match(/(?:crie|criar|cria|novo)\s+(?:um|uma)?\s*([a-záàâãéêíóôõúç\s-]+?)(?:\s+de\s+|\s+com\s+|\s+medindo\s+|\s+\d)/i); const nome = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : typeMatch?.[1]?.trim() || 'Novo projeto'; return { nome, width, height, depth, tipo: typeof input.tipo === 'string' ? input.tipo : typeMatch?.[1]?.trim(), confirmado: true }; }
async function runDomain(domain: DomainId, action: string, request: DomainRequest): Promise<AgentPlanResult> { const agentIds = dependencyClosure(targetFor(domain, action)); const steps: AgentPlanStep[] = agentIds.map((agentId) => ({ id: `${agentId}-${request.correlationId ?? 'domain'}`, agentId, type: `domain.${domain}.${agentId}`, input: request.input })); return runAgentPlan(steps, request.correlationId); }
export async function runIara(request: DomainRequest): Promise<DomainResponse> { const { domain, action, agent: domainAgent } = createDomainIntent(request.input, request.intent); const plan = await runDomain(domain, action, request); const artifacts = artifactsFor(domain, action, request.input); return { orchestrator: 'IARA', domain, domainAgent, projectId: request.projectId ?? (typeof request.input.projectId === 'string' ? request.input.projectId : undefined), action, plan, artifacts, panel: artifacts[0] ? { type: artifacts[0].type } : undefined }; }
export async function runIaraConversation(request: DomainConversationRequest): Promise<DomainConversationResponse> { const { domain, action, agent: domainAgent } = createDomainIntent(request.input, request.intent); const correlationId = request.correlationId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; const createProjectArgs = action === 'create_project' ? parseCreateProjectInput(request.input, request.intent) : undefined; const run = await runOrchestrator(request.intent ?? String(request.input.message ?? ''), request.execution, { ...(request.context ?? {}), correlationId, iara: { orchestrator: 'IARA', domain, domainAgent, action, projectId: request.projectId, ...(createProjectArgs ? { createProjectArgs } : {}) } }); const artifacts = artifactsFromExecution(run, request.input); const panel = artifacts[0] ? { type: artifacts[0].type } : undefined; return { orchestrator: 'IARA', domain, domainAgent, action, projectId: request.projectId, correlationId, intent: { domain, action, agent: domainAgent }, run, artifacts, panel }; }
