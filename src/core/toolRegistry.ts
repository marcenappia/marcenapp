import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { callAIContractClause, callAIText } from '@/services/ai';
import { analyzeFloorPlanAndQueueRender } from '@/modules/iara/services/planService';
import { attachIaraEnvironmentPhoto } from '@/modules/iara/services/photoDestination';

const db = supabase as unknown as SupabaseClient;
export type ToolResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };
export interface ToolDefinition<TArgs extends object, TResult = unknown> { name: string; description: string; version: string; inputSchema: z.ZodTypeAny; execute: (args: TArgs, ctx: ExecutionContext) => Promise<ToolResult<TResult>>; }
export type VisualReference = { data: string; mimeType?: string; kind?: 'environment' | 'reference' | 'sketch' | 'plan'; label?: string };
export interface ExecutionContext { userId: string; projectId?: string; environmentId?: string; versionId?: string; correlationId?: string; generation?: number; decorStyle?: string; lastImageBase?: string; lastImageMask?: string; referenceImages?: VisualReference[]; }

type CreateClienteArgs = { nome: string; email?: string; telefone?: string };
type CreateProjetoArgs = { nome: string; clienteNome?: string; width: number; height: number; depth: number; doors?: number; drawers?: number; modules?: number; tipo?: string; confirmado: true };
type GerarRenderArgs = { prompt: string; estilo?: string };
type AnalisarPlantaArgs = { prompt: string };
type CalcularOrcamentoArgs = { projetoId?: string };
type OperationalArgs = { projetoId?: string };
type GerarContratoArgs = { clienteNome: string; valor?: number; prazoDias?: number; clausulasExtras?: string[] };
type ClienteData = { id: string; nome: string };
type ProjetoData = { id: string; nome: string; width: number; height: number; depth: number; doors?: number; drawers?: number; modules?: number; environmentId?: string; studioCommandId?: string; renderStatus?: 'queued' | 'failed'; renderError?: string; };
type RenderData = { studioCommandId?: string; status: string; imageUrl?: string };
type PlanData = { planId: string; analysisId: string; studioCommandId: string; status: string; environmentCount: number };
type OrcamentoData = { projetoId: string; nome: string; total: number; materiais: number; ferragens: number; maoDeObra: number; outros: number; precoVenda: number; lucro: number; margemPct: number; isEstimate: false };
type OperationalData = { projetoId: string; alertas: unknown[]; dados: Record<string, unknown> };
type ContratoData = { cliente: string; valor: number | null; prazoDias: number | null; clausulasGeradas: number; clausulas: string[] };

