import { getAgent } from './registry';
import { executeSpatialAgent, isSpatialAgent } from './spatialRuntime';
import { validateProductionPackage } from '@/lib/production/packageValidation';
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

function gateClientApproval(agentId: AgentId, result: AgentResult, input: Record<string, unknown>): AgentResult {
  if (agentId !== 'approval') return result;
  const decision = input.clientDecision;
  const approved = input.approved === true || decision === 'approved';
  if (approved) {
    return { ...result, status: 'completed', data: { ...result.data, decisionCaptured: true, clientDecision: 'approved', productionGate: 'open' } };
  }
  if (decision === 'changes_requested') {
    return { ...result, status: 'needs_input', data: { ...result.data, decisionCaptured: false, clientDecision: 'changes_requested', productionGate: 'closed' }, blockers: ['Cliente solicitou alteração. A versão deve retornar para revisão antes de qualquer congelamento ou produção.'] };
  }
  return { ...result, status: 'needs_input', data: { ...result.data, decisionCaptured: false, clientDecision: 'pending', productionGate: 'closed' }, blockers: ['Aguardando decisão do cliente pelo link de revisão: aprovar ou solicitar alteração.'] };
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
          const generated = dependencyData(results, key);
          if (generated !== undefined) input[key] = generated;
        }
      }
      const task: AgentTask = { id: step.id, type: step.type, input, correlationId, context: { originalInput: { ...step.input }, dependencyResults, evidence } };
      const rawResult = isSpatialAgent(step.agentId) ? await executeSpatialAgent(step.agentId, task) : await getAgent(step.agentId).handle(task);
      const result = gateClientApproval(step.agentId, rawResult, input);
      if (step.agentId === 'production' && result.status === 'completed') {
        const productionParts = Array.isArray(input.parts) ? input.parts as Array<Record<string, unknown>> : [];
        const productionCutPlan = Array.isArray(input.cutPlan) ? input.cutPlan as Array<Record<string, unknown>> : [];
        const productionBom = Array.isArray(input.bom) ? input.bom as Array<Record<string, unknown>> : [];
        if (!productionParts.length || !productionCutPlan.length) {
          return { ...result, status: 'needs_input' as const, data: { ...result.data, productionReady: false }, blockers: ['Produção bloqueada: peças e plano de corte validados são obrigatórios.'] };
        }
        const validation = validateProductionPackage(productionParts, productionCutPlan, productionBom);
        if (!validation.valid) {
          return { ...result, status: 'needs_input' as const, data: { ...result.data, productionReady: false, validation }, blockers: validation.blockers };
        }
        return { ...result, data: { ...result.data, productionReady: true, validation, cutPlan: productionCutPlan, bom: productionBom } };
      }
      return result;
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

/**
 * Spatial preparation stops at render. Production-oriented engineering is
 * deliberately excluded here because it must only run after project approval.
 */
export async function runSpatialJourney(input: Record<string, unknown>, correlationId = uuid()): Promise<AgentPlanResult> {
  return runAgentPlan([
    { id: 'vision', agentId: 'vision', type: 'vision.environment.analyze', input },
    { id: 'perspective', agentId: 'perspective', type: 'vision.perspective.analyze', input },
    { id: 'measurement', agentId: 'measurement', type: 'measurement.validate', input },
    { id: 'measurement_prediction', agentId: 'measurement_prediction', type: 'measurement.predict', input },
    { id: 'multiview', agentId: 'multiview', type: 'multiview.reconcile', input },
    { id: 'render', agentId: 'render', type: 'render.prepare', input },
  ], correlationId);
}

