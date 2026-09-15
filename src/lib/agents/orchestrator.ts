import { getAgent } from './registry';
import { executeSpatialAgent, isSpatialAgent } from './spatialRuntime';
import type { AgentId, AgentResult, AgentTask, Evidence } from './types';

export type AgentPlanStep = { id: string; agentId: AgentId; type: string; input: Record<string, unknown> };
export type AgentPlanResult = { correlationId: string; results: AgentResult[]; status: 'completed' | 'needs_input' | 'failed' };
function uuid(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function collectEvidence(results: AgentResult[]): Evidence[] { return results.flatMap((result) => result.evidence ?? []); }

function dependencyData(results: AgentResult[], key: string): unknown {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const value = results[index].data?.[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

export async function runAgentPlan(steps: AgentPlanStep[], correlationId = uuid()): Promise<AgentPlanResult> {
  const results: AgentResult[] = []; const done = new Set<AgentId>(); const remaining = [...steps];
  while (remaining.length) {
    const ready = remaining.filter((step) => getAgent(step.agentId).dependencies?.every((dep) => done.has(dep)) ?? true);
    if (!ready.length) return { correlationId, results, status: 'failed' };
    const evidence = collectEvidence(results);
    const batch = await Promise.all(ready.map(async (step) => {
      const dependencyIds = new Set(getAgent(step.agentId).dependencies ?? []);
      const dependencyResults = results.filter((result) => dependencyIds.has(result.agentId));
      const input = { ...step.input };
      for (const key of ['parts', 'sheetTemplates', 'kerf', 'cutPlan', 'hardware', 'bom', 'modules']) {
        if (input[key] === undefined) {
          const generated = dependencyData(dependencyResults, key);
          if (generated !== undefined) input[key] = generated;
        }
      }
      const task: AgentTask = { id: step.id, type: step.type, input, correlationId, context: { originalInput: { ...step.input }, dependencyResults, evidence } };
      return isSpatialAgent(step.agentId) ? executeSpatialAgent(step.agentId, task) : getAgent(step.agentId).handle(task);
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

export async function runSpatialJourney(input: Record<string, unknown>, correlationId = uuid()): Promise<AgentPlanResult> {
  return runAgentPlan([
    { id: 'vision', agentId: 'vision', type: 'vision.environment.analyze', input },
    { id: 'perspective', agentId: 'perspective', type: 'vision.perspective.analyze', input },
    { id: 'measurement', agentId: 'measurement', type: 'measurement.validate', input },
    { id: 'measurement_prediction', agentId: 'measurement_prediction', type: 'measurement.predict', input },
    { id: 'multiview', agentId: 'multiview', type: 'multiview.reconcile', input },
    { id: 'furniture_engineering', agentId: 'furniture_engineering', type: 'furniture.engineer', input },
    { id: 'materials', agentId: 'materials', type: 'materials.prepare', input },
    { id: 'render', agentId: 'render', type: 'render.prepare', input },
  ], correlationId);
}

export async function runProjectJourney(input: Record<string, unknown>): Promise<AgentPlanResult> {
  return runAgentPlan([
    { id: 'customer', agentId: 'customer', type: 'customer.validate', input },
    { id: 'project', agentId: 'project', type: 'project.prepare', input },
    { id: 'vision', agentId: 'vision', type: 'vision.environment.analyze', input },
    { id: 'perspective', agentId: 'perspective', type: 'vision.perspective.analyze', input },
    { id: 'measurement', agentId: 'measurement', type: 'measurement.validate', input },
    { id: 'measurement_prediction', agentId: 'measurement_prediction', type: 'measurement.predict', input },
    { id: 'multiview', agentId: 'multiview', type: 'multiview.reconcile', input },
    { id: 'furniture_engineering', agentId: 'furniture_engineering', type: 'furniture.engineer', input },
    { id: 'materials', agentId: 'materials', type: 'materials.prepare', input },
    { id: 'cut_optimization', agentId: 'cut_optimization', type: 'cut.optimize', input },
    { id: 'cut_audit', agentId: 'cut_audit', type: 'cut.audit', input },
    { id: 'render', agentId: 'render', type: 'render.prepare', input },
    { id: 'quality', agentId: 'quality', type: 'quality.validate', input },
    { id: 'presentation', agentId: 'presentation', type: 'presentation.prepare', input },
    { id: 'approval', agentId: 'approval', type: 'approval.record', input },
    { id: 'inventory', agentId: 'inventory', type: 'inventory.check', input },
    { id: 'production', agentId: 'production', type: 'production.prepare', input },
    { id: 'budget', agentId: 'budget', type: 'budget.prepare', input },
    { id: 'documents', agentId: 'document.prepare', input: {} as Record<string, unknown> },
    { id: 'order', agentId: 'order', type: 'order.prepare', input },
  ]);
}
