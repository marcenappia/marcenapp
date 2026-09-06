// IARA OS v1 — Client-side orchestrator wrapper
// Chama ai-orchestrator (Function Calling) e executa o plano via toolRegistry.
// Fallback: se orchestrator falhar tecnicamente, cai no interpretador antigo (iaraService).
import { supabase } from '@/integrations/supabase/client';
import { executeToolCall, type ExecutionContext, type ToolResult } from './toolRegistry';
import { callAIFunction } from '@/services/ai';
import { IARA_IDENTITY } from './iaraExpert';

export interface ToolCall {
  tool: string;
  args: Record<string, any>;
}

export interface OrchestratorPlan {
  plan: ToolCall[];
  summary: string;
  model?: string;
}

export interface OrchestratorRun {
  runId: string | null;
  plan: ToolCall[];
  summary: string;
  results: Array<{ tool: string; result: ToolResult }>;
  usedFallback: boolean;
  error?: string;
}

export async function planWithLLM(
  userPrompt: string,
  context?: Record<string, any>,
): Promise<OrchestratorPlan> {
  const safetyContext = {
    ...context,
    iaraIdentity: IARA_IDENTITY,
    executionPolicy: {
      language: 'pt-BR',
      neverInventCriticalData: true,
      requireExplicitConfirmationForProjectCreation: true,
      visualEstimatesAreNotProductionMeasurements: true,
      classifyCriticalData: ['CONFIRMADO', 'ESTIMADO', 'PRECISA_CONFERIR'],
      proposeBeforeChangingProjectFromDiaryOrConversation: true,
    },
  };
  const data = await callAIFunction<{ plan?: ToolCall[]; summary?: string; model?: string }>(
    'ai-orchestrator',
    { userPrompt, context: safetyContext },
  );
  return { plan: data.plan ?? [], summary: data.summary ?? '', model: data.model };
}

export async function runOrchestrator(
  userPrompt: string,
  ctx: ExecutionContext,
  context?: Record<string, any>,
): Promise<OrchestratorRun> {
  // Log inicial (best-effort)
  let runId: string | null = null;
  try {
    const { data } = await supabase
      .from('orchestrator_runs')
      .insert({ user_id: ctx.userId, user_prompt: userPrompt, status: 'planning' })
      .select('id')
      .single();
    runId = data?.id ?? null;
  } catch (e) {
    console.warn('Falha ao registrar orchestrator_run:', e);
  }

  let plan: ToolCall[] = [];
  let summary = '';
  let usedFallback = false;

  try {
    const result = await planWithLLM(userPrompt, context);
    plan = result.plan;
    summary = result.summary;
  } catch (e) {
    console.error('Orchestrator LLM falhou, ativando fallback keyword:', e);
    usedFallback = true;
    plan = fallbackPlan(userPrompt);
    summary = 'Interpretação por fallback (keyword matching).';
  }

  const results: Array<{ tool: string; result: ToolResult }> = [];
  for (const call of plan) {
    const r = await executeToolCall(call.tool, call.args, ctx);
    results.push({ tool: call.tool, result: r });
    // Se uma etapa crítica falhou, paramos (evita cascata de erros)
    if (!r.ok) break;
  }

  // Log final
  if (runId) {
    try {
      await supabase
        .from('orchestrator_runs')
        .update({
          plan: plan as any,
          results: results as any,
          used_fallback: usedFallback,
          status: results.every(r => r.result.ok) ? 'completed' : 'failed',
        })
        .eq('id', runId);
    } catch {}
  }

  return { runId, plan, summary, results, usedFallback };
}

// Fallback simples baseado em keywords (comportamento legado)
function fallbackPlan(prompt: string): ToolCall[] {
  const lower = prompt.toLowerCase();
  if (
    lower.includes('render') ||
    lower.includes('mostre') ||
    lower.includes('materializa') ||
    lower.includes('desenhe')
  ) {
    return [{ tool: 'gerarRender', args: { prompt } }];
  }
  if (
    lower.includes('quanto') ||
    lower.includes('preço') ||
    lower.includes('orçamento') ||
    lower.includes('valor')
  ) {
    return [{ tool: 'calcularOrcamento', args: {} }];
  }
  return [];
}
