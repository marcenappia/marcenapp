import { getAgent } from './registry';
import { runAgentPlan, type AgentPlanResult, type AgentPlanStep } from './orchestrator';
import type { AgentId } from './types';

export type DomainAgentId = 'project' | 'production' | 'business' | 'execution';
export type DomainId = 'project' | 'production' | 'business' | 'execution';

export type DomainArtifact = {
  type: string;
  id?: string;
};

export type DomainPanel = {
  type: string;
};

export type DomainRequest = {
  input: Record<string, unknown>;
  intent?: string;
  projectId?: string;
  correlationId?: string;
};

export type DomainResponse = {
  orchestrator: 'IARA';
  domain: DomainId;
  domainAgent: 'IARA' | 'BENTO' | 'ESTELA' | 'JUCA';
  projectId?: string;
  action: string;
  plan: AgentPlanResult;
  artifacts: DomainArtifact[];
  panel?: DomainPanel;
};

export type DomainAgentDefinition = {
  id: DomainAgentId;
  name: 'Inteligência do Projeto' | 'BENTO' | 'ESTELA' | 'JUCA';
  role: string;
  technicalAgents: AgentId[];
};

export const domainAgents: DomainAgentDefinition[] = [
  {
    id: 'project',
    name: 'Inteligência do Projeto',
    role: 'Sub-orquestrador de projeto sob IARA',
    technicalAgents: [
      'customer', 'project', 'vision', 'perspective', 'measurement',
      'measurement_prediction', 'multiview', 'furniture_engineering',
      'render', 'quality', 'presentation', 'approval',
    ],
  },
  {
    id: 'production',
    name: 'BENTO',
    role: 'Sub-orquestrador de produção sob IARA',
    technicalAgents: ['materials', 'cut_optimization', 'cut_audit', 'inventory', 'production'],
  },
  {
    id: 'business',
    name: 'ESTELA',
    role: 'Sub-orquestrador de negócio sob IARA',
    technicalAgents: ['budget', 'documents', 'order'],
  },
  {
    id: 'execution',
    name: 'JUCA',
    role: 'Sub-orquestrador de execução sob IARA',
    technicalAgents: [],
  },
];

export const domainAgentRegistry: Record<DomainAgentId, DomainAgentDefinition> = Object.fromEntries(
  domainAgents.map((agent) => [agent.id, agent]),
) as Record<DomainAgentId, DomainAgentDefinition>;

const projectKeywords = ['cliente', 'projeto', 'obra', 'foto', 'imagem', 'ambiente', 'medida', 'perspectiva', 'render', 'móvel', 'moveis', 'móveis', 'apresentação', 'aprovação'];
const productionKeywords = ['material', 'mdf', 'chapa', 'corte', 'ferragem', 'estoque', 'produção', 'fabricar', 'fabricação'];
const businessKeywords = ['orçamento', 'orcamento', 'custo', 'custos', 'preço', 'preco', 'margem', 'documento', 'documentos', 'pedido', 'cobrar'];
const executionKeywords = ['montagem', 'montar', 'instalação', 'instalacao', 'instalar', 'checklist', 'entrega'];

function normalize(value: unknown): string {
  return String(value ?? '').toLocaleLowerCase('pt-BR');
}

function matches(intent: string, keywords: string[]): boolean {
  return keywords.some((keyword) => intent.includes(keyword));
}

export function resolveDomain(request: DomainRequest): DomainId {
  const explicit = normalize(request.input.domain ?? request.input.domainId);
  if (explicit === 'project' || explicit === 'production' || explicit === 'business' || explicit === 'execution') return explicit;

  const intent = normalize(request.intent ?? request.input.intent ?? request.input.message ?? request.input.prompt ?? request.input.request);
  if (matches(intent, executionKeywords)) return 'execution';
  if (matches(intent, businessKeywords)) return 'business';
  if (matches(intent, productionKeywords)) return 'production';
  return 'project';
}

function dependencyClosure(targets: AgentId[]): AgentId[] {
  const ordered: AgentId[] = [];
  const visited = new Set<AgentId>();

  const visit = (id: AgentId) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dependency of getAgent(id).dependencies ?? []) visit(dependency);
    ordered.push(id);
  };

  for (const target of targets) visit(target);
  return ordered;
}

function actionFor(domain: DomainId, input: Record<string, unknown>): string {
  const intent = normalize(input.intent ?? input.message ?? input.prompt ?? input.request);
  if (domain === 'project') return matches(intent, ['render']) ? 'render' : 'project_intelligence';
  if (domain === 'production') return matches(intent, ['corte', 'chapa']) ? 'cut' : 'production';
  if (domain === 'business') return matches(intent, ['pedido']) ? 'order' : matches(intent, ['documento']) ? 'documents' : 'budget';
  return 'execution';
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

function panelFor(artifacts: DomainArtifact[]): DomainPanel | undefined {
  const type = artifacts[0]?.type;
  if (!type) return undefined;
  return { type };
}

async function runDomain(domain: DomainId, request: DomainRequest): Promise<AgentPlanResult> {
  const targets: Record<DomainId, AgentId[]> = {
    project: domainAgents[0].technicalAgents,
    production: domainAgents[1].technicalAgents,
    business: domainAgents[2].technicalAgents,
    execution: [],
  };
  const agentIds = dependencyClosure(targets[domain]);
  const steps: AgentPlanStep[] = agentIds.map((agentId) => ({
    id: `${agentId}-${request.correlationId ?? 'domain'}`,
    agentId,
    type: `domain.${domain}.${agentId}`,
    input: request.input,
  }));
  return runAgentPlan(steps, request.correlationId);
}

export async function runIara(request: DomainRequest): Promise<DomainResponse> {
  const domain = resolveDomain(request);
  const domainAgent = domain === 'production' ? 'BENTO' : domain === 'business' ? 'ESTELA' : domain === 'execution' ? 'JUCA' : 'IARA';
  const action = actionFor(domain, request.input);
  const plan = await runDomain(domain, request);
  const artifacts = artifactsFor(domain, action, request.input);

  return {
    orchestrator: 'IARA',
    domain,
    domainAgent,
    projectId: request.projectId ?? (typeof request.input.projectId === 'string' ? request.input.projectId : undefined),
    action,
    plan,
    artifacts,
    panel: panelFor(artifacts),
  };
}
