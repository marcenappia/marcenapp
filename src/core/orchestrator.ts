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
  if (normalizedUnit === 'm') return n * 1000;
  if (normalizedUnit === 'cm') return n * 10;
  return n;
}

function extractAxisDimension(text: string, axis: 'width' | 'height' | 'depth'): number | undefined {
  const axisWords = axis === 'width' ? '(?:largura|largo|comprimento)' : axis === 'height' ? '(?:altura|alto)' : '(?:profundidade|profundo)';
  const number = '(\\d+(?:[.,]\\d+)?)';
  const unit = '(mm|cm|m)?';
  const patterns = [
    new RegExp(`${axisWords}\\s*(?:é|e|de|:|=)?\\s*${number}\\s*(?:${unit})\\b`, 'i'),
    new RegExp(`${number}\\s*(?:${unit})\\s*(?:de\\s+)?${axisWords}\\b`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const numericIndex = match.findIndex((value, index) => index > 0 && /^\\d/.test(value));
    if (numericIndex < 0) continue;
    const rawNumber = match[numericIndex];
    const unitValue = match[numericIndex + 1];
    const result = toMillimeters(rawNumber, unitValue);
    if (Number.isFinite(result)) return result;
  }
  return undefined;
}

function extractOrderedDimensions(text: string): { width: number; height: number; depth: number } | undefined {
  const match = text.match(/(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)?\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)?\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)?/i);
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
  const recentUserText = conversation
    .filter((item): item is { sender: string; text: string } => Boolean(item) && typeof item === 'object' && (item as { sender?: unknown }).sender === 'user' && typeof (item as { text?: unknown }).text === 'string')
    .slice(-6)
    .map((item) => item.text)
    .join(' ');
  return /\b(crie|criar|cria|novo projeto|novo móvel|novo movel|monte um projeto|faça um projeto|faca um projeto)\b/i.test(recentUserText);
}

function projectNameFromText(text: string): string {
  const match = text.match(/(?:crie|criar|cria|novo)\s+(?:um|uma)?\s*([a-záàâãéêíóôõúç][a-záàâãéêíóôõúç0-9 -]{1,80}?)(?=\s+(?:de|com|medindo|nas medidas|medidas de)\b|\s+\\d|$)/i);
  return match?.[1]?.trim() || 'Novo projeto';
}

function deterministicCreateProjectPlan(userPrompt: string, context?: Record<string, unknown>): ToolCall[] {
  if (!inferProjectCreationFromConversation(userPrompt, context)) return [];
  const conversation = Array.isArray(context?.conversation) ? context?.conversation : [];
  const recentText = conversation
    .filter((item): item is { sender: string; text: string } => Boolean(item) && typeof item === 'object' && (item as { sender?: unknown }).sender === 'user' && typeof (item as { text?: unknown }).text === 'string')
    .slice(-6)
    .map((item) => item.text)
    .join(' ');
  const combined = `${recentText} ${userPrompt}`.trim();
  const dimensions = extractTextProjectDimensions(combined);
  if (!dimensions) return [];
  const name = projectNameFromText(combined);
  return [{ tool: 'createProjeto', args: { nome: name, ...dimensions, tipo: name, confirmado: true } }];
}

