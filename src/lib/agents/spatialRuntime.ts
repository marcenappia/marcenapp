import { callAIText } from '@/services/ai';
import type { AgentId, AgentResult, AgentTask, Evidence } from './types';

type SpatialAgentId = 'vision' | 'perspective' | 'measurement' | 'measurement_prediction' | 'multiview' | 'furniture_engineering' | 'render';

const SPATIAL_AGENTS: SpatialAgentId[] = ['vision', 'perspective', 'measurement', 'measurement_prediction', 'multiview', 'furniture_engineering', 'render'];

function asImages(input: Record<string, unknown>): Array<{ mimeType: string; data: string }> {
  const raw = Array.isArray(input.images) ? input.images : [];
  return raw.flatMap((item) => {
    if (typeof item === 'string') return item ? [{ mimeType: 'image/png', data: item.includes(',') ? item.split(',')[1] : item }] : [];
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    const data = typeof value.data === 'string' ? value.data : '';
    const mimeType = typeof value.mimeType === 'string' ? value.mimeType : 'image/png';
    return data ? [{ mimeType, data }] : [];
  }).slice(0, 8);
}

function hasVisualUrl(input: Record<string, unknown>): boolean {
  return typeof input.photoUrl === 'string' && input.photoUrl.trim().length > 0;
}

function urlOnlyResult(agentId: SpatialAgentId, task: AgentTask): AgentResult {
  return {
    agentId,
    taskId: task.id,
    correlationId: task.correlationId,
    status: 'completed',
    data: {
      stage: agentId,
      modelBacked: false,
      visualReference: 'url',
      analysisDeferred: true,
    },
    confidence: 0,
    evidence: [{ source: `${agentId}.reference`, value: task.input.photoUrl }],
    warnings: ['Nenhuma medida foi inventada: a referência visual foi recebida apenas como URL e nenhuma análise visual foi simulada. Envie a imagem incorporada para análise por modelo.'],
    assumptions: [],
  };
}

function promptInput(input: Record<string, unknown>): Record<string, unknown> {
  const result = { ...input };
  delete result.images;
  return result;
}

function humanLanguage(request: string): string {
  return [
    'Use linguagem humana de marcenaria.',
    'Prefira parede da direita, parede da esquerda, parede da frente, parede de trás, parede do fundo, ao lado e oposta.',
    'Não exija que o usuário pense em norte, sul, leste ou oeste.',
    'Coordenadas cardeais podem existir apenas como referência interna auxiliar.',
    'Direita e esquerda devem ser relativas à vista/câmera de referência quando houver imagem.',
    'Quando a referência não puder ser determinada com segurança, marque como não determinada em vez de inventar.',
    `Pedido original: ${request}`,
  ].join(' ');
}

function parseModelJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Resposta estrutural inválida do agente espacial.');
  return parsed as Record<string, unknown>;
}

function buildPrompt(agentId: SpatialAgentId, task: AgentTask): string {
  const dependencyResults = task.context?.dependencyResults ?? [];
  const evidence = task.context?.evidence ?? [];
  const role: Record<SpatialAgentId, string> = {
    vision: 'Leia o ambiente: paredes, aberturas, elementos fixos, mobiliário existente, materiais visíveis e relações espaciais.',
    perspective: 'Analise câmera, enquadramento, planos da cena, perspectiva, profundidade e pontos de fuga sem inventar geometria.',
    measurement: 'Valide medidas fornecidas e identifique medidas observáveis. Separe medido, estimado e desconhecido.',
    measurement_prediction: 'Estime apenas quando houver referência/calibração suficiente e informe claramente a incerteza.',
    multiview: 'Reconcilie fotos de ângulos diferentes como o mesmo ambiente quando houver evidência. Detecte conflitos e não duplique ambientes sem motivo.',
    furniture_engineering: 'Transforme a intenção de móvel em requisitos espaciais: dimensões, folgas, encaixes, paredes de apoio e elementos que não podem ser bloqueados.',
    render: 'Prepare um pacote técnico de render coerente com ambiente, câmera, medidas, móveis e referências visuais validadas.',
  };
  return [
    `Você é o agente especialista ${agentId} do Marcenapp.`,
    role[agentId],
    humanLanguage(String(task.input.prompt ?? task.type ?? '')),
    'Não invente medidas, paredes, portas, janelas ou relações espaciais. Diferencie observado, inferido e desconhecido.',
    `Entrada estruturada: ${JSON.stringify(promptInput(task.input))}`,
    `Resultados de dependências: ${JSON.stringify(dependencyResults)}`,
    `Evidências anteriores: ${JSON.stringify(evidence)}`,
    'Retorne SOMENTE JSON válido com: summary, findings, confidence, warnings, assumptions, evidence.',
    'findings deve ser um objeto estruturado adequado ao papel do agente.',
  ].join('\n');
}

export async function executeSpatialAgent(agentId: AgentId, task: AgentTask): Promise<AgentResult> {
  if (!SPATIAL_AGENTS.includes(agentId as SpatialAgentId)) return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'failed', error: `Agente não pertence ao runtime espacial: ${agentId}` };

  const spatialAgent = agentId as SpatialAgentId;
  const images = asImages(task.input);
  if (!images.length && hasVisualUrl(task.input)) return urlOnlyResult(spatialAgent, task);
  if (!images.length) return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'needs_input', data: { missing: ['imagem incorporada ou referência visual analisável'] }, blockers: ['O agente espacial não pode executar análise visual sem uma imagem incorporada. Uma URL isolada não é tratada como análise realizada.'] };

  try {
    const result = parseModelJson(await callAIText(buildPrompt(spatialAgent, task), images, true));
    const confidence = Number(result.confidence);
    const evidence: Evidence[] = Array.isArray(result.evidence)
      ? result.evidence.map((item) => typeof item === 'object' && item !== null ? item as Evidence : ({ source: agentId, value: item }))
      : [{ source: `${agentId}.model`, value: result.findings }];
    return {
      agentId,
      taskId: task.id,
      correlationId: task.correlationId,
      status: 'completed',
      data: { stage: agentId, findings: result.findings, summary: result.summary, modelBacked: true },
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : undefined,
      evidence,
      warnings: Array.isArray(result.warnings) ? result.warnings.map(String) : [],
      assumptions: Array.isArray(result.assumptions) ? result.assumptions.map(String) : [],
    };
  } catch (error) {
    return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'failed', error: error instanceof Error ? error.message : 'Falha no agente espacial.' };
  }
}

export function isSpatialAgent(agentId: AgentId): agentId is SpatialAgentId {
  return SPATIAL_AGENTS.includes(agentId as SpatialAgentId);
}
