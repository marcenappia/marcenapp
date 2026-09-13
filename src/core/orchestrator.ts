// IARA OS v1 — Client-side orchestrator wrapper
// Chama ai-orchestrator (Function Calling) e executa o plano via toolRegistry.
import { supabase } from '@/integrations/supabase/client';
import { executeToolCall, type ExecutionContext, type ToolResult } from './toolRegistry';
import { callAIFunction } from '@/services/ai';
import type { Json } from '@/integrations/supabase/runtime-types';

export interface ToolCall { tool: string; args: Record<string, unknown>; }
export interface OrchestratorPlan { plan: ToolCall[]; summary: string; model?: string; provider?: 'lovable' | 'gemini'; }
export interface OrchestratorRun { runId: string | null; plan: ToolCall[]; summary: string; results: Array<{ tool: string; result: ToolResult }>; usedFallback: boolean; provider?: 'lovable' | 'gemini'; error?: string; status: 'completed' | 'failed'; }

export async function planWithLLM(userPrompt: string, context?: Record<string, unknown>): Promise<OrchestratorPlan> {
  const data = await callAIFunction<{ plan?: ToolCall[]; summary?: string; model?: string; provider?: 'lovable' | 'gemini' }>('ai-orchestrator', { userPrompt, context });
  return { plan: data.plan ?? [], summary: data.summary ?? '', model: data.model, provider: data.provider };
}

export async function runOrchestrator(userPrompt: string, ctx: ExecutionContext, context?: Record<string, unknown>): Promise<OrchestratorRun> {
  let runId: string | null = null;
  try {
    const { data } = await supabase.from('orchestrator_runs').insert({ user_id: ctx.userId, user_prompt: userPrompt, status: 'planning' }).select('id').single();
    runId = data?.id ?? null;
  } catch (e) { console.warn('Falha ao registrar orchestrator_run:', e); }

  const iara = context?.iara as { action?: string; createProjectArgs?: Record<string, unknown> } | undefined;
  const deterministicProjectPlan: ToolCall[] = iara?.action === 'create_project' && iara.createProjectArgs ? [{ tool: 'createProjeto', args: iara.createProjectArgs }] : [];
  const deterministicRenderPlan: ToolCall[] = iara?.action === 'render' ? [{ tool: 'gerarRender', args: { prompt: userPrompt, estilo: ctx.decorStyle } }] : [];
  const deterministicPlan = deterministicProjectPlan.length ? deterministicProjectPlan : deterministicRenderPlan;

  const result = deterministicPlan.length
    ? { plan: deterministicPlan, summary: deterministicProjectPlan.length ? 'Projeto preparado a partir das dimensões informadas.' : 'Render solicitado diretamente pela IARA.', provider: undefined as OrchestratorPlan['provider'] }
    : await planWithLLM(userPrompt, context);

  const plan = result.plan.map(call => {
    if ((call.tool === 'calcularOrcamento' || call.tool === 'operationalIntelligence') && !call.args.projetoId && ctx.projectId) return { ...call, args: { ...call.args, projetoId: ctx.projectId } };
    return call;
  });
  const summary = result.summary;
  const results: Array<{ tool: string; result: ToolResult }> = [];
  for (const call of plan) {
    const r = await executeToolCall(call.tool, call.args, ctx);
    results.push({ tool: call.tool, result: r });
    if (!r.ok) break;
  }
  const status: OrchestratorRun['status'] = results.every(r => r.result.ok) ? 'completed' : 'failed';

  if (runId) {
    try { await supabase.from('orchestrator_runs').update({ plan: plan as unknown as Json, results: results as unknown as Json, used_fallback: false, status }).eq('id', runId); }
    catch (e) { console.warn('Falha ao registrar resultado do orchestrator_run:', e); }
  }
  return { runId, plan, summary, results, usedFallback: false, provider: result.provider, status };
}