async function recentProjectImages(ctx: ExecutionContext): Promise<VisualReference[]> {
  if (!ctx.projectId) return [];
  try {
    const { data } = await db.from('chat_messages')
      .select('image_url,metadata,created_at')
      .eq('user_id', ctx.userId)
      .eq('project_id', ctx.projectId)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8);
    const references: VisualReference[] = [];
    for (const row of data ?? []) {
      const url = typeof row.image_url === 'string' ? row.image_url : '';
      if (url.startsWith('blob:')) continue;
      if (url.startsWith('data:image/')) {
        const payload = url.split(',')[1] ?? '';
        if (payload) references.push({ data: payload, mimeType: url.startsWith('data:image/png') ? 'image/png' : url.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', kind: 'environment' });
        continue;
      }
      const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
      const storagePath = typeof metadata.storagePath === 'string' ? metadata.storagePath : '';
      if (!storagePath) continue;
      const { data: signed } = await db.storage.from('obras').createSignedUrl(storagePath, 60 * 10);
      if (!signed?.signedUrl) continue;
      const response = await fetch(signed.signedUrl);
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
      references.push({ data: btoa(binary), mimeType: storagePath.endsWith('.png') ? 'image/png' : storagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg', kind: 'environment' });
    }
    return references;
  } catch {
    return [];
  }
}

const createCliente: ToolDefinition<CreateClienteArgs, ClienteData> = { name: 'createCliente', description: 'Cria um novo cliente no tenant atual', version: '1.0.0', inputSchema: z.object({ nome: z.string().min(1), email: z.string().email().optional().or(z.literal('')), telefone: z.string().optional() }), async execute(args, ctx) { const { data, error } = await db.from('clientes').insert({ user_id: ctx.userId, nome: args.nome, email: args.email || null, telefone: args.telefone || null }).select('id, nome').single(); if (error) return { ok: false, error: error.message }; return { ok: true, data: data as ClienteData }; } };
async function inferProjectStructureFromVisual(args: CreateProjetoArgs, ctx: ExecutionContext): Promise<Pick<CreateProjetoArgs, 'doors' | 'drawers' | 'modules'>> {
  if (!ctx.projectId && !ctx.lastImageBase) return {};
  let image = ctx.lastImageBase ?? '';
  if (!image && ctx.projectId) {
    try {
      const historical = await recentProjectImages(ctx);
      image = historical[0]?.data ?? '';
    } catch {
      return {};
    }
  }
  if (!image) return {};
  const data = image.includes(',') ? image.split(',')[1] : image;
  try {
    const analysis = await callAIText([
      'Você é o módulo de engenharia de móveis do Marcenapp.',
      'Analise a foto enviada como referência do móvel/ambiente e extraia somente características estruturais VISÍVEIS do móvel que o usuário está pedindo para criar.',
      'Não invente portas, gavetas ou módulos que não estejam claramente visíveis ou explicitamente pedidos.',
      'Se uma quantidade não puder ser determinada com segurança, omita o campo.',
      'moduleCount = número de divisões/módulos verticais claramente identificáveis.',
      'doorCount = número de portas claramente identificáveis.',
      'drawerCount = número de gavetas claramente identificáveis.',
      'Retorne SOMENTE JSON: {"moduleCount":number|null,"doorCount":number|null,"drawerCount":number|null,"confidence":number}.',
      'Pedido do usuário: ' + JSON.stringify(args),
    ].join(' '), [{ mimeType: image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg', data }], true);
    const clean = analysis.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
    const parsed = JSON.parse(clean) as { moduleCount?: unknown; doorCount?: unknown; drawerCount?: unknown; confidence?: unknown };
    const confidence = Number(parsed.confidence);
    if (!Number.isFinite(confidence) || confidence < 0.7) return {};
    const result: Pick<CreateProjetoArgs, 'doors' | 'drawers' | 'modules'> = {};
    if (args.modules == null && Number.isInteger(parsed.moduleCount) && Number(parsed.moduleCount) > 0) result.modules = Number(parsed.moduleCount);
    if (args.doors == null && Number.isInteger(parsed.doorCount) && Number(parsed.doorCount) > 0) result.doors = Number(parsed.doorCount);
    if (args.drawers == null && Number.isInteger(parsed.drawerCount) && Number(parsed.drawerCount) >= 0) result.drawers = Number(parsed.drawerCount);
    return result;
  } catch {
    return {};
  }
}

const createProjeto: ToolDefinition<CreateProjetoArgs, ProjetoData> = { name: 'createProjeto', description: 'Cria um projeto com dimensões confirmadas e, quando houver foto de referência, vincula o ambiente e gera a visualização inicial a partir dessa foto.', version: '1.3.0', inputSchema: z.object({ nome: z.string().min(1), clienteNome: z.string().optional(), width: z.number().positive(), height: z.number().positive(), depth: z.number().positive(), doors: z.number().int().positive().optional(), drawers: z.number().int().nonnegative().optional(), modules: z.number().int().positive().optional(), tipo: z.string().optional(), confirmado: z.literal(true) }), async execute(args, ctx) {
  let clienteId: string | null = null;
  if (args.clienteNome) {
    const { data: cli } = await db.from('clientes').select('id').eq('user_id', ctx.userId).ilike('nome', args.clienteNome).maybeSingle();
    clienteId = (cli as { id: string } | null)?.id ?? null;
  }
  const inferred = await inferProjectStructureFromVisual(args, ctx);
  const finalArgs = { ...args, ...inferred };
  const { data, error } = await db.from('projects').insert({
    user_id: ctx.userId,
    nome: finalArgs.nome,
    cliente_id: clienteId,
    width: finalArgs.width,
    height: finalArgs.height,
    depth: finalArgs.depth,
    modules: finalArgs.modules ?? 1,
    drawers: finalArgs.drawers ?? 0,
    doors: finalArgs.doors ?? 0,
  }).select('id, nome, width, height, depth, doors, drawers, modules').single();
  if (error) return { ok: false, error: error.message };
  const project = data as ProjetoData;
  let environmentId: string | undefined;
  let studioCommandId: string | undefined;
  let renderStatus: ProjetoData['renderStatus'];
  let renderError: string | undefined;

  if (ctx.lastImageBase) {
    try {
      const dataUrl = `data:image/jpeg;base64,${ctx.lastImageBase}`;
      const destination = await attachIaraEnvironmentPhoto({ userId: ctx.userId, projectId: project.id, dataUrl, correlationId: ctx.correlationId, generation: ctx.generation });
      environmentId = destination.environmentId;

      if (ctx.correlationId && typeof ctx.generation === 'number') {
        const prompt = [
          'Crie o móvel solicitado dentro do ambiente da foto de referência.',
          `Dimensões confirmadas do móvel: largura ${project.width} mm, altura ${project.height} mm, profundidade ${project.depth} mm.`,
          `Estrutura confirmada: ${project.modules ?? 1} módulo(s), ${project.doors ?? 0} porta(s), ${project.drawers ?? 0} gaveta(s).`,
          'Use a foto como referência principal do ambiente, preserve paredes, vãos, perspectiva e elementos fixos, e não entregue um ambiente vazio.',
        ].join(' ');

        // Reuse the exact same Yara render tool used by an explicit "faça o render"
        // request. The only difference is that the newly created project/environment
        // is injected into the execution context, so the Studio pipeline can persist
        // the render against the project instead of merely creating an empty project.
        const renderResult = await gerarRender.execute(
          { prompt, estilo: ctx.decorStyle },
          { ...ctx, projectId: project.id, environmentId },
        );
        if (renderResult.ok) {
          studioCommandId = renderResult.data.studioCommandId;
        } else {
          renderStatus = 'failed';
          renderError = 'error' in renderResult ? renderResult.error : 'Falha ao enfileirar a visualização inicial.';
        }
      }
    } catch (e) {
      return { ok: false, error: `Projeto criado, mas não foi possível vincular a foto e gerar a visualização inicial: ${e instanceof Error ? e.message : 'erro desconhecido'}` };
    }
  }

  return { ok: true, data: { ...project, environmentId, studioCommandId, ...(renderStatus ? { renderStatus } : {}), ...(renderError ? { renderError } : {}) } };
}};

const gerarRender: ToolDefinition<GerarRenderArgs, RenderData> = { name: 'gerarRender', description: 'Gera visual no Estúdio somente a partir de uma referência visual enviada ou do ambiente atual do projeto. Geração somente por texto está desativada por enquanto.', version: '1.8.0', inputSchema: z.object({ prompt: z.string().min(1), estilo: z.string().optional() }), async execute(args, ctx) { if (!ctx.correlationId || typeof ctx.generation !== 'number') return { ok: false, error: 'Identidade de execução incompleta para gerar o render.' }; const estilo = args.estilo || ctx.decorStyle || 'Limpo'; const recentImages = await recentProjectImages(ctx); const referenceImages = [...(ctx.referenceImages ?? []), ...recentImages].filter((image, index, all) => image.data && all.findIndex((item) => item.data === image.data) === index).slice(0, 8); if (ctx.lastImageBase && !referenceImages.some((image) => image.data === ctx.lastImageBase)) referenceImages.unshift({ data: ctx.lastImageBase, mimeType: 'image/jpeg', kind: 'environment', label: 'imagem principal' }); const images: VisualReference[] = [...referenceImages]; if (ctx.lastImageMask) images.push({ data: ctx.lastImageMask, mimeType: 'image/png', kind: 'sketch', label: 'máscara' }); if (!images.length) return { ok: false, error: 'Para gerar um render, envie uma imagem de referência ou selecione um ambiente com imagem no projeto.' }; const enrichedPrompt = args.prompt; const idempotencyKey = ctx.correlationId; const studioImages = images.slice(0, 8).map((image) => ({ mimeType: image.mimeType || 'image/jpeg', data: image.data })); console.info('[GENERAR_RENDER]', JSON.stringify({ status: 'queued', correlationId: ctx.correlationId, generation: ctx.generation, referenceCount: studioImages.length })); const id = useStudioStore.getState().enqueueCommand({ prompt: `MARCENAPP IARA OS: móvel estilo ${estilo}. ${enrichedPrompt}`, images: studioImages.length ? studioImages : undefined, decor: estilo, idempotencyKey, metadata: { origin: 'iara', originalPrompt: args.prompt, targetModule: 'studio', referenceCount: studioImages.length } }); useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', idempotencyKey, payload: { prompt: enrichedPrompt, estilo, studioCommandId: id, idempotencyKey, userId: ctx.userId, ...(ctx.projectId ? { projectId: ctx.projectId } : {}), ...(ctx.environmentId ? { environmentId: ctx.environmentId } : {}), ...(ctx.versionId ? { versionId: ctx.versionId } : {}), correlationId: ctx.correlationId, generation: ctx.generation } }); return { ok: true, data: { studioCommandId: id, status: 'queued' } }; } };
const analisarPlanta: ToolDefinition<AnalisarPlantaArgs, PlanData> = { name: 'analisarPlanta', description: 'Analisa a planta baixa enviada à IARA, registra a análise e enfileira a perspectiva/elevação no mesmo pipeline de render do Estúdio.', version: '1.0.0', inputSchema: z.object({ prompt: z.string().min(1) }), async execute(args, ctx) { if (!ctx.lastImageBase) return { ok: false, error: 'Envie a planta baixa como imagem para eu analisar e gerar a perspectiva.' }; return analyzeFloorPlanAndQueueRender({ prompt: args.prompt, planBase64: ctx.lastImageBase }, ctx); } };
const calcularOrcamento: ToolDefinition<CalcularOrcamentoArgs, OrcamentoData> = { name: 'calcularOrcamento', description: 'Consulta um orçamento real salvo para o projeto; nunca inventa preço de MDF, ferragens ou mão de obra', version: '3.0.0', inputSchema: z.object({ projetoId: z.string().uuid().optional() }), async execute(args, ctx) { const projectId = args.projetoId || ctx.projectId; const query = db.from('project_cost_snapshots').select('project_id,sale_price,material_cost,hardware_cost,labor_cost,other_cost').eq('user_id', ctx.userId); const { data: row, error } = projectId ? await query.eq('project_id', projectId).maybeSingle() : await query.order('updated_at', { ascending: false }).limit(1).maybeSingle(); if (error) return { ok: false, error: error.message }; if (!row) return { ok: false, error: 'Não há orçamento real salvo para este projeto. Informe os custos reais e o preço de venda no módulo Orçamento.' }; const r = row as { project_id: string; sale_price: number | null; material_cost: number | null; hardware_cost: number | null; labor_cost: number | null; other_cost: number | null }; const missing = [r.material_cost == null ? 'materiais' : null, r.hardware_cost == null ? 'ferragens' : null, r.labor_cost == null ? 'mão de obra' : null, r.sale_price == null ? 'preço de venda' : null].filter(Boolean); if (missing.length) return { ok: false, error: `Dados insuficientes para orçamento real: faltam ${missing.join(', ')}.` }; const { data: project } = await db.from('projects').select('id,nome,name').eq('user_id', ctx.userId).eq('id', r.project_id).maybeSingle(); const materiais = Number((r.material_cost ?? 0).toFixed(2)); const ferragens = Number((r.hardware_cost ?? 0).toFixed(2)); const maoDeObra = Number((r.labor_cost ?? 0).toFixed(2)); const outros = Number((r.other_cost ?? 0).toFixed(2)); const precoVenda = Number((r.sale_price ?? 0).toFixed(2)); const custoTotal = Number((materiais + ferragens + maoDeObra + outros).toFixed(2)); const lucro = Number((precoVenda - custoTotal).toFixed(2)); const margemPct = precoVenda > 0 ? Number(((lucro / precoVenda) * 100).toFixed(2)) : 0; const projectRow = project as { nome?: string | null; name?: string | null } | null; return { ok: true, data: { projetoId: r.project_id, nome: projectRow?.nome || projectRow?.name || 'Projeto', total: precoVenda, materiais, ferragens, maoDeObra, outros, precoVenda, lucro, margemPct, isEstimate: false } }; } };
const operationalIntelligence: ToolDefinition<OperationalArgs, OperationalData> = { name: 'operationalIntelligence', description: 'Analisa um projeto com custos, ferragens, estoque, produção, venda, recebimentos e regras reais; nunca preenche lacunas com números', version: '2.0.0', inputSchema: z.object({ projetoId: z.string().uuid().optional() }), async execute(args, ctx) { let projectId = args.projetoId || ctx.projectId; if (!projectId) { const { data: p } = await db.from('projects').select('id').eq('user_id', ctx.userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(); projectId = (p as { id: string } | null)?.id; } if (!projectId) return { ok: false, error: 'Nenhum projeto encontrado.' }; const { error } = await db.rpc('refresh_project_operational_alerts', { p_project_id: projectId }); if (error) return { ok: false, error: error.message }; const [{ data: project }, { data: alerts }, { data: requirements }, { data: stages }, { data: sale }, { data: receivables }] = await Promise.all([db.from('projects').select('id,nome,name,doors,drawers,modules').eq('user_id',ctx.userId).eq('id',projectId).maybeSingle(), db.from('operational_alerts').select('alert_type,severity,message,evidence,suggested_action').eq('user_id',ctx.userId).eq('entity_id',projectId).eq('status','open').order('created_at',{ascending:false}), db.from('project_hardware_requirements').select('hardware_id,quantity_required,rule_key').eq('user_id',ctx.userId).eq('project_id',projectId), db.from('project_production_stages').select('stage_key,stage_name,status,responsible,due_at,blocked_reason').eq('user_id',ctx.userId).eq('project_id',projectId), db.from('project_sales').select('sale_price,status').eq('user_id',ctx.userId).eq('project_id',projectId).maybeSingle(), db.from('project_receivables').select('installment_number,amount,due_at,received_at,status').eq('user_id',ctx.userId).eq('project_id',projectId)]); return { ok: true, data: { projetoId: projectId, alertas: alerts ?? [], dados: { projeto: project, ferragens: requirements ?? [], producao: stages ?? [], venda: sale, recebimentos: receivables ?? [] } } }; } };
const gerarContrato: ToolDefinition<GerarContratoArgs, ContratoData> = { name: 'gerarContrato', description: 'Gera documentação contratual assistida por IA; não constitui aconselhamento jurídico', version: '1.4.0', inputSchema: z.object({ clienteNome: z.string().min(1), valor: z.number().optional(), prazoDias: z.number().optional(), clausulasExtras: z.array(z.string()).optional() }), async execute(args) { const clausulas: string[] = []; for (const desc of args.clausulasExtras ?? []) { try { const result = await callAIContractClause(desc); if (!result.text) return { ok: false, error: `A IA não retornou uma cláusula para: ${desc}` }; clausulas.push(result.text); } catch (e) { return { ok: false, error: `Falha ao gerar cláusula \"${desc}\": ${e instanceof Error ? e.message : 'erro desconhecido'}` }; } } return { ok: true, data: { cliente: args.clienteNome, valor: args.valor ?? null, prazoDias: args.prazoDias ?? null, clausulasGeradas: clausulas.length, clausulas } }; } };
const TOOLS = { createCliente, createProjeto, gerarRender, analisarPlanta, calcularOrcamento, operationalIntelligence, gerarContrato };
type ToolName = keyof typeof TOOLS;
type ErasedTool = { inputSchema: z.ZodTypeAny; execute: (args: Record<string, unknown>, ctx: ExecutionContext) => Promise<ToolResult<unknown>> };
export function getTool(name: string): ToolDefinition<object, unknown> | undefined { return TOOLS[name as ToolName] as unknown as ToolDefinition<object, unknown> | undefined; }
export function listTools(): ToolDefinition<object, unknown>[] { return Object.values(TOOLS) as unknown as ToolDefinition<object, unknown>[]; }
export async function executeToolCall(name: string, args: unknown, ctx: ExecutionContext): Promise<ToolResult<unknown>> { const tool = getTool(name); if (!tool) return { ok: false, error: `Ferramenta desconhecida: ${name}` }; const parsed = tool.inputSchema.safeParse(args); if (!parsed.success) return { ok: false, error: `Argumentos inválidos para ${name}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}` }; try { return await (tool as unknown as ErasedTool).execute(parsed.data as Record<string, unknown>, ctx); } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }; } }
