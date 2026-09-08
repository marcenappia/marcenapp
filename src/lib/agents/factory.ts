import type { AgentDefinition, AgentResult, AgentTask } from './types';

function complete(agentId: AgentDefinition['id'], task: AgentTask, data: Record<string, unknown>, extra: Partial<AgentResult> = {}): AgentResult {
  return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'completed', data, ...extra };
}

function needsInput(agentId: AgentDefinition['id'], task: AgentTask, fields: string[], extra: Partial<AgentResult> = {}): AgentResult {
  return {
    agentId,
    taskId: task.id,
    correlationId: task.correlationId,
    status: 'needs_input',
    data: { missing: fields },
    blockers: fields.map((field) => `Dado obrigatório ausente: ${field}`),
    ...extra,
  };
}

function hasImage(task: AgentTask): boolean {
  return Boolean(task.input.photoUrl || task.input.photoUrls || task.input.images || task.input.scene);
}

function numeric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function parts(task: AgentTask): unknown[] | undefined {
  return Array.isArray(task.input.parts) ? task.input.parts : undefined;
}

export function createAgent(
  id: AgentDefinition['id'],
  name: string,
  capabilities: string[],
  dependencies: AgentDefinition['id'][] = [],
): AgentDefinition {
  return {
    id,
    name,
    capabilities,
    dependencies,
    async handle(task) {
      switch (id) {
        case 'project':
          return task.input.clientId && task.input.workName
            ? complete(id, task, { ready: true, stage: 'project' })
            : needsInput(id, task, ['clientId', 'workName']);
        case 'vision':
          return hasImage(task)
            ? complete(id, task, { stage: 'vision', analysisReady: true, requiresModel: true }, {
                confidence: 0,
                warnings: ['Análise visual real ainda depende de um adaptador de visão configurado; nenhuma medida foi inventada.'],
                assumptions: ['O agente não cria dimensões a partir de uma imagem sem evidência calibrada.'],
              })
            : needsInput(id, task, ['photoUrl, photoUrls, images ou scene']);
        case 'perspective':
          return task.context?.dependencyResults.some((result) => result.agentId === 'vision' && result.status === 'completed')
            ? complete(id, task, { stage: 'perspective', geometryReady: true, requiresModel: true }, {
                confidence: 0,
                warnings: ['Perspectiva ainda requer o adaptador geométrico/visual; o agente não presume pontos de fuga.'],
              })
            : needsInput(id, task, ['resultado do agente vision']);
        case 'measurement':
          return task.input.measurements || task.input.photoUrl
            ? complete(id, task, { validated: true, stage: 'measurement', source: task.input.measurements ? 'manual' : 'photo' })
            : needsInput(id, task, ['measurements ou photoUrl']);
        case 'measurement_prediction':
          return task.context?.dependencyResults.some((result) => result.agentId === 'measurement' && result.status === 'completed')
            ? complete(id, task, { stage: 'measurement_prediction', predictionReady: true, requiresModel: true }, {
                confidence: 0,
                warnings: ['Predição de medidas exige referência/calibração ou modelo de visão; não há extrapolação silenciosa.'],
              })
            : needsInput(id, task, ['resultado do agente measurement']);
        case 'multiview':
          return hasImage(task)
            ? complete(id, task, { stage: 'multiview', reconciliationReady: true }, {
                confidence: 0,
                warnings: ['Conferência multivista real será executada pelo adaptador de visão; divergências deverão bloquear o avanço.'],
              })
            : needsInput(id, task, ['imagens/perspectivas']);
        case 'furniture_engineering':
          return parts(task)
            ? complete(id, task, { stage: 'furniture_engineering', engineeringReady: true })
            : needsInput(id, task, ['parts']);
        case 'materials':
          return parts(task)
            ? complete(id, task, { normalized: true, stage: 'materials' })
            : needsInput(id, task, ['parts']);
        case 'cut_optimization':
          if (!parts(task)?.length) return needsInput(id, task, ['parts']);
          return complete(id, task, { stage: 'cut_optimization', optimizationReady: true, optimized: false }, {
            warnings: ['Plano de corte ainda não é declarado ótimo: o motor de otimização deve validar chapa, veio, espessura, kerf, folgas e rotação.'],
            assumptions: ['Nenhum ganho de aproveitamento é afirmado sem cálculo reproduzível.'],
          });
        case 'cut_audit':
          return task.context?.dependencyResults.some((result) => result.agentId === 'cut_optimization' && result.status === 'completed')
            ? complete(id, task, { stage: 'cut_audit', auditReady: true, blockedUntilIndependentCheck: true }, {
                warnings: ['Auditoria independente obrigatória antes de considerar o plano de corte validado.'],
              })
            : needsInput(id, task, ['resultado do agente cut_optimization']);
        case 'render':
          return task.input.projectId || task.input.scene
            ? complete(id, task, { sceneReady: true, stage: 'render', requiresValidatedTechnicalPackage: true })
            : needsInput(id, task, ['projectId ou scene']);
        case 'quality':
          return task.input.parts && (task.input.measurements || task.input.photoUrl)
            ? complete(id, task, { validated: true, blockers: [], stage: 'quality' })
            : needsInput(id, task, ['parts', 'measurements ou photoUrl']);
        case 'presentation':
          return task.input.projectId && (task.input.scene || task.input.renderUrl)
            ? complete(id, task, { ready: true, stage: 'presentation' })
            : needsInput(id, task, ['projectId', 'scene ou renderUrl']);
        case 'approval':
          return task.input.presentationId || task.input.approved !== undefined
            ? complete(id, task, { decisionCaptured: true, stage: 'approval' })
            : needsInput(id, task, ['presentationId ou approved']);
        case 'inventory':
          return task.input.materials
            ? complete(id, task, { checked: true, stage: 'inventory' })
            : needsInput(id, task, ['materials']);
        case 'production':
          return parts(task)
            ? complete(id, task, { cutListReady: true, stage: 'production' })
            : needsInput(id, task, ['parts']);
        case 'budget':
          return task.input.materials && (task.input.approved === true || task.input.approvalId)
            ? complete(id, task, { readyForCortecloud: true, stage: 'budget' })
            : needsInput(id, task, ['materials', 'approved ou approvalId']);
        case 'customer':
          return task.input.name
            ? complete(id, task, { customerReady: true, stage: 'customer' })
            : needsInput(id, task, ['name']);
        case 'order':
          return task.input.projectId && task.input.budgetId
            ? complete(id, task, { orderReady: true, stage: 'order' })
            : needsInput(id, task, ['projectId', 'budgetId']);
        case 'documents':
          return task.input.documentType && task.input.budgetId
            ? complete(id, task, { documentReady: true, stage: 'documents' })
            : needsInput(id, task, ['documentType', 'budgetId']);
      }
    },
  };
}
