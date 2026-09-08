import type { AgentDefinition, AgentResult, AgentTask } from './types';

function complete(agentId: AgentDefinition['id'], task: AgentTask, data: Record<string, unknown>): AgentResult {
  return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'completed', data };
}

function needsInput(agentId: AgentDefinition['id'], task: AgentTask, fields: string[]): AgentResult {
  return { agentId, taskId: task.id, correlationId: task.correlationId, status: 'needs_input', data: { missing: fields } };
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
        case 'measurement':
          return task.input.measurements || task.input.photoUrl
            ? complete(id, task, { validated: true, stage: 'measurement' })
            : needsInput(id, task, ['measurements or photoUrl']);
        case 'materials':
          return task.input.parts
            ? complete(id, task, { normalized: true, stage: 'materials' })
            : needsInput(id, task, ['parts']);
        case 'budget':
          return task.input.materials
            ? complete(id, task, { readyForCortecloud: true, stage: 'budget' })
            : needsInput(id, task, ['materials']);
        case 'inventory':
          return task.input.materials
            ? complete(id, task, { checked: true, stage: 'inventory' })
            : needsInput(id, task, ['materials']);
        case 'production':
          return task.input.parts
            ? complete(id, task, { cutListReady: true, stage: 'production' })
            : needsInput(id, task, ['parts']);
        case 'render':
          return task.input.projectId || task.input.scene
            ? complete(id, task, { sceneReady: true, stage: 'render' })
            : needsInput(id, task, ['projectId or scene']);
        case 'customer':
          return task.input.name
            ? complete(id, task, { customerReady: true, stage: 'customer' })
            : needsInput(id, task, ['name']);
        case 'order':
          return task.input.projectId
            ? complete(id, task, { orderReady: true, stage: 'order' })
            : needsInput(id, task, ['projectId']);
        case 'documents':
          return task.input.documentType
            ? complete(id, task, { documentReady: true, stage: 'documents' })
            : needsInput(id, task, ['documentType']);
      }
    },
  };
}
