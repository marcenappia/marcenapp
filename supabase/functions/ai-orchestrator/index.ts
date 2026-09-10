import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, readJsonBody, jsonResponse } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "openai/gpt-5.5";

const BodySchema = z.object({
  userPrompt: z.string().min(1).max(4000),
  context: z.object({
    currentProject: z.record(z.any()).optional(),
    lastImage: z.string().optional(),
    decorStyle: z.string().optional(),
    recentClients: z.array(z.object({ id: z.string(), nome: z.string() })).optional(),
  }).partial().optional(),
});

const TOOL_DECLARATIONS = [
  { name: "createCliente", description: "Cria um novo cliente quando o nome foi informado pelo usuário. Nunca invente dados pessoais.", parameters: { type: "object", properties: { nome: { type: "string", description: "Nome do cliente" }, email: { type: "string", description: "Email opcional" }, telefone: { type: "string", description: "Telefone opcional" } }, required: ["nome"] } },
  { name: "createProjeto", description: "Cria projeto de marcenaria somente quando nome e largura, altura e profundidade foram explicitamente confirmados pelo usuário. Nunca use medidas padrão silenciosas.", parameters: { type: "object", properties: { nome: { type: "string", description: "Nome do projeto" }, clienteNome: { type: "string", description: "Cliente vinculado, se informado" }, width: { type: "number", description: "Largura em metros" }, height: { type: "number", description: "Altura em metros" }, depth: { type: "number", description: "Profundidade em metros" }, tipo: { type: "string", description: "Tipo do móvel" }, confirmado: { type: "boolean", description: "Deve ser true somente após confirmação explícita das três dimensões" } }, required: ["nome", "width", "height", "depth", "confirmado"] } },
  { name: "gerarRender", description: "Solicita materialização visual. Não transforme estimativas visuais em medidas de fabricação.", parameters: { type: "object", properties: { prompt: { type: "string", description: "Descrição do que renderizar" }, estilo: { type: "string", description: "Estilo visual" } }, required: ["prompt"] } },
  { name: "calcularOrcamento", description: "Calcula orçamento a partir dos dados reais do projeto atual. Se faltarem dados críticos, peça confirmação.", parameters: { type: "object", properties: { observacoes: { type: "string" } } } },
  { name: "gerarContrato", description: "Prepara documentação contratual assistida por IA. Não apresenta o texto como aconselhamento jurídico definitivo.", parameters: { type: "object", properties: { clienteNome: { type: "string" }, valor: { type: "number" }, prazoDias: { type: "number" }, clausulasExtras: { type: "array", items: { type: "string" } } }, required: ["clienteNome"] } },
];

const SYSTEM_INSTRUCTION = `Você é o orquestrador IARA OS da Marcenapp.
Sua função é interpretar a intenção do usuário e produzir um PLANO DE AÇÕES chamando somente as ferramentas disponíveis.

Regras obrigatórias:
- Responda em português brasileiro, de forma direta e técnica.
- Nunca invente medidas, preços, materiais, clientes ou condições de instalação.
- Para createProjeto, confirmado só pode ser true quando o usuário tiver confirmado explicitamente largura, altura e profundidade. Se qualquer dimensão estiver ausente ou não confirmada, NÃO chame createProjeto; peça a informação/confirmação mínima necessária.
- Nunca aplique medidas padrão silenciosamente.
- Estimativas devem ser identificadas como estimativas e não podem liberar produção, compra, corte ou orçamento final sozinhas.
- Se faltar informação obrigatória, peça esclarecimento sem chamar ferramenta.
- Para múltiplas ações, retorne as chamadas na ordem lógica e segura.
- Para conversa ou dúvida sem ação, responda apenas em texto.`;

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(corsHeaders, { error: "Method not allowed" }, 405);

  const guard = await guardRequest(req, corsHeaders, { fn: "ai-orchestrator", limit: 20, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return jsonResponse(corsHeaders, { error: "Serviço Lovable AI não configurado.", code: "provider_not_configured", provider: "lovable" }, 500);

    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) return jsonResponse(corsHeaders, { error: read.reason === "too_large" ? "Corpo da requisição muito grande." : "JSON inválido." }, read.reason === "too_large" ? 413 : 400);

    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) return jsonResponse(corsHeaders, { error: "Validation failed", fields: parsed.error.flatten().fieldErrors }, 400);

    const { userPrompt, context } = parsed.data;
    const contextBlock = context ? `\n\nCONTEXTO ATUAL:\n${JSON.stringify(context, null, 2)}` : "";
    const response = await fetch(LOVABLE_GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}`, "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: LOVABLE_MODEL,
        messages: [{ role: "system", content: SYSTEM_INSTRUCTION }, { role: "user", content: userPrompt + contextBlock }],
        tools: TOOL_DECLARATIONS,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const limited = status === 429;
      const credits = status === 402;
      console.error("Lovable orchestrator error:", status, await response.text());
      return jsonResponse(corsHeaders, {
        error: credits ? "Créditos do Lovable AI esgotados." : limited ? "Limite do Lovable AI atingido." : "O serviço Lovable AI está indisponível.",
        code: credits ? "credits_exhausted" : limited ? "rate_limited" : "upstream_error",
      }, credits ? 402 : limited ? 429 : 502, limited ? { "Retry-After": "10" } : {});
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const plan: Array<{ tool: string; args: Record<string, unknown> }> = [];
    let summary = "";

    for (const call of message?.tool_calls ?? []) {
      const name = call.function?.name;
      if (!name) continue;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function?.arguments ?? "{}"); } catch { args = {}; }
      plan.push({ tool: name, args });
    }

    if (typeof message?.content === "string") summary = message.content;
    else if (Array.isArray(message?.content)) summary = message.content.map((part: { text?: string }) => part?.text ?? "").join("");

    return jsonResponse(corsHeaders, { plan, summary: summary.trim(), model: data.model ?? LOVABLE_MODEL, provider: "lovable" });
  } catch (e) {
    console.error("ai-orchestrator error:", e);
    return jsonResponse(corsHeaders, { error: "Erro interno no orquestrador.", code: "internal_error" }, 500);
  }
});
