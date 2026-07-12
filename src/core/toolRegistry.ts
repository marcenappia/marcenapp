// IARA OS v1 — Tool Registry (client-side executors)
// Contratos estáveis. Toda ferramenta expõe: nome, descrição, schema Zod, executor.
// A IA (ai-orchestrator) escolhe QUAL ferramenta chamar; este registry EXECUTA.
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { callAIText } from '@/services/ai';

export type ToolResult<T = any> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ToolDefinition<TArgs = any, TResult = any> {
  name: string;
  description: string;
  version: string;
  inputSchema: z.ZodType<TArgs>;
  execute: (args: TArgs, ctx: ExecutionContext) => Promise<ToolResult<TResult>>;
}

export interface ExecutionContext {
  userId: string;
  decorStyle?: string;
  lastImageBase?: string;
  lastImageMask?: string;
}

// ============================================================
// Ferramentas
// ============================================================

const createCliente: ToolDefinition = {
  name: 'createCliente',
  description: 'Cria um novo cliente',
  version: '1.0.0',
  inputSchema: z.object({
    nome: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    telefone: z.string().optional(),
  }),
  async execute(args, ctx) {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        user_id: ctx.userId,
        nome: args.nome,
        email: args.email || null,
        telefone: args.telefone || null,
      })
      .select('id, nome')
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  },
};

const createProjeto: ToolDefinition = {
  name: 'createProjeto',
  description: 'Cria ou atualiza projeto de marcenaria',
  version: '1.0.0',
  inputSchema: z.object({
    nome: z.string().min(1),
    clienteNome: z.string().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    depth: z.number().positive().optional(),
    tipo: z.string().optional(),
  }),
  async execute(args, ctx) {
    // Resolve cliente (opcional) por nome
    let clienteId: string | null = null;
    if (args.clienteNome) {
      const { data: cli } = await supabase
        .from('clientes')
        .select('id')
        .eq('user_id', ctx.userId)
        .ilike('nome', args.clienteNome)
        .maybeSingle();
      clienteId = cli?.id ?? null;
    }

    const row = {
      user_id: ctx.userId,
      nome: args.nome,
      cliente_id: clienteId,
      width: args.width ?? 3.0,
      height: args.height ?? 2.6,
      depth: args.depth ?? 0.6,
    };
    const { data, error } = await supabase
      .from('projects')
      .insert(row)
      .select('id, nome, width, height, depth')
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  },
};

const gerarRender: ToolDefinition = {
  name: 'gerarRender',
  description: 'Enfileira render no Estúdio via Command Bus',
  version: '1.0.0',
  inputSchema: z.object({
    prompt: z.string().min(1),
    estilo: z.string().optional(),
  }),
  async execute(args, ctx) {
    const estilo = args.estilo || ctx.decorStyle || 'Limpo';

    if (!ctx.lastImageBase || !ctx.lastImageMask) {
      return {
        ok: false,
        error: 'Nenhuma imagem base foi anexada. Envie uma foto do ambiente com máscara antes de renderizar.',
      };
    }

    const id = useStudioStore.getState().enqueueCommand({
      prompt: `MARCENAPP IARA OS: móvel estilo ${estilo}. ${args.prompt}`,
      images: [
        { mimeType: 'image/jpeg', data: ctx.lastImageBase },
        { mimeType: 'image/png', data: ctx.lastImageMask },
      ],
      decor: estilo,
      metadata: { origin: 'iara', originalPrompt: args.prompt, targetModule: 'studio' },
    });

    useMarcenappOS.getState().dispatchCommand({
      source: 'iara',
      target: 'studio',
      action: 'GENERATE_VISUAL',
      payload: { prompt: args.prompt, estilo, studioCommandId: id },
    });

    return { ok: true, data: { studioCommandId: id, status: 'queued' } };
  },
};

