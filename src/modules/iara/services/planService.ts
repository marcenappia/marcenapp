import { supabase } from '@/integrations/supabase/client';
import { callAIText } from '@/services/ai';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import type { ExecutionContext } from '@/core/toolRegistry';
import { humanSpatialLanguagePrompt } from './spatialLanguage';
import { buildFloorPlanGeometry } from './floorPlanGeometry';
import type { FurnitureModuleSpec } from '@/lib/furniture/package';

interface PlanAnalysis {
  environments?: Array<{ name?: string; type?: string; confidence?: number; position?: number }>;
  dimensions?: { width?: number; depth?: number; ceilingHeight?: number };
  walls?: Array<{ start?: [number, number]; end?: [number, number]; length?: number; humanReference?: string; cardinalReference?: string }>;
  openings?: Array<{ type?: string; position?: string | number; width?: number; height?: number; wallReference?: string }>;
  modules?: FurnitureModuleSpec[];
  notes?: string[];
}

function parseJson(text: string): PlanAnalysis {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('A IA retornou uma análise de planta inválida.');
  return parsed as PlanAnalysis;
}

function clampConfidence(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

async function recentVisualReferences(ctx: ExecutionContext, currentPlan: string) {
  if (!ctx.projectId) return [{ mimeType: 'image/png', data: currentPlan }];
  const { data } = await supabase.from('chat_messages').select('image_url,metadata,created_at').eq('user_id', ctx.userId).eq('project_id', ctx.projectId).not('image_url', 'is', null).order('created_at', { ascending: false }).limit(8);
  const refs = (data ?? []).map((row) => {
    const imageUrl = typeof row.image_url === 'string' ? row.image_url : '';
    const dataPart = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;
    if (!dataPart) return null;
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
    const action = metadata.action === 'analyze_plan' ? 'plan' : 'environment';
    return { mimeType: imageUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg', data: dataPart, kind: action };
  }).filter(Boolean) as Array<{ mimeType: string; data: string; kind: string }>;
  if (!refs.some((ref) => ref.data === currentPlan)) refs.unshift({ mimeType: 'image/png', data: currentPlan, kind: 'plan' });
  return refs.slice(0, 8);
}

export async function analyzeFloorPlanAndQueueRender(args: { prompt: string; planBase64: string }, ctx: ExecutionContext) {
  if (!ctx.projectId) return { ok: false as const, error: 'Selecione um projeto antes de enviar a planta para a IARA.' };
  if (!args.planBase64) return { ok: false as const, error: 'Nenhuma planta foi anexada.' };

  const planId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { data: project, error: projectError } = await supabase.from('projects').select('id,nome,name').eq('id', ctx.projectId).eq('user_id', ctx.userId).maybeSingle();
  if (projectError) return { ok: false as const, error: projectError.message };
  if (!project) return { ok: false as const, error: 'Projeto não encontrado ou sem acesso.' };

  const { error: planError } = await supabase.from('project_plans').insert({ id: planId, project_id: ctx.projectId, name: `Planta analisada pela IARA ${new Date().toLocaleString('pt-BR')}`, status: 'analyzing', metadata: { origin: 'iara', correlationId: ctx.correlationId ?? null } });
  if (planError) return { ok: false as const, error: planError.message };

  const references = await recentVisualReferences(ctx, args.planBase64);
  const analysisPrompt = [
    'Analise a planta baixa e as fotos de referência deste mesmo projeto para móveis planejados.',
    'A planta é a fonte geométrica principal. As fotos complementam aparência, aberturas, elementos fixos e relação espacial.',
    'Reconcilie as vistas quando elas mostrarem o mesmo ambiente. Não trate fotos diferentes como ambientes diferentes sem evidência.',
    'Não invente medidas. Diferencie medido, estimado e desconhecido.',
    'Identifique ambientes, paredes, portas, janelas e dimensões visíveis.',
    'Quando o pedido indicar móveis planejados, proponha módulos apenas quando largura, altura, profundidade e material puderem ser determinados ou forem fornecidos explicitamente. Marque a incerteza nas notas; não invente folgas, sobreposições, ferragens ou medidas de fabricação.',
    humanSpatialLanguagePrompt(args.prompt),
    'Para cada parede, preserve a referência humana quando puder ser determinada: direita, esquerda, frente, trás, fundo, ao lado ou oposta. Pode registrar referência cardeal auxiliar internamente, mas a humana é principal.',
    'Para portas e janelas, informe em qual parede humana elas estão. Se não for possível determinar, use "não determinada".',
    'Para módulos, use IDs estáveis e inclua somente dimensões/materiais sustentados pelas entradas. Portas e gavetas devem trazer dimensões explícitas das frentes; caixas de gaveta devem trazer dimensões explícitas; ferragens só entram quando identificadas ou fornecidas.',
    'Retorne SOMENTE JSON válido no formato:',
    '{"environments":[{"name":"Cozinha","type":"cozinha","confidence":0.9,"position":1}],"dimensions":{"width":0,"depth":0,"ceilingHeight":0},"walls":[{"start":[0,0],"end":[1,0],"length":1,"humanReference":"parede da direita","cardinalReference":"east"}],"openings":[{"type":"door","position":"entrada","wallReference":"parede da frente","width":0,"height":0}],"modules":[{"id":"modulo-01","name":"Balcão","width":1200,"height":900,"depth":600,"quantity":1,"material":"MDP 18","door":{"count":2,"frontWidth":590,"frontHeight":700,"material":"MDF 18","hardware":[]},"drawer":{"count":1,"frontWidth":590,"frontHeight":150,"boxWidth":550,"boxHeight":120,"boxDepth":500,"material":"MDP 15","hardware":[]},"hardware":[]}],"notes":[]}',
  ].join(' ');

  let analysis: PlanAnalysis;
  try {
    analysis = parseJson(await callAIText(analysisPrompt, references.map((reference) => ({ mimeType: reference.mimeType, data: reference.data })), true));
  } catch (error) {
    await supabase.from('project_plans').update({ status: 'failed', metadata: { origin: 'iara', correlationId: ctx.correlationId ?? null, error: error instanceof Error ? error.message : 'erro' } }).eq('id', planId).eq('project_id', ctx.projectId);
    return { ok: false as const, error: error instanceof Error ? error.message : 'Falha ao analisar a planta.' };
  }

  const geometry = buildFloorPlanGeometry(analysis);
  const modules = analysis.modules ?? [];
  const analysisId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { error: analysisError } = await supabase.from('project_plan_analyses').insert({ id: analysisId, project_plan_id: planId, project_id: ctx.projectId, status: 'completed', provider: 'marcenapp-ai', model: 'configured-ai-text', result: { ...analysis, geometry, modules, sourceReferences: references.length }, completed_at: new Date().toISOString() });
  if (analysisError) return { ok: false as const, error: analysisError.message };

  const environments = analysis.environments ?? [];
  if (environments.length) {
    const rows = environments.map((environment, index) => ({ id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`, project_plan_id: planId, analysis_id: analysisId, project_id: ctx.projectId!, name: String(environment.name || `Ambiente ${index + 1}`), type: environment.type ? String(environment.type) : null, position: Number.isFinite(Number(environment.position)) ? Number(environment.position) : index, confidence: clampConfidence(environment.confidence), status: 'suggested', metadata: { origin: 'iara', source: 'floor_plan_analysis', referenceCount: references.length } }));
    const { error } = await supabase.from('project_plan_environment_suggestions').insert(rows);
    if (error) return { ok: false as const, error: error.message };
  }

  await supabase.from('project_plans').update({ status: 'analyzed', metadata: { origin: 'iara', correlationId: ctx.correlationId ?? null, analysisId, environmentCount: environments.length, moduleCount: modules.length, referenceCount: references.length, analysis, geometry, modules } }).eq('id', planId).eq('project_id', ctx.projectId);

  const environmentSummary = JSON.stringify({ project: (project as { nome?: string | null; name?: string | null }).nome || (project as { name?: string | null }).name || 'Projeto', geometry, dimensions: analysis.dimensions ?? {}, walls: analysis.walls ?? [], openings: analysis.openings ?? [], environments, modules, notes: analysis.notes ?? [] });
  const idempotencyKey = ctx.correlationId || `${planId}-${Date.now()}`;
  const studioCommandId = useStudioStore.getState().enqueueCommand({ prompt: `MARCENAPP IARA OS: gerar perspectiva/elevação fiel à planta baixa. ${args.prompt}. Preserve a geometria, proporções, paredes e aberturas identificadas. Use as fotos do mesmo projeto apenas para complementar aparência e elementos fixos. Use as referências humanas das paredes (direita, esquerda, frente, trás e fundo) conforme a análise; não substitua essas referências por norte/sul/leste/oeste na interpretação do pedido. Contexto espacial: ${environmentSummary}`, images: references.map((reference) => ({ mimeType: reference.mimeType, data: reference.data })), decor: ctx.decorStyle || 'Limpo', idempotencyKey, metadata: { origin: 'iara', originalPrompt: args.prompt, targetModule: 'studio', planId, referenceCount: references.length, moduleCount: modules.length } });
  useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: args.prompt, estilo: ctx.decorStyle || 'Limpo', studioCommandId, userId: ctx.userId, projectId: ctx.projectId, ...(ctx.environmentId ? { environmentId: ctx.environmentId } : {}), ...(ctx.versionId ? { versionId: ctx.versionId } : {}), ...(ctx.correlationId ? { correlationId: ctx.correlationId } : {}), ...(typeof ctx.generation === 'number' ? { generation: ctx.generation } : {}), planId } });

  return { ok: true as const, data: { planId, analysisId, studioCommandId, status: 'queued', environmentCount: environments.length, moduleCount: modules.length, geometry, modules } };
}
