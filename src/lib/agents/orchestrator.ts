import { getAgent } from './registry';
import type { AgentId, AgentResult, AgentTask } from './types';

export type AgentPlanStep = {
  id: string;
  agentId: AgentId;
  type: string;
  input: Record<string, unknown>;
};

export type AgentPlanResult = {
  correlationId: string;
  results: AgentResult[];
  status: 'completed' | 'needs_input' | 'failed';
};

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function runAgentPlan(steps: AgentPlanStep[], correlationId = uuid()): Promise<AgentPlanResult> {
  const results: AgentResult[] = [];
  const done = new Set<AgentId>();
  const remaining = [...steps];

  while (remaining.length) {
    const ready = remaining.filter((step) => getAgent(step.agentId).dependencies?.every((dep) => done.has(dep)) ?? true);
    if (!ready.length) return { correlationId, results, status: 'failed' };

    const batch = await Promise.all(ready.map(async (step) => {
      const task: AgentTask = { id: step.id, type: step.type, input: step.input, correlationId };
      return getAgent(step.agentId).handle(task);
    }));

    for (const result of batch) {
      results.push(result);
      if (result.status === 'failed') return { correlationId, results, status: 'failed' };
      if (result.status === 'needs_input') return { correlationId, results, status: 'needs_input' };
      done.add(result.agentId);
    }

    for (const step of ready) remaining.splice(remaining.indexOf(step), 1);
  }

  return { correlationId, results, status: 'completed' };
}

/** Canonical commercial journey. The existing UI flow is preserved; agents execute underneath it. */
export async function runProjectJourney(input: Record<string, unknown>): Promise<AgentPlanResult> {
  return runAgentPlan([
    { id: 'customer', agentId: 'customer', type: 'customer.validate', input },
    { id: 'project', agentId: 'project', type: 'project.prepare', input },
    { id: 'measurement', agentId: 'measurement', type: 'measurement.validate', input },
    { id: 'materials', agentId: 'materials', type: 'materials.prepare', input },
    { id: 'render', agentId: 'render', type: 'render.prepare', input },
    { id: 'quality', agentId: 'quality', type: 'quality.validate', input },
    { id: 'presentation', agentId: 'presentation', type: 'presentation.prepare', input },
    { id: 'approval', agentId: 'approval', type: 'approval.record', input },
    { id: 'inventory', agentId: 'inventory', type: 'inventory.check', input },
    { id: 'production', agentId: 'production', type: 'production.prepare', input },
    { id: 'budget', agentId: 'budget', type: 'budget.prepare', input },
    { id: 'documents', agentId: 'documents', type: 'document.prepare', input },
    { id: 'order', agentId: 'order', type: 'order.prepare', input },
  ]);
}
