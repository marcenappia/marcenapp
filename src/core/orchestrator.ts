// IARA OS v1 — Client-side orchestrator wrapper
// Chama ai-orchestrator (Function Calling) e executa o plano via toolRegistry.
import { supabase } from '@/integrations/supabase/client';
import { executeToolCall, type ExecutionContext, type ToolResult } from './toolRegistry';
import { callAIFunction } from '@/services/ai';
import { runSpatialJourney } from '@/lib/agents/orchestrator';
import { executeIaraSmartAction, type SmartAction } from './iaraSmartActions';
import type { Json } from '@/integrations/supabase/runtime-types';

export interface ToolCall { tool: string; args: Record<string, unknown>; }
export interface OrchestratorPlan { plan: ToolCall[]; summary: string; model?: string; provider?: 'lovable' | 'gemini'; }
export interface OrchestratorRun { runId: string | null; plan: ToolCall[]; summary: string; results: Array<{ tool: string; result: ToolResult }>; usedFallback: boolean; provider?: 'lovable' | 'gemini'; error?: string; status: 'completed' | 'failed' | 'needs_input'; }

export async function planWithLLM(userPrompt: string, context?: Record<string, unknown>): Promise<OrchestratorPlan> {
  const data = await callAIFunction<{ plan?: ToolCall[]; summary?: string; model?: string; provider?: 'lovable' | 'gemini' }>('ai-orchestrator', { userPrompt, context });
  return { plan: data.plan ?? [], summary: data.summary ?? '', model: data.model, provider: data.provider };
}

function spatialImages(ctx: ExecutionContext): Array<{ mimeType: string; data: string }> {
  const refs = (ctx.referenceImages ?? []).map((reference) => ({ mimeType: reference.mimeType ?? 'image/png', data: reference.data })).filter((reference) => Boolean(reference.data));
  if (ctx.lastImageBase && !refs.some((reference) => reference.data === ctx.lastImageBase)) refs.unshift({ mimeType: 'image/png', data: ctx.lastImageBase });
  return refs.slice(0, 8);
}

const SMART_ACTIONS = new Set<SmartAction>([
  'materials', 'hardware', 'inventory', 'production', 'cut', 'budget', 'documents', 'order',
  'assembly', 'installation', 'checklist', 'delivery', 'review_project', 'check_measurements',
]);