const calcularOrcamento: ToolDefinition = {
  name: 'calcularOrcamento',
  description: 'Calcula orçamento estimado do projeto atual',
  version: '1.0.0',
  inputSchema: z.object({
    observacoes: z.string().optional(),
  }),
  async execute(_args, ctx) {
    // Pega último projeto do usuário
    const { data: proj, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !proj) return { ok: false, error: 'Nenhum projeto encontrado. Crie um projeto primeiro.' };

    // Fórmula equivalente à do useOrcamento
    const prices: Record<string, { price: number; area: number }> = {
      mdf15_white: { price: 260, area: 5.08 },
      mdf18_white: { price: 290, area: 5.08 },
    };
    const intMat = prices[proj.internal_material ?? 'mdf15_white'] || prices.mdf15_white;
    const extMat = prices[proj.external_material ?? 'mdf18_white'] || prices.mdf18_white;
    const frontalArea = Number(proj.height) * Number(proj.width);
    const sheetsInt = Math.ceil((frontalArea * 2.5 * 1.15) / intMat.area * 10) / 10;
    const sheetsExt = Math.ceil((frontalArea * 1.2 * 1.15) / extMat.area * 10) / 10;
    const costMat = sheetsInt * intMat.price + sheetsExt * extMat.price;
    const handleCost = (proj.handle_type ?? 'external') === 'external' ? ((proj.drawers ?? 4) + (proj.doors ?? 6)) * 15 : 0;
    const costHard = (proj.drawers ?? 4) * 28 + (proj.doors ?? 6) * 2 * 7.5 + handleCost + 200;
    const totalMat = costMat + costHard;
    const labor = totalMat * (Number(proj.labor_rate ?? 100) / 100);
    const subtotal = totalMat + labor + totalMat * 0.10;
    const total = subtotal * (1 + Number(proj.profit_margin ?? 35) / 100);

    return {
      ok: true,
      data: {
        projetoId: proj.id,
        nome: proj.nome,
        total: Number(total.toFixed(2)),
        materiais: Number(totalMat.toFixed(2)),
        maoDeObra: Number(labor.toFixed(2)),
      },
    };
  },
};

const gerarContrato: ToolDefinition = {
  name: 'gerarContrato',
  description: 'Gera contrato + cláusulas customizadas via IA',
  version: '1.0.0',
  inputSchema: z.object({
    clienteNome: z.string().min(1),
    valor: z.number().optional(),
    prazoDias: z.number().optional(),
    clausulasExtras: z.array(z.string()).optional(),
  }),
  async execute(args, ctx) {
    const clausulas: string[] = [];
    for (const desc of args.clausulasExtras ?? []) {
      try {
        const text = await callAIText(
          `Atue como Advogado especialista em contratos de marcenaria. Escreva uma cláusula curta e objetiva sobre: "${desc}". Português formal.`,
        );
        if (text) {
          clausulas.push(text);
          await supabase.from('custom_clauses').insert({
            user_id: ctx.userId,
            clause_text: text,
            prompt: desc,
          });
        }
      } catch (e) {
        console.warn('Falha ao gerar cláusula:', desc, e);
      }
    }
    return {
      ok: true,
      data: {
        cliente: args.clienteNome,
        valor: args.valor ?? null,
        prazoDias: args.prazoDias ?? 45,
        clausulasGeradas: clausulas.length,
      },
    };
  },
};

// ============================================================
// Registry
// ============================================================

const TOOLS: Record<string, ToolDefinition> = {
  createCliente,
  createProjeto,
  gerarRender,
  calcularOrcamento,
  gerarContrato,
};

export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS[name];
}

export function listTools(): ToolDefinition[] {
  return Object.values(TOOLS);
}

// Executor que a IARA usa para rodar o plano vindo do orchestrator
export async function executeToolCall(
  name: string,
  args: unknown,
  ctx: ExecutionContext,
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) return { ok: false, error: `Ferramenta desconhecida: ${name}` };

  const parsed = tool.inputSchema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Argumentos inválidos para ${name}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    };
  }

  try {
    return await tool.execute(parsed.data, ctx);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}
