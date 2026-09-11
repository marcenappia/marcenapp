import { getAgent } from './registry';
import { runAgentPlan, type AgentPlanResult, type AgentPlanStep } from './orchestrator';
import type { AgentId } from './types';

export type DomainId = 'project' | 'production' | 'business' | 'execution';
export type DomainArtifact = { type: string; id?: string };
export type DomainPanel = { type: string };
export type DomainRequest = { input: Record<string, unknown>; intent?: string; projectId?: string; correlationId?: string };
export type DomainResponse = {
  orchestrator: 'IARA'; domain: DomainId; domainAgent: 'IARA' | 'BENTO' | 'ESTELA' | 'JUCA';
  projectId?: string; action: string; plan: AgentPlanResult; artifacts: DomainArtifact[]; panel?: DomainPanel;
};
export type DomainAgentDefinition = {
  id: DomainId; name: 'Inteligência do Projeto' | 'BENTO' | 'ESTELA' | 'JUCA'; role: string; technicalAgents: AgentId[];
};

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

export function resolveDomain(request: DomainRequest): DomainId {
  const explicit = normalize(request.input.domain ?? request.input.domainId);
  if (explicit === 'project' || explicit === 'production' || explicit === 'business' || explicit === 'execution') return explicit;
  const intent = requestIntent(request);
  if (matches(intent, executionKeywords)) return 'execution';
  if (matches(intent, businessKeywords)) return 'business';
  if (matches(intent, productionKeywords)) return 'production';
  return 'project';
}

function dependencyClosure(targets: AgentId[]): AgentId[] {
  const ordered: AgentId[] = []; const visited = new Set<AgentId>();
  const visit = (id: AgentId) => { if (visited.has(id)) return; visited.add(id); for (const dependency of getAgent(id).dependencies ?? []) visit(dependency); ordered.push(id); };
  targets.forEach(visit);
  return ordered;
}

function actionFor(domain: DomainId, input: Record<string, unknown>): string {
  const intent = requestIntent({ input });
  if (domain === 'project') return matches(intent, ['render']) ? 'render' : matches(intent, ['aprovação', 'aprovacao']) ? 'approval' : matches(intent, ['apresentação', 'apresentacao']) ? 'presentation' : 'project_intelligence';
  if (domain === 'production') return matches(intent, ['corte', 'chapa']) ? 'cut' : matches(intent, ['estoque']) ? 'inventory' : matches(intent, ['produção', 'producao', 'fabric']) ? 'production' : 'materials';
  if (domain === 'business') return matches(intent, ['pedido']) ? 'order' : matches(intent, ['documento']) ? 'documents' : 'budget';
  return 'execution';
}

function targetFor(domain: DomainId, action: string): AgentId[] {
  if (domain === 'project') {
    if (action === 'render') return ['render'];
    if (action === 'approval') return ['approval'];
    if (action === 'presentation') return ['presentation'];
    return ['furniture_engineering'];
  }
  if (domain === 'production') {
    if (action === 'cut') return ['cut_audit'];
    if (action === 'inventory') return ['inventory'];
    if (action === 'production') return ['production'];
    return ['materials'];
  }
  if (domain === 'business') {
    if (action === 'documents') return ['documents'];
    if (action === 'order') return ['order'];
    return ['budget'];
  }
  return [];
}

function artifactsFor(domain: DomainId, action: string, input: Record<string, unknown>): DomainArtifact[] {
  const id = typeof input.artifactId === 'string' ? input.artifactId : typeof input.projectId === 'string' ? input.projectId : undefined;
  if (domain === 'project' && action === 'render') return [{ type: 'render', id }];
  if (domain === 'production' && action === 'cut') return [{ type: 'cut_plan', id }];
  if (domain === 'business' && action === 'budget') return [{ type: 'budget', id }];
  if (domain === 'business' && action === 'documents') return [{ type: 'document', id }];
  if (domain === 'business' && action === 'order') return [{ type: 'order', id }];
  return [];
}

async function runDomain(domain: DomainId, action: string, request: DomainRequest): Promise<AgentPlanResult> {
  const agentIds = dependencyClosure(targetFor(domain, action));
  const steps: AgentPlanStep[] = agentIds.map((agentId) => ({ id: `${agentId}-${request.correlationId ?? 'domain'}`, agentId, type: `domain.${domain}.${agentId}`, input: request.input }));
  return runAgentPlan(steps, request.correlationId);
}

export async function runIara(request: DomainRequest): Promise<DomainResponse> {
  const domain = resolveDomain(request);
  const domainAgent = domain === 'production' ? 'BENTO' : domain === 'business' ? 'ESTELA' : domain === 'execution' ? 'JUCA' : 'IARA';
  const action = actionFor(domain, request.input);
  const plan = await runDomain(domain, action, request);
  const artifacts = artifactsFor(domain, action, request.input);
  return { orchestrator: 'IARA', domain, domainAgent, projectId: request.projectId ?? (typeof request.input.projectId === 'string' ? request.input.projectId : undefined), action, plan, artifacts, panel: artifacts[0] ? { type: artifacts[0].type } : undefined };
}
