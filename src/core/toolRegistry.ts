// IARA OS v1 — Tool Registry (client-side executors)
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { callAIText } from '@/services/ai';
import { calculatePricing } from '@/core/pricing';

export type ToolResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };
export interface ToolDefinition<TArgs> { name: string; description: string; version: string; inputSchema: z.ZodType<TArgs>; execute: (args: TArgs, ctx: ExecutionContext) => Promise<ToolResult>; }
export interface ExecutionContext { userId: string; decorStyle?: string; lastImageBase?: string; lastImageMask?: string; }
type ClienteArgs = { nome: string; email?: string; telefone?: string };
type ProjetoArgs = { nome: string; clienteNome?: string; width: number; height: number; depth: number; tipo?: string; confirmado: true };
type RenderArgs = { prompt: string; estilo?: string };
type BudgetArgs = { observacoes?: string };
type ContractArgs = { clienteNome: string; valor?: number; prazoDias?: number; clausulasExtras?: string[] };
type AnyTool = ToolDefinition<ClienteArgs> | ToolDefinition<ProjetoArgs> | ToolDefinition<RenderArgs> | ToolDefinition<BudgetArgs> | ToolDefinition<ContractArgs>;

const createCliente: ToolDefinition<ClienteArgs> = {
  name: 'createCliente', description: 'Cria um novo cliente', version: '1.0.0',
  inputSchema: z.object({ nome: z.string().min(1), email: z.string().email().optional().or(z.literal('')), telefone: z.string().optional() }),
  async execute(args, ctx) { const { data, error } = await supabase.from('clientes').insert({ user_id: ctx.userId, nome: args.nome, email: args.email || null, telefone: args.telefone || null }).select('id, nome').single(); if (error) return { ok: false, error: error.message }; return { ok: true, data }; },
};

const createProjeto: ToolDefinition<ProjetoArgs> = {
  name: 'createProjeto', description: 'Cria projeto somente após confirmação explícita das três dimensões', version: '1.1.0',
  inputSchema: z.object({ nome: z.string().min(1), clienteNome: z.string().optional(), width: z.number().positive(), height: z.number().positive(), depth: z.number().positive(), tipo: z.string().optional(), confirmado: z.literal(true) }),
  async execute(args, ctx) {
    let clienteId: string | null = null;
    if (args.clienteNome) { const { data: cli } = await supabase.from('clientes').select('id').eq('user_id', ctx.userId).ilike('nome', args.clienteNome).maybeSingle(); clienteId = cli?.id ?? null; }
    const { data, error } = await supabase.from('projects').insert({ user_id: ctx.userId, nome: args.nome, cliente_id: clienteId, width: args.width, height: args.height, depth: args.depth }).select('id, nome, width, height, depth').single();
    if (error) return { ok: false, error: error.message }; return { ok: true, data };
  },
};

const gerarRender: ToolDefinition<RenderArgs> = {
  name: 'gerarRender', description: 'Enfileira render no Estúdio via Command Bus', version: '1.0.0', inputSchema: z.object({ prompt: z.string().min(1), estilo: z.string().optional() }),
  async execute(args, ctx) {
    const estilo = args.estilo || ctx.decorStyle || 'Limpo';
    if (!ctx.lastImageBase || !ctx.lastImageMask) return { ok: false, error: 'Nenhuma imagem base foi anexada. Envie uma foto do ambiente com máscara antes de renderizar.' };
    const id = useStudioStore.getState().enqueueCommand({ prompt: `MARCENAPP IARA OS: móvel estilo ${estilo}. ${args.prompt}`, images: [{ mimeType: 'image/jpeg', data: ctx.lastImageBase }, { mimeType: 'image/png', data: ctx.lastImageMask }], decor: estilo, metadata: { origin: 'iara', originalPrompt: args.prompt, targetModule: 'studio' } });
    useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: args.prompt, estilo, studioCommandId: id } });
    return { ok: true, data: { studioCommandId: id, status: 'queued' } };
  },
};

const calcularOrcamento: ToolDefinition<BudgetArgs> = {
  name: 'calcularOrcamento', description: 'Calcula orçamento do projeto atual usando o mesmo motor do módulo financeiro', version: '2.0.0', inputSchema: z.object({ observacoes: z.string().optional() }),
  async execute(_args, ctx) {
    const { data: proj, error } = await supabase.from('projects').select('*').eq('user_id', ctx.userId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !proj) return { ok: false, error: 'Nenhum projeto encontrado. Crie um projeto primeiro.' };
    const result = calculatePricing({ width: Number(proj.width), height: Number(proj.height), depth: Number(proj.depth), modules: proj.modules, drawers: proj.drawers, doors: proj.doors, internalMaterial: proj.internal_material, externalMaterial: proj.external_material, backMaterial: proj.back_material, handleType: proj.handle_type, profitMargin: proj.profit_margin, laborRate: proj.labor_rate });
    return { ok: true, data: { projetoId: proj.id, nome: proj.nome, total: result.total, materiais: result.materials, maoDeObra: result.labor, ferragens: result.hardware, desperdicio: result.waste, lucro: result.profit, chapas: { internas: result.sheetsInternal, externas: result.sheetsExternal, fundos: result.sheetsBack }, pecas: result.parts } };
  },
};

const gerarContrato: ToolDefinition<ContractArgs> = {
  name: 'gerarContrato', description: 'Gera documentação contratual assistida por IA; não constitui aconselhamento jurídico', version: '1.1.0', inputSchema: z.object({ clienteNome: z.string().min(1), valor: z.number().optional(), prazoDias: z.number().optional(), clausulasExtras: z.array(z.string()).optional() }),
  async execute(args, ctx) {
    const clausulas: string[] = [];
    for (const desc of args.clausulasExtras ?? []) {
      try { const text = await callAIText(`Prepare uma cláusula contratual curta e objetiva para um contrato de marcenaria sobre: "${desc}". Use português formal. Não apresente aconselhamento jurídico e não afirme que o texto substitui revisão profissional.`); if (text) { clausulas.push(text); const { error } = await supabase.from('custom_clauses').insert({ user_id: ctx.userId, clause_text: text, prompt: desc }); if (error) console.warn('Falha ao persistir cláusula:', error.message); } }
      catch (e) { console.warn('Falha ao gerar cláusula:', desc, e); }
    }
    return { ok: true, data: { cliente: args.clienteNome, valor: args.valor ?? null, prazoDias: args.prazoDias ?? 45, clausulasGeradas: clausulas.length, clausulas } };
  },
};

const TOOLS: Record<string, AnyTool> = { createCliente, createProjeto, gerarRender, calcularOrcamento, gerarContrato };
export function getTool(name: string): AnyTool | undefined { return TOOLS[name]; }
export function listTools(): AnyTool[] { return Object.values(TOOLS); }
export async function executeToolCall(name: string, args: unknown, ctx: ExecutionContext): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) return { ok: false, error: `Ferramenta desconhecida: ${name}` };
  const parsed = tool.inputSchema.safeParse(args);
  if (!parsed.success) return { ok: false, error: `Argumentos inválidos para ${name}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}` };
  try { return await (tool.execute as (validatedArgs: unknown, context: ExecutionContext) => Promise<ToolResult>)(parsed.data, ctx); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }; }
}
