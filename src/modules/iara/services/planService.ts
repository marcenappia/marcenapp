import { supabase } from '@/integrations/supabase/client';
import { callAIText } from '@/services/ai';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import type { ExecutionContext } from '@/core/toolRegistry';

interface PlanAnalysis {
  environments?: Array<{ name?: string; type?: string; confidence?: number; position?: number }>;
  dimensions?: { width?: number; depth?: number; ceilingHeight?: number };
  walls?: Array<{ start?: [number, number]; end?: [number, number]; length?: number }>;
  openings?: Array<{ type?: string; position?: string; width?: number; height?: number }>;
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

export async function analyzeFloorPlanAndQueueRender(args: { prompt: string; planBase64: string }, ctx: ExecutionContext) {
  if (!ctx.projectId) return { ok: false as const, error: 'Selecione um projeto antes de enviar a planta para a IARA.' };
  if (!args.planBase64) return { ok: false as const, error: 'Nenhuma planta foi anexada.' };

  const planId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { data: project, error: projectError } = await supabase.from('projects').select('id,nome,name').eq('id', ctx.projectId).eq('user_id', ctx.userId).maybeSingle();
  if (projectError) return { ok: false as const, error: projectError.message };
  if (!project) return { ok: false as const, error: 'Projeto não encontrado ou sem acesso.' };

  const { error: planError } = await supabase.from('project_plans').insert({
    id: planId,
    project_id: ctx.projectId,
    name: `Planta analisada pela IARA ${new Date().toLocaleString('pt-BR')}`,
    status: 'analyzing',
    metadata: { origin: 'iara', correlationId: ctx.correlationId ?? null },
  });
  if (planError) return { ok: false as const, error: planError.message };

  const analysisPrompt = [
    'Analise esta planta baixa como uma planta de ambiente para móveis planejados.',
    'Não invente medidas que não estejam indicadas. Diferencie medido, estimado e desconhecido.',
    'Identifique ambientes, paredes, portas, janelas e dimensões visíveis.',
    'Retorne SOMENTE JSON válido no formato:',
    '{"environments":[{"name":"Cozinha","type":"cozinha","confidence":0.9,"position":1}],"dimensions":{"width":0,"depth":0,"ceilingHeight":0},"walls":[{"start":[0,0],"end":[1,0],"length":1}],"openings":[{"type":"door","position":"north","width":0,"height":0}],"notes":[]}',
  ].join(' ');

  let analysis: PlanAnalysis;
  try {
    analysis = parseJson(await callAIText(analysisPrompt, [{ mimeType: 'image/png', data: args.planBase64 }], true));
  } catch (error) {
    await supabase.from('project_plans').update({ status: 'failed', metadata: { origin: 'iara', correlationId: ctx.correlationId ?? null, error: error instanceof Error ? error.message : 'erro' } }).eq('id', planId).eq('project_id', ctx.projectId);
    return { ok: false as const, error: error instanceof Error ? error.message : 'Falha ao analisar a planta.' };
  }

  const analysisId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { error: analysisError } = await supabase.from('project_plan_analyses').insert({
    id: analysisId,
    project_plan_id: planId,
    project_id: ctx.projectId,
    status: 'completed',
    provider: 'marcenapp-ai',
    model: 'configured-ai-text',
    result: analysis,
    completed_at: new Date().toISOString(),
  });
  if (analysisError) return { ok: false as const, error: analysisError.message };

  const environments = analysis.environments ?? [];
  if (environments.length) {
    const rows = environments.map((environment, index) => ({
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      project_plan_id: planId,
      analysis_id: analysisId,
      project_id: ctx.projectId!,
      name: String(environment.name || `Ambiente ${index + 1}`),
      type: environment.type ? String(environment.type) : null,
      position: Number.isFinite(Number(environment.position)) ? Number(environment.position) : index,
      confidence: clampConfidence(environment.confidence),
      status: 'suggested',
      metadata: { origin: 'iara', source: 'floor_plan_analysis' },
    }));
    const { error } = await supabase.from('project_plan_environment_suggestions').insert(rows);
    if (error) return { ok: false as const, error: error.message };
  }

  await supabase.from('project_plans').update({ status: 'analyzed', metadata: { origin: 'iara', correlationId: ctx.correlationId ?? null, analysisId, environmentCount: environments.length, analysis } }).eq('id', planId).eq('project_id', ctx.projectId);

  const environmentSummary = JSON.stringify({
    project: (project as { nome?: string | null; name?: string | null }).nome || (project as { name?: string | null }).name || 'Projeto',
    dimensions: analysis.dimensions ?? {},
    walls: analysis.walls ?? [],
    openings: analysis.openings ?? [],
    environments,
    notes: analysis.notes ?? [],
  });
  const idempotencyKey = ctx.correlationId || `${planId}-${Date.now()}`;
  const studioCommandId = useStudioStore.getState().enqueueCommand({
    prompt: `MARCENAPP IARA OS: gerar perspectiva/elevação fiel à planta baixa. ${args.prompt}. Preserve a geometria, proporções, paredes e aberturas identificadas. Contexto espacial: ${environmentSummary}`,
    images: [{ mimeType: 'image/png', data: args.planBase64 }],
    decor: ctx.decorStyle || 'Limpo',
    idempotencyKey,
    metadata: { origin: 'iara', originalPrompt: args.prompt, targetModule: 'studio', planId, analysisId },
  });
  useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: args.prompt, estilo: ctx.decorStyle || 'Limpo', studioCommandId, userId: ctx.userId, projectId: ctx.projectId, ...(ctx.environmentId ? { environmentId: ctx.environmentId } : {}), ...(ctx.versionId ? { versionId: ctx.versionId } : {}), ...(ctx.correlationId ? { correlationId: ctx.correlationId } : {}), ...(typeof ctx.generation === 'number' ? { generation: ctx.generation } : {}), planId, analysisId } });

  return { ok: true as const, data: { planId, analysisId, studioCommandId, status: 'queued', environmentCount: environments.length } };
}
