// IARA OS v1 — Client-side orchestrator wrapper
// Chama ai-orchestrator (Function Calling) e executa o plano via toolRegistry.
import { supabase } from '@/integrations/supabase/client';
import { executeToolCall, type ExecutionContext, type ToolResult } from './toolRegistry';
import { callAIFunction } from '@/services/ai';
import { runSpatialJourney } from '@/lib/agents/orchestrator';
import { executeIaraSmartAction, type SmartAction } from './iaraSmartActions';
import type { Json } from '@/integrations/supabase/runtime-types';
import { deterministicResolver } from './iara/intent/deterministicResolver';
import type { ResolvedIntent } from './iara/intent/types';
import { defaultResolverChain, resolveIntent } from './iara/intent/resolverChain';

export interface ToolCall { tool: string; args: Record<string, unknown>; }
export interface OrchestratorPlan { plan: ToolCall[]; summary: string; model?: string; provider?: 'lovable' | 'gemini'; }
export interface PendingInput { tool: string; fields: string[]; reason: string; }
export interface OrchestratorRun { runId: string | null; plan: ToolCall[]; summary: string; results: Array<{ tool: string; result: ToolResult }>; usedFallback: boolean; provider?: 'lovable' | 'gemini'; error?: string; pendingInput?: PendingInput; status: 'completed' | 'failed' | 'needs_input'; }

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

function isClarificationPrompt(value: string): boolean {
  return /^(o que você precisa|o que precisa|qual informação você precisa|que informação você precisa|o que falta|qual dado falta|do que você precisa)[?!. ]*$/i.test(normalizeText(value));
}

function conversationMessages(context?: Record<string, unknown>) {
  return Array.isArray(context?.conversation) ? context.conversation.filter((item): item is { sender: string; text: string; metadata?: { pendingInput?: PendingInput } } =>
    Boolean(item) && typeof item === 'object' && typeof (item as { sender?: unknown }).sender === 'string' && typeof (item as { text?: unknown }).text === 'string'
  ) : [];
}

function lastPendingInput(context?: Record<string, unknown>): PendingInput | null {
  const conversation = conversationMessages(context);
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const pending = conversation[index].metadata?.pendingInput;
    if (pending && typeof pending.tool === 'string' && Array.isArray(pending.fields) && pending.fields.length > 0 && typeof pending.reason === 'string') return pending;
  }
  return null;
}

function lastUserMessage(context?: Record<string, unknown>): string | null {
  const conversation = conversationMessages(context);
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    if (conversation[index].sender === 'user' && conversation[index].text.trim()) return conversation[index].text.trim();
  }
  return null;
}

function lastNeedsInputMessage(context?: Record<string, unknown>): string | null {
  const conversation = conversationMessages(context);
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const item = conversation[index];
    if (item.sender !== 'iara') continue;
    if (/preciso confirmar uma informação|aguardando informação|não conseguiu transformar|envie uma foto|informe os dados necessários/i.test(item.text)) {
      return item.text.replace(/^preciso confirmar uma informação antes de continuar\.?\s*/i, '').trim() || item.text;
    }
  }
  return null;
}

function isGenericNeed(message: string): boolean {
  return /^(a iara não conseguiu transformar o pedido em uma ação executável\.? reformule o pedido ou informe os dados necessários\.?|tente novamente\.?|pode me dizer o que você quer fazer no projeto\??)$/i.test(normalizeText(message));
}