export async function runOrchestrator(userPrompt: string, ctx: ExecutionContext, context?: Record<string, unknown>): Promise<OrchestratorRun> {
  let runId: string | null = null;
  try {
    const { data } = await supabase.from('orchestrator_runs').insert({ user_id: ctx.userId, user_prompt: userPrompt, status: 'planning' }).select('id').single();
    runId = data?.id ?? null;
  } catch (e) { console.warn('Falha ao registrar orchestrator_run:', e); }

  const iara = context?.iara as { action?: string; createProjectArgs?: Record<string, unknown> } | undefined;
  const smartAction = smartActionFor(iara?.action);
  const fastCreateProjectPlan = deterministicCreateProjectPlan(userPrompt, context);
  const deterministicProjectPlan: ToolCall[] = iara?.action === 'create_project' && iara.createProjectArgs
    ? [{ tool: 'createProjeto', args: iara.createProjectArgs }]
    : fastCreateProjectPlan;
  const deterministicRenderPlan: ToolCall[] = iara?.action === 'render' ? [{ tool: 'gerarRender', args: { prompt: userPrompt, estilo: ctx.decorStyle } }] : [];
  const deterministicFloorPlan: ToolCall[] = iara?.action === 'analyze_plan' ? [{ tool: 'analisarPlanta', args: { prompt: userPrompt } }] : [];
  const deterministicSmartPlan: ToolCall[] = smartAction ? [{ tool: `iara.${smartAction}`, args: { projectId: ctx.projectId } }] : [];
  const deterministicPlan = deterministicProjectPlan.length
    ? deterministicProjectPlan
    : deterministicFloorPlan.length
      ? deterministicFloorPlan
      : deterministicRenderPlan.length
        ? deterministicRenderPlan
        : deterministicSmartPlan;

  const result = deterministicPlan.length
    ? { plan: deterministicPlan, summary: deterministicProjectPlan.length ? 'Projeto preparado a partir dos dados informados.' : deterministicFloorPlan.length ? 'Planta preparada para análise espacial e perspectiva.' : deterministicRenderPlan.length ? 'Render solicitado diretamente pela IARA.' : 'Ação da IARA conectada ao contexto real do projeto.', provider: undefined as OrchestratorPlan['provider'] }
    : await planWithLLM(userPrompt, context);

  const plan = result.plan.map(call => {
    if ((call.tool === 'calcularOrcamento' || call.tool === 'operationalIntelligence') && !call.args.projetoId && ctx.projectId) return { ...call, args: { ...call.args, projetoId: ctx.projectId } };
    if (call.tool === 'iaraSmartAction' && !call.args.projectId && ctx.projectId) return { ...call, args: { ...call.args, projectId: ctx.projectId } };
    return call;
  });
  const summary = result.summary;
  const results: Array<{ tool: string; result: ToolResult }> = [];

  if (!plan.length) {
    const error = 'A IARA não conseguiu transformar o pedido em uma ação executável. Reformule o pedido ou informe os dados necessários.';
    const failureResult: ToolResult = { ok: false, error };
    const failureResults: Array<{ tool: string; result: ToolResult }> = [{ tool: 'iara', result: failureResult }];
    if (runId) {
      try { await supabase.from('orchestrator_runs').update({ plan: [], results: failureResults as unknown as Json, used_fallback: false, status: 'needs_input' }).eq('id', runId); } catch (e) { console.warn('Falha ao registrar resultado do orchestrator_run:', e); }
    }
    return { runId, plan, summary, results: failureResults, usedFallback: false, provider: result.provider, error, status: 'needs_input' };
  }

  const spatialAction = iara?.action === 'analyze_plan' || iara?.action === 'render';
  const images = spatialImages(ctx);
  if (spatialAction && images.length) {
    const spatial = await runSpatialJourney({ prompt: userPrompt, projectId: ctx.projectId, environmentId: ctx.environmentId, versionId: ctx.versionId, images }, ctx.correlationId ?? undefined);
    if (spatial.status !== 'completed') {
      const error = spatial.results.find((item) => item.status === 'failed')?.error
        ?? spatial.results.find((item) => item.status === 'needs_input')?.blockers?.[0]
        ?? 'Os agentes espaciais não conseguiram validar o contexto do ambiente.';
      const failedAgent = spatial.results.find((item) => item.status !== 'completed')?.agentId ?? 'spatial';
      const failureResult: ToolResult = { ok: false, error };
      const failureResults: Array<{ tool: string; result: ToolResult }> = [{ tool: `spatial.${failedAgent}`, result: failureResult }];
      if (runId) {
        try { await supabase.from('orchestrator_runs').update({ plan: plan as unknown as Json, results: spatial.results as unknown as Json, used_fallback: false, status: spatial.status }).eq('id', runId); } catch (e) { console.warn('Falha ao registrar resultado espacial:', e); }
      }
      return { runId, plan, summary, results: failureResults, usedFallback: false, provider: result.provider, error, status: spatial.status };
    }
  }

  for (const call of plan) {
    const r = call.tool === 'iaraSmartAction'
      ? await executeIaraSmartAction(String(call.args.action) as SmartAction, typeof call.args.projectId === 'string' ? call.args.projectId : ctx.projectId)
      : call.tool.startsWith('iara.')
        ? await executeIaraSmartAction(call.tool.slice(5) as SmartAction, ctx.projectId)
        : await executeToolCall(call.tool, call.args, ctx);
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