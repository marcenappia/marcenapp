// IARA OS v1 — Orchestrator via Gemini Function Calling
// Recebe { userPrompt, context? } e retorna { plan: ToolCall[], summary }
// Não executa nada. Apenas decide.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  userPrompt: z.string().min(1).max(4000),
  context: z
    .object({
      currentProject: z.record(z.any()).optional(),
      lastImage: z.string().optional(),
      decorStyle: z.string().optional(),
      recentClients: z.array(z.object({ id: z.string(), nome: z.string() })).optional(),
    })
    .partial()
    .optional(),
});

// Declarações de ferramentas (contratos estáveis). Espelho no client em src/core/toolRegistry.ts
const TOOL_DECLARATIONS = [
  {
    name: "createCliente",
    description:
      "Cria um novo cliente no cadastro. Use quando o usuário mencionar um novo cliente com nome (ex: 'para o cliente João', 'criar cliente Maria Silva').",
    parameters: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome completo do cliente" },
        email: { type: "string", description: "Email do cliente (opcional)" },
        telefone: { type: "string", description: "Telefone do cliente (opcional)" },
      },
      required: ["nome"],
    },
  },
  {
    name: "createProjeto",
    description:
      "Cria/atualiza um projeto de marcenaria com dimensões. Use para 'cozinha planejada', 'guarda-roupa', etc.",
    parameters: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome do projeto (ex: 'Cozinha planejada')" },
        clienteNome: { type: "string", description: "Nome do cliente vinculado (opcional)" },
        width: { type: "number", description: "Largura em metros" },
        height: { type: "number", description: "Altura em metros" },
        depth: { type: "number", description: "Profundidade em metros" },
        tipo: {
          type: "string",
          description: "Tipo do móvel: cozinha, guarda-roupa, armario, estante, outro",
        },
      },
      required: ["nome"],
    },
  },
  {
    name: "gerarRender",
    description:
      "Solicita ao Estúdio a materialização visual (render 3D) do projeto atual. Requer contexto de imagem base + máscara já preparadas OU descrição textual pura.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Descrição do que renderizar" },
        estilo: {
          type: "string",
          description: "Estilo de humanização: Limpo, Cozy, Luxo, Escritório, Minimalista",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "calcularOrcamento",
    description:
      "Calcula orçamento estimado do projeto atual usando dimensões e materiais. Use para 'quanto custa', 'preço', 'valor'.",
    parameters: {
      type: "object",
      properties: {
        observacoes: { type: "string", description: "Observações extras (opcional)" },
      },
    },
  },
  {
    name: "gerarContrato",
    description:
      "Gera contrato para o cliente/projeto atual. Pode incluir cláusulas customizadas via IA.",
    parameters: {
      type: "object",
      properties: {
        clienteNome: { type: "string", description: "Nome do cliente contratante" },
        valor: { type: "number", description: "Valor total em reais" },
        prazoDias: { type: "number", description: "Prazo de entrega em dias úteis" },
        clausulasExtras: {
          type: "array",
          items: { type: "string" },
          description: "Descrições curtas de cláusulas adicionais a gerar via IA",
        },
      },
      required: ["clienteNome"],
    },
  },
];

const SYSTEM_INSTRUCTION = `Você é o orquestrador IARA OS da Marcenapp — um sistema operacional para marcenarias.
Sua função: interpretar a intenção do usuário e produzir um PLANO DE AÇÕES chamando as ferramentas certas na ordem correta.

Regras:
- Sempre responda em português brasileiro, tom direto e técnico.
- Se a solicitação envolver múltiplas ações (ex: "crie cliente, projeto, orçamento e contrato"), retorne TODAS as chamadas na sequência lógica correta.
- Se faltar informação obrigatória (ex: nome do cliente), peça esclarecimento em texto SEM chamar ferramentas.
- Não invente dados. Se o usuário disse "cozinha" sem dimensões, use padrões razoáveis (3.0 x 2.6 x 0.6).
- Ordem lógica típica: createCliente → createProjeto → gerarRender → calcularOrcamento → gerarContrato.
- Se a intenção for pura conversa/dúvida, responda em texto sem chamar ferramentas.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", fields: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { userPrompt, context } = parsed.data;

    const contextBlock = context
      ? `\n\nCONTEXTO ATUAL:\n${JSON.stringify(context, null, 2)}`
      : "";

    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: userPrompt + contextBlock }] }],
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini orchestrator error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Gemini error ${response.status}`, details: errText }),
        {
          status: response.status === 429 ? 429 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];

    const plan: Array<{ tool: string; args: Record<string, any> }> = [];
    let summary = "";

    for (const part of parts) {
      if (part.functionCall) {
        plan.push({ tool: part.functionCall.name, args: part.functionCall.args ?? {} });
      } else if (part.text) {
        summary += part.text;
      }
    }

    return new Response(
      JSON.stringify({ plan, summary: summary.trim(), model }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-orchestrator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