function normalizeText(value: unknown): string {
  return String(value ?? '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

function normalizePortugueseNumberWords(value: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bduas\b/g, '2'], [/\bdois\b/g, '2'], [/\btrês\b/g, '3'], [/\btres\b/g, '3'],
    [/\bquatro\b/g, '4'], [/\bcinco\b/g, '5'], [/\bseis\b/g, '6'],
    [/\bsete\b/g, '7'], [/\boito\b/g, '8'], [/\bnove\b/g, '9'],
    [/\bdez\b/g, '10'], [/\bonze\b/g, '11'], [/\bdoze\b/g, '12'],
    [/\btreze\b/g, '13'], [/\bquatorze\b/g, '14'], [/\bcatorze\b/g, '14'],
    [/\bquinze\b/g, '15'], [/\bdezesseis\b/g, '16'], [/\bdezessete\b/g, '17'],
    [/\bdezoito\b/g, '18'], [/\bdezenove\b/g, '19'], [/\bvinte\b/g, '20'],
  ];
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
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
  const normalizedText = normalizePortugueseNumberWords(normalizeText(text));
  const ordered = extractOrderedDimensions(normalizedText);
  if (ordered) return ordered;
  const width = extractAxisDimension(normalizedText, 'width');
  const height = extractAxisDimension(normalizedText, 'height');
  const depth = extractAxisDimension(normalizedText, 'depth');
  if (![width, height, depth].every((value) => Number.isFinite(value))) return undefined;
  return { width: width as number, height: height as number, depth: depth as number };
}

function inferProjectCreationFromConversation(userPrompt: string, context?: Record<string, unknown>): boolean {
  const current = normalizeText(userPrompt);
  if (/\b(crie|criar|cria|quero|preciso|gostaria|novo projeto|novo móvel|novo movel|monte um projeto|faça um projeto|faca um projeto)\b/i.test(current) && /\b(projeto|móvel|movel|armário|armario|cozinha|bancada)\b/i.test(current)) return true;
  const conversation = Array.isArray(context?.conversation) ? context?.conversation : [];
  const recentUserText = conversation.filter((item): item is { sender: string; text: string } => Boolean(item) && typeof item === 'object' && (item as { sender?: unknown }).sender === 'user' && typeof (item as { text?: unknown }).text === 'string').slice(-6).map((item) => item.text).join(' ');
  return /\b(crie|criar|cria|quero|preciso|gostaria|novo projeto|novo móvel|novo movel|monte um projeto|faça um projeto|faca um projeto)\b/i.test(recentUserText) && /\b(projeto|móvel|movel|armário|armario|cozinha|bancada)\b/i.test(recentUserText);
}

function projectNameFromText(text: string): string {
  const match = text.match(/(?:crie|criar|cria|novo)\s+(?:um|uma)?\s*([a-záàâãéêíóôõúç][a-záàâãéêíóôõúç0-9 -]{1,80}?)(?=\s+(?:de|com|medindo|nas medidas|medidas de)\b|\s+\d|$)/i);
  return match?.[1]?.trim() || 'Novo projeto';
}

function pendingCreateProjectInput(userPrompt: string, context?: Record<string, unknown>): PendingInput | null {
  if (!inferProjectCreationFromConversation(userPrompt, context)) return null;
  const conversation = Array.isArray(context?.conversation) ? context.conversation : [];
  const recentText = conversation.filter((item): item is { sender: string; text: string } => Boolean(item) && typeof item === 'object' && (item as { sender?: unknown }).sender === 'user' && typeof (item as { text?: unknown }).text === 'string').slice(-6).map((item) => item.text).join(' ');
  const combined = recentText + ' ' + userPrompt;
  const normalized = normalizePortugueseNumberWords(normalizeText(combined));
  if (extractTextProjectDimensions(combined)) return null;
  const missing: string[] = [];
  if (extractAxisDimension(normalized, 'width') === undefined) missing.push('width');
  if (extractAxisDimension(normalized, 'height') === undefined) missing.push('height');
  if (extractAxisDimension(normalized, 'depth') === undefined) missing.push('depth');
  if (!missing.length) return null;
  return { tool: 'createProjeto', fields: missing, reason: 'Para criar o projeto, informe as dimensões que faltam: ' + missing.join(', ') + '.' };
}