function smartActionFor(iaraAction?: string): SmartAction | null {
  return iaraAction && SMART_ACTIONS.has(iaraAction as SmartAction) ? iaraAction as SmartAction : null;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

function toMillimeters(value: string, unit?: string): number {
  const n = Number(value.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return NaN;
  const normalizedUnit = unit?.toLocaleLowerCase('pt-BR');
  if (normalizedUnit === 'm' || normalizedUnit === 'metro' || normalizedUnit === 'metros') return n * 1000;
  if (normalizedUnit === 'cm' || normalizedUnit === 'centímetro' || normalizedUnit === 'centímetros') return n * 10;
  if (normalizedUnit === 'mm' || normalizedUnit === 'milímetro' || normalizedUnit === 'milímetros') return n;
  return n;
}

function extractAxisDimension(text: string, axis: 'width' | 'height' | 'depth'): number | undefined {
  const axisWords = axis === 'width' ? '(?:largura|largo|comprimento)' : axis === 'height' ? '(?:altura|alto)' : '(?:profundidade|profundo)';
  const number = '(\\d+(?:[.,]\\d+)?)';
  const unit = '(mm|milímetros?|cm|centímetros?|m|metros?)?';
  const patterns = [
    new RegExp(`${axisWords}\\s*(?:é|e|de|:|=)?\\s*${number}\\s*${unit}\\b`, 'i'),
    new RegExp(`${number}\\s*${unit}\\s*(?:de\\s+)?${axisWords}\\b`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const numericIndex = match.findIndex((value, index) => index > 0 && /^\\d/.test(value));
    if (numericIndex < 0) continue;
    const result = toMillimeters(match[numericIndex], match[numericIndex + 1]);
    if (Number.isFinite(result)) return result;
  }
  return undefined;
}

function extractOrderedDimensions(text: string): { width: number; height: number; depth: number } | undefined {
  const match = text.match(/(\\d+(?:[.,]\\d+)?)\\s*(mm|milímetros?|cm|centímetros?|m|metros?)?\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|milímetros?|cm|centímetros?|m|metros?)?\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|milímetros?|cm|centímetros?|m|metros?)?/i);
  if (!match) return undefined;
  const width = toMillimeters(match[1], match[2]);
  const height = toMillimeters(match[3], match[4]);
  const depth = toMillimeters(match[5], match[6]);
  return [width, height, depth].every((value) => Number.isFinite(value)) ? { width, height, depth } : undefined;
}

function extractTextProjectDimensions(text: string): { width: number; height: number; depth: number } | undefined {
  const ordered = extractOrderedDimensions(text);
  if (ordered) return ordered;
  const width = extractAxisDimension(text, 'width');
  const height = extractAxisDimension(text, 'height');
  const depth = extractAxisDimension(text, 'depth');
  if (![width, height, depth].every((value) => Number.isFinite(value))) return undefined;
  return { width: width as number, height: height as number, depth: depth as number };
}

function inferProjectCreationFromConversation(userPrompt: string, context?: Record<string, unknown>): boolean {
  const current = normalizeText(userPrompt);
  if (/\b(crie|criar|cria|novo projeto|novo móvel|novo movel|monte um projeto|faça um projeto|faca um projeto)\b/i.test(current)) return true;
  const conversation = Array.isArray(context?.conversation) ? context?.conversation : [];
  const recentUserText = conversation.filter((item): item is { sender: string; text: string } => Boolean(item) && typeof item === 'object' && (item as { sender?: unknown }).sender === 'user' && typeof (item as { text?: unknown }).text === 'string').slice(-6).map((item) => item.text).join(' ');
  return /\b(crie|criar|cria|novo projeto|novo móvel|novo movel|monte um projeto|faça um projeto|faca um projeto)\b/i.test(recentUserText);
}

function projectNameFromText(text: string): string {
  const match = text.match(/(?:crie|criar|cria|novo)\s+(?:um|uma)?\s*([a-záàâãéêíóôõúç][a-záàâãéêíóôõúç0-9 -]{1,80}?)(?=\s+(?:de|com|medindo|nas medidas|medidas de)\b|\s+\d|$)/i);
  return match?.[1]?.trim() || 'Novo projeto';
}

function deterministicCreateProjectPlan(userPrompt: string, context?: Record<string, unknown>): ToolCall[] {
  if (!inferProjectCreationFromConversation(userPrompt, context)) return [];
  const conversation = Array.isArray(context?.conversation) ? context?.conversation : [];
  const recentText = conversation.filter((item): item is { sender: string; text: string } => Boolean(item) && typeof item === 'object' && (item as { sender?: unknown }).sender === 'user' && typeof (item as { text?: unknown }).text === 'string').slice(-6).map((item) => item.text).join(' ');
  const combined = `${recentText} ${userPrompt}`.trim();
  const dimensions = extractTextProjectDimensions(combined);
  if (!dimensions) return [];
  const name = projectNameFromText(combined);
  return [{ tool: 'createProjeto', args: { nome: name, ...dimensions, tipo: name, confirmado: true } }];
}

async function persistRunFailure(runId: string | null, plan: ToolCall[], error: string): Promise<void> {
  if (!runId) return;
  try {
    await supabase.from('orchestrator_runs').update({ plan: plan as unknown as Json, results: [{ tool: 'iara', result: { ok: false, error } }] as unknown as Json, used_fallback: false, status: 'failed', error }).eq('id', runId);
  } catch (persistError) {
    console.warn('Falha ao registrar falha do orchestrator_run:', persistError);
  }
}

export async function runOrchestrator(userPrompt: string, ctx: ExecutionContext, context?: Record<string, unknown>): Promise<OrchestratorRun> {
  let runId: string | null = null;
  try {
    const { data } = await supabase.from('orchestrator_runs').insert({ user_id: ctx.userId, user_prompt: userPrompt, status: 'planning' }).select('id').single();
    runId = data?.id ?? null;
  } catch (e) { console.warn('Falha ao registrar orchestrator_run:', e); }

  let plan: ToolCall[] = [];
  let summary = '';
  let provider: OrchestratorPlan['provider'];
  try {
    const iara = context?.iara as { action?: string; createProjectArgs?: Record<string, unknown> } | undefined;
    const smartAction = smartActionFor(iara?.action);
    const fastCreateProjectPlan = deterministicCreateProjectPlan(userPrompt, context);
    const deterministicProjectPlan: ToolCall[] = iara?.action === 'create_project' && iara.createProjectArgs ? [{ tool: 'createProjeto', args: iara.createProjectArgs }] : fastCreateProjectPlan;
    const deterministicRenderPlan: ToolCall[] = iara?.action === 'render' ? [{ tool: 'gerarRender', args: { prompt: userPrompt, estilo: ctx.decorStyle } }] : [];
    const deterministicFloorPlan: ToolCall[] = iara?.action === 'analyze_plan' ? [{ tool: 'analisarPlanta', args: { prompt: userPrompt } }] : [];
    const deterministicEnvironmentPlan: ToolCall[] = iara?.action === 'analyze_environment' ? [{ tool: 'iara.analyze_environment', args: {} }] : [];
    const deterministicSmartPlan: ToolCall[] = smartAction ? [{ tool: `iara.${smartAction}`, args: { projectId: ctx.projectId } }] : [];
    const deterministicPlan = deterministicProjectPlan.length ? deterministicProjectPlan : deterministicFloorPlan.length ? deterministicFloorPlan : deterministicRenderPlan.length ? deterministicRenderPlan : deterministicEnvironmentPlan.length ? deterministicEnvironmentPlan : deterministicSmartPlan;

    const result = deterministicPlan.length ? { plan: deterministicPlan, summary: deterministicProjectPlan.length ? 'Projeto preparado a partir dos dados informados.' : deterministicFloorPlan.length ? 'Planta preparada para análise espacial e perspectiva.' : deterministicRenderPlan.length ? 'Render solicitado diretamente pela IARA.' : deterministicEnvironmentPlan.length ? 'Análise do ambiente preparada pela IARA.' : 'Ação da IARA conectada ao contexto real do projeto.', provider: undefined as OrchestratorPlan['provider'] } : await planWithLLM(userPrompt, context);
    plan = result.plan;
    summary = result.summary;
    provider = result.provider;
    plan = plan.map(call => {
      if ((call.tool === 'calcularOrcamento' || call.tool === 'operationalIntelligence') && !call.args.projetoId && ctx.projectId) return { ...call, args: { ...call.args, projetoId: ctx.projectId } };
      if (call.tool === 'iaraSmartAction' && !call.args.projectId && ctx.projectId) return { ...call, args: { ...call.args, projectId: ctx.projectId } };
      return call;
    });

    const spatialAction = iara?.action === 'analyze_plan' || iara?.action === 'analyze_environment' || iara?.action === 'render';
    const images = spatialImages(ctx);
    if (iara?.action === 'analyze_environment' && !images.length) {
      const error = 'Para analisar o ambiente, envie uma foto do ambiente. Assim a IARA pode avaliar o espaço real sem inventar informações.';
      const failureResults: Array<{ tool: string; result: ToolResult }> = [{ tool: 'iara.analyze_environment', result: { ok: false, error } }];
      if (runId) await supabase.from('orchestrator_runs').update({ plan: [], results: failureResults as unknown as Json, used_fallback: false, status: 'needs_input', error }).eq('id', runId);
      return { runId, plan: [], summary: error, results: failureResults, usedFallback: false, provider, error, status: 'needs_input' };
    }
    if (iara?.action === 'analyze_environment' && images.length) {
      const spatial = await runSpatialJourney({ prompt: userPrompt, projectId: ctx.projectId, environmentId: ctx.environmentId, versionId: ctx.versionId, images }, ctx.correlationId ?? undefined);
      const environmentResults: Array<{ tool: string; result: ToolResult }> = spatial.results.map((item) => ({ tool: `spatial.${item.agentId}`, result: { ok: item.status === 'completed', data: item.data, error: item.status === 'failed' ? item.blockers?.[0] : undefined } }));
      const failed = spatial.results.find((item) => item.status !== 'completed');
      const status: OrchestratorRun['status'] = spatial.status === 'completed' ? 'completed' : spatial.status;
      const error = failed?.blockers?.[0];
      if (runId) await supabase.from('orchestrator_runs').update({ plan: [], results: environmentResults as unknown as Json, used_fallback: false, status, ...(error ? { error } : {}) }).eq('id', runId);
      return { runId, plan: [], summary: summary || 'Ambiente analisado a partir da imagem enviada.', results: environmentResults, usedFallback: false, provider, ...(error ? { error } : {}), status };
    }
    if (!plan.length) {
      const error = 'A IARA não conseguiu transformar o pedido em uma ação executável. Reformule o pedido ou informe os dados necessários.';
      const failureResults: Array<{ tool: string; result: ToolResult }> = [{ tool: 'iara', result: { ok: false, error } }];
      if (runId) await supabase.from('orchestrator_runs').update({ plan: [], results: failureResults as unknown as Json, used_fallback: false, status: 'needs_input', error }).eq('id', runId);
      return { runId, plan, summary, results: failureResults, usedFallback: false, provider, error, status: 'needs_input' };
    }
    if (spatialAction && images.length) {
      const spatial = await runSpatialJourney({ prompt: userPrompt, projectId: ctx.projectId, environmentId: ctx.environmentId, versionId: ctx.versionId, images }, ctx.correlationId ?? undefined);
      if (spatial.status !== 'completed') {
        const error = spatial.results.find((item) => item.status === 'failed')?.error ?? spatial.results.find((item) => item.status === 'needs_input')?.blockers?.[0] ?? 'Os agentes espaciais não conseguiram validar o contexto do ambiente.';
        const failedAgent = spatial.results.find((item) => item.status !== 'completed')?.agentId ?? 'spatial';
        const failureResult: ToolResult = { ok: false, error };
        const failureResults: Array<{ tool: string; result: ToolResult }> = [{ tool: `spatial.${failedAgent}`, result: failureResult }];
        if (runId) await supabase.from('orchestrator_runs').update({ plan: plan as unknown as Json, results: spatial.results as unknown as Json, used_fallback: false, status: spatial.status, error }).eq('id', runId);
        return { runId, plan, summary, results: failureResults, usedFallback: false, provider, error, status: spatial.status };
      }
    }
    const results: Array<{ tool: string; result: ToolResult }> = [];
    for (const call of plan) {
      const r = call.tool === 'iaraSmartAction' ? await executeIaraSmartAction(String(call.args.action) as SmartAction, typeof call.args.projectId === 'string' ? call.args.projectId : ctx.projectId) : call.tool.startsWith('iara.') ? await executeIaraSmartAction(call.tool.slice(5) as SmartAction, ctx.projectId) : await executeToolCall(call.tool, call.args, ctx);
      results.push({ tool: call.tool, result: r });
      if (!r.ok) break;
    }
    const status: OrchestratorRun['status'] = results.length > 0 && results.every(r => r.result.ok) ? 'completed' : 'failed';
    if (runId) await supabase.from('orchestrator_runs').update({ plan: plan as unknown as Json, results: results as unknown as Json, used_fallback: false, status, ...(status === 'failed' ? { error: results.find(r => !r.result.ok)?.result.error ?? 'A execução falhou.' } : {}) }).eq('id', runId);
    return { runId, plan, summary, results, usedFallback: false, provider, status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha inesperada na execução do orquestrador.';
    await persistRunFailure(runId, plan, message);
    return { runId, plan, summary, results: [{ tool: 'iara', result: { ok: false, error: message } }], usedFallback: false, provider, error: message, status: 'failed' };
  }
}