async function resolveArchitectureIntent(userPrompt: string, context?: Record<string, unknown>, ctx?: ExecutionContext, images: Array<{ mimeType: string; data: string }> = []): Promise<ResolvedIntent | null> {
  const conversation = Array.isArray(context?.conversation)
    ? context.conversation
        .filter((item): item is { sender: 'user' | 'iara'; text: string } =>
          Boolean(item) &&
          typeof item === 'object' &&
          ((item as { sender?: unknown }).sender === 'user' || (item as { sender?: unknown }).sender === 'iara') &&
          typeof (item as { text?: unknown }).text === 'string'
        )
        .map(item => ({ sender: item.sender, text: item.text }))
    : [];

  const correlationId = ctx?.correlationId ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  const llmResolver = {
    name: 'llm',
    async resolve(input: Parameters<typeof resolveIntent>[0]): Promise<ResolvedIntent | null> {
      const contextBlock = JSON.stringify({
        projectId: input.context.projectId,
        environmentId: input.context.environmentId,
        decorStyle: input.context.decorStyle,
        conversation: input.context.recentMessages.slice(-12),
      });
      const response = await planWithLLM(input.text, { conversation: input.context.recentMessages, context: contextBlock });
      const first = response.plan[0];
      const intentMap: Record<string, ResolvedIntent['intent']> = {
        createCliente: 'create_cliente',
        createProjeto: 'create_projeto',
        gerarRender: 'gerar_render',
        calcularOrcamento: 'calcular_orcamento',
        gerarContrato: 'gerar_contrato',
        operationalIntelligence: 'operational_intelligence',
        iaraSmartAction: 'smart_action',
      };
      if (!first) return response.summary ? { intent: 'unknown', entities: {}, confidence: 0.3, missingSlots: [], source: 'llm', summary: response.summary } : null;
      return {
        intent: intentMap[first.tool] ?? 'unknown',
        entities: first.args ?? {},
        confidence: intentMap[first.tool] ? 0.8 : 0.3,
        missingSlots: [],
        source: 'llm',
        summary: response.summary,
      };
    },
  };

  const chain = defaultResolverChain(deterministicResolver, llmResolver);
  return resolveIntent({
    text: userPrompt,
    images,
    context: {
      projectId: ctx?.projectId,
      environmentId: ctx?.environmentId,
      decorStyle: ctx?.decorStyle,
      recentMessages: conversation,
    },
    correlationId,
  }, chain);
}
function deterministicCreateProjectPlan(userPrompt: string, context?: Record<string, unknown>): ToolCall[] {
  if (!inferProjectCreationFromConversation(userPrompt, context)) return [];
  const conversation = Array.isArray(context?.conversation) ? context?.conversation : [];
  const recentText = conversation.filter((item): item is { sender: string; text: string } => Boolean(item) && typeof item === 'object' && (item as { sender?: unknown }).sender === 'user' && typeof (item as { text?: unknown }).text === 'string').slice(-6).map((item) => item.text).join(' ');
  const combined = `${recentText} ${userPrompt}`.trim();
  const dimensions = extractTextProjectDimensions(combined);
  if (!dimensions) return [];
  const name = projectNameFromText(combined);
  const doorsMatch = normalizePortugueseNumberWords(normalizeText(combined)).match(/(\\d+)\\s+portas?\\b/i);
  const doors = doorsMatch ? Number(doorsMatch[1]) : undefined;
  const args = { nome: name, ...dimensions, ...(Number.isInteger(doors) && doors > 0 ? { doors } : {}), tipo: name, confirmado: true };
  return [{ tool: 'createProjeto', args }];
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
  let architectureIntent: Awaited<ReturnType<typeof resolveArchitectureIntent>> | null = null;
  try {
    const clarification = isClarificationPrompt(userPrompt);
    const structuredPending = lastPendingInput(context);
    const previousNeed = structuredPending?.reason ?? (clarification ? lastNeedsInputMessage(context) : null);
    let effectiveUserPrompt = userPrompt;
    if (clarification) {
      // A pergunta "o que você precisa?" is a continuation, not a new action.
      // If the previous blocker was already specific, return it. If it was only
      // the generic fallback, replay the last concrete user request so the
      // orchestrator can resolve it instead of trapping the chat in a loop.
      if (previousNeed && !isGenericNeed(previousNeed)) {
        const result: ToolResult = { ok: false, error: previousNeed };
        if (runId) await supabase.from('orchestrator_runs').update({ plan: [], results: [{ tool: 'iara', result }] as unknown as Json, used_fallback: false, status: 'needs_input', error: previousNeed }).eq('id', runId);
        return { runId, plan: [], summary: previousNeed, results: [{ tool: 'iara', result }], usedFallback: false, pendingInput: structuredPending ?? undefined, status: 'needs_input', error: previousNeed };
      }
      const previousUserPrompt = lastUserMessage(context);
      if (previousUserPrompt) effectiveUserPrompt = previousUserPrompt;
    }
    const iara = context?.iara as { action?: string; createProjectArgs?: Record<string, unknown> } | undefined;
    const smartAction = smartActionFor(iara?.action);
    const images = spatialImages(ctx);
    // Explicit render actions are already resolved by the IARA domain layer.\n    // Do not call the text planner here: a render request must go straight to\n    // gerarRender so a transient Gemini Text outage cannot block image generation.\n    architectureIntent = iara?.action === 'render'\n      ? null\n      : await resolveArchitectureIntent(effectiveUserPrompt, context, ctx, images);
    const fastCreateProjectPlan = deterministicCreateProjectPlan(effectiveUserPrompt, context);
    const pendingCreateProject = pendingCreateProjectInput(effectiveUserPrompt, context);
    const architecturePending = architectureIntent?.missingSlots?.length ? { tool: architectureIntent.intent === 'create_projeto' ? 'createProjeto' : 'unknown', fields: architectureIntent.missingSlots.map(slot => slot.field), reason: architectureIntent.missingSlots.map(slot => slot.label).join(' ') } : null;
    const effectivePendingCreateProject = pendingCreateProject ?? (architecturePending?.tool === 'createProjeto' ? architecturePending : null);
    const architectureProjectPlan: ToolCall[] = architectureIntent?.intent === 'create_projeto' && architectureIntent.missingSlots.length === 0 ? [{ tool: 'createProjeto', args: { ...architectureIntent.entities, confirmado: true } }] : [];
    const architectureRenderPlan: ToolCall[] = architectureIntent?.intent === 'gerar_render' ? [{ tool: 'gerarRender', args: { prompt: String(architectureIntent.entities.prompt ?? effectiveUserPrompt), estilo: ctx.decorStyle } }] : [];
    const architectureSmartPlan: ToolCall[] = architectureIntent?.intent === 'smart_action' ? [{ tool: 'iaraSmartAction', args: { ...architectureIntent.entities, projectId: ctx.projectId } }] : [];
    const deterministicProjectPlan: ToolCall[] = iara?.action === 'create_project' && iara.createProjectArgs ? [{ tool: 'createProjeto', args: iara.createProjectArgs }] : (architectureProjectPlan.length ? architectureProjectPlan : fastCreateProjectPlan);
    const deterministicRenderPlan: ToolCall[] = iara?.action === 'render' ? [{ tool: 'gerarRender', args: { prompt: effectiveUserPrompt, estilo: ctx.decorStyle } }] : [];
    const deterministicFloorPlan: ToolCall[] = iara?.action === 'analyze_plan' ? [{ tool: 'analisarPlanta', args: { prompt: effectiveUserPrompt } }] : [];
    const deterministicEnvironmentPlan: ToolCall[] = iara?.action === 'analyze_environment' ? [{ tool: 'iara.analyze_environment', args: {} }] : [];
    const deterministicSmartPlan: ToolCall[] = smartAction ? [{ tool: `iara.${smartAction}`, args: { projectId: ctx.projectId } }] : [];
    const deterministicPlan = deterministicProjectPlan.length ? deterministicProjectPlan : deterministicFloorPlan.length ? deterministicFloorPlan : deterministicRenderPlan.length ? deterministicRenderPlan : architectureRenderPlan.length ? architectureRenderPlan : deterministicEnvironmentPlan.length ? deterministicEnvironmentPlan : deterministicSmartPlan.length ? deterministicSmartPlan : architectureSmartPlan;

    if (!deterministicPlan.length && effectivePendingCreateProject) {
      const result: ToolResult = { ok: false, error: effectivePendingCreateProject.reason };
      if (runId) await supabase.from('orchestrator_runs').update({ plan: [], results: [{ tool: effectivePendingCreateProject.tool, result }] as unknown as Json, used_fallback: false, status: 'needs_input', error: pendingCreateProject.reason }).eq('id', runId);
      return { runId, plan: [], summary: pendingCreateProject.reason, results: [{ tool: pendingCreateProject.tool, result }], usedFallback: false, status: 'needs_input', error: pendingCreateProject.reason, pendingInput: effectivePendingCreateProject };
    }

    const result = deterministicPlan.length ? { plan: deterministicPlan, summary: deterministicProjectPlan.length ? 'Projeto preparado a partir dos dados informados.' : architectureRenderPlan.length ? 'Render solicitado pela IARA.' : architectureSmartPlan.length ? 'Ação contextual identificada pela IARA.' : deterministicFloorPlan.length ? 'Planta preparada para análise espacial e perspectiva.' : deterministicRenderPlan.length ? 'Render solicitado diretamente pela IARA.' : deterministicEnvironmentPlan.length ? 'Análise do ambiente preparada pela IARA.' : 'Ação da IARA conectada ao contexto real do projeto.', provider: undefined as OrchestratorPlan['provider'] } : await planWithLLM(effectiveUserPrompt, context);
    plan = result.plan;
    summary = result.summary;
    provider = result.provider;
    plan = plan.map(call => {
      if ((call.tool === 'calcularOrcamento' || call.tool === 'operationalIntelligence') && !call.args.projetoId && ctx.projectId) return { ...call, args: { ...call.args, projetoId: ctx.projectId } };
      if (call.tool === 'iaraSmartAction' && !call.args.projectId && ctx.projectId) return { ...call, args: { ...call.args, projectId: ctx.projectId } };
      return call;
    });

    const spatialAction = iara?.action === 'analyze_plan' || iara?.action === 'analyze_environment';
    if (iara?.action === 'analyze_environment' && !images.length) {
      const error = 'Para analisar o ambiente, envie uma foto do ambiente. Assim a IARA pode avaliar o espaço real sem inventar informações.';
      const failureResults: Array<{ tool: string; result: ToolResult }> = [{ tool: 'iara.analyze_environment', result: { ok: false, error } }];
      if (runId) await supabase.from('orchestrator_runs').update({ plan: [], results: failureResults as unknown as Json, used_fallback: false, status: 'needs_input', error }).eq('id', runId);
      return { runId, plan: [], summary: error, results: failureResults, usedFallback: false, provider, error, status: 'needs_input' };
    }
    if (iara?.action === 'analyze_environment' && images.length) {
      const spatial = await runSpatialJourney({ prompt: effectiveUserPrompt, projectId: ctx.projectId, environmentId: ctx.environmentId, versionId: ctx.versionId, images }, ctx.correlationId ?? undefined);
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
    const failedResult = results.find((r): r is { tool: string; result: Extract<ToolResult, { ok: false }> } => !r.result.ok)?.result;
    if (runId) await supabase.from('orchestrator_runs').update({ plan: plan as unknown as Json, results: results as unknown as Json, used_fallback: false, status, ...(status === 'failed' ? { error: failedResult?.error ?? 'A execução falhou.' } : {}) }).eq('id', runId);
    return { runId, plan, summary, results, usedFallback: false, provider, status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha inesperada na execução do orquestrador.';
    await persistRunFailure(runId, plan, message);
    return { runId, plan, summary, results: [{ tool: 'iara', result: { ok: false, error: message } }], usedFallback: false, provider, error: message, status: 'failed' };
  }
}
