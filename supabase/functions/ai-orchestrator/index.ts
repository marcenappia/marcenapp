import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, readJsonBody, jsonResponse } from "../_shared/guard.ts";
import { resolveProvider, type AIProvider } from "../_shared/provider.ts";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "openai/gpt-5.5";
const GEMINI_MODEL = "gemini-3.6-flash";
type Provider = AIProvider;

const BodySchema = z.object({
  userPrompt: z.string().min(1).max(4000),
  context: z.object({
    currentProject: z.record(z.any()).optional(),
    lastImage: z.string().optional(),
    decorStyle: z.string().optional(),
    recentClients: z.array(z.object({ id: z.string(), nome: z.string() })).optional(),
    conversation: z.array(z.object({ sender: z.enum(["user", "iara"]), text: z.string().min(1).max(4000) })).max(12).optional(),
  }).partial().optional(),
});

const TOOL_DECLARATIONS = [
  { name: "createCliente", description: "Cria um novo cliente quando o nome foi informado pelo usuário. Nunca invente dados pessoais.", parameters: { type: "object", properties: { nome: { type: "string", description: "Nome do cliente" }, email: { type: "string", description: "Email opcional" }, telefone: { type: "string", description: "Telefone opcional" } }, required: ["nome"] } },
  { name: "createProjeto", description: "Cria um projeto de marcenaria diretamente a partir de texto, sem exigir imagem. Pode ser chamado quando o usuário, na própria mensagem ou no contexto imediato da conversa, fornecer nome e as três dimensões (largura, altura e profundidade) de forma explícita e pedir para criar o projeto. Não invente nenhuma dimensão. Se faltar qualquer dimensão, peça somente a informação que falta.", parameters: { type: "object", properties: { nome: { type: "string", description: "Nome do projeto" }, clienteNome: { type: "string", description: "Cliente vinculado, se informado" }, width: { type: "number", description: "Largura conforme informado pelo usuário" }, height: { type: "number", description: "Altura conforme informado pelo usuário" }, depth: { type: "number", description: "Profundidade conforme informado pelo usuário" }, tipo: { type: "string", description: "Tipo do móvel" }, confirmado: { type: "boolean", description: "Use true quando o usuário tiver fornecido explicitamente as três dimensões e solicitado a criação do projeto; nunca use true com dimensão inventada ou ausente" } }, required: ["nome", "width", "height", "depth", "confirmado"] } },
  { name: "gerarRender", description: "Gera uma visualização do móvel por texto. Pode ser executado sem imagem base; quando houver imagem base e máscara do ambiente, use-as para preservar o contexto visual. Não bloqueie um render textual apenas por falta de imagem.", parameters: { type: "object", properties: { prompt: { type: "string", description: "Descrição do que renderizar" }, estilo: { type: "string", description: "Estilo visual" } }, required: ["prompt"] } },
  { name: "calcularOrcamento", description: "Calcula orçamento a partir dos dados reais do projeto atual. Se faltarem dados críticos, peça confirmação.", parameters: { type: "object", properties: { projetoId: { type: "string", description: "ID do projeto, quando conhecido" } } } },
  { name: "operationalIntelligence", description: "Analisa informações operacionais reais do projeto, incluindo custos, ferragens, estoque, produção, venda e recebimentos. Nunca invente dados ausentes.", parameters: { type: "object", properties: { projetoId: { type: "string", description: "ID do projeto, quando conhecido" } } } },
  { name: "gerarContrato", description: "Prepara documentação contratual assistida por IA. Não apresenta o texto como aconselhamento jurídico definitivo.", parameters: { type: "object", properties: { clienteNome: { type: "string" }, valor: { type: "number" }, prazoDias: { type: "number" }, clausulasExtras: { type: "array", items: { type: "string" } } }, required: ["clienteNome"] } },
];

const SYSTEM_INSTRUCTION = `Você é o orquestrador IARA OS da Marcenapp.
Sua função é interpretar a intenção do usuário e produzir um PLANO DE AÇÕES chamando somente as ferramentas disponíveis.

Regras obrigatórias:
- Responda em português brasileiro, de forma direta e técnica.
- Use o CONTEXTO DA CONVERSA quando fornecido para manter continuidade entre mensagens.
- A IARA funciona por texto mesmo quando nenhuma imagem foi anexada. Não exija foto para criar, analisar ou estruturar um projeto quando a ação solicitada puder ser executada com os dados textuais disponíveis.
- Para criação de projeto, se o usuário fornecer explicitamente nome e largura, altura e profundidade na mensagem atual ou já tiver fornecido/confirmado essas três dimensões no contexto imediato, chame createProjeto. A ausência de imagem NÃO é motivo para bloquear createProjeto.
- Para gerarRender, texto é suficiente para iniciar uma visualização. Se houver imagem base e máscara, preserve o contexto visual; se não houver, não bloqueie o render apenas por falta de imagem.
- Nunca invente medidas, preços, materiais, clientes ou condições de instalação.
- Para createProjeto, confirmado deve ser true somente quando as três dimensões estiverem explicitamente fornecidas pelo usuário. Se qualquer dimensão estiver ausente, peça somente a dimensão que falta; não peça imagem.
- Nunca aplique medidas padrão silenciosamente.
- Estimativas devem ser identificadas como estimativas e não podem liberar produção, compra, corte ou orçamento final sozinhas.
- Um render baseado em uma fotografia do ambiente pode usar imagem; isso é diferente de gerar uma visualização por texto.
- Se faltar informação obrigatória para a ação solicitada, peça esclarecimento sem chamar ferramenta.
- Para múltiplas ações, retorne as chamadas na ordem lógica e segura.
- Para conversa ou dúvida sem ação, responda apenas em texto.`;

function toGeminiSchema(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value };
  if (typeof result.type === "string") result.type = result.type.toUpperCase();
  if (result.properties && typeof result.properties === "object") {
    const props = result.properties as Record<string, Record<string, unknown>>;
    result.properties = Object.fromEntries(Object.entries(props).map(([key, schema]) => [key, toGeminiSchema(schema)]));
  }
  if (Array.isArray(result.items)) result.items = result.items.map(item => toGeminiSchema(item as Record<string, unknown>));
  else if (result.items && typeof result.items === "object") result.items = toGeminiSchema(result.items as Record<string, unknown>);
  return result;
}

function geminiTools() {
  return [{ functionDeclarations: TOOL_DECLARATIONS.map(tool => ({ name: tool.name, description: tool.description, parameters: toGeminiSchema(tool.parameters) })) }];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 90_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("provider_timeout");
    throw new Error("provider_connection_error");
  }
  finally { clearTimeout(timer); }
}

async function callLovable(userPrompt: string, contextBlock: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("provider_not_configured:lovable");
  const response = await fetchWithTimeout(LOVABLE_GATEWAY_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Lovable-API-Key": key }, body: JSON.stringify({ model: LOVABLE_MODEL, messages: [{ role: "system", content: SYSTEM_INSTRUCTION }, { role: "user", content: userPrompt + contextBlock }], tools: TOOL_DECLARATIONS, tool_choice: "auto" }) });
  if (!response.ok) throw new Error(`provider_http:${response.status}`);
  return await response.json();
}

async function callGemini(userPrompt: string, contextBlock: string) {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!key) throw new Error("provider_not_configured:gemini");
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }, contents: [{ role: "user", parts: [{ text: userPrompt + contextBlock }] }], tools: geminiTools(), toolConfig: { functionCallingConfig: { mode: "AUTO" } } }) });
  if (!response.ok) throw new Error(`provider_http:${response.status}`);
  return await response.json();
}

function parseProviderResponse(provider: Provider, data: Record<string, unknown>) {
  const plan: Array<{ tool: string; args: Record<string, unknown> }> = [];
  let summary = "";
  if (provider === "lovable") {
    const message = (data.choices as Array<Record<string, unknown>> | undefined)?.[0]?.message as Record<string, unknown> | undefined;
    for (const call of (message?.tool_calls as Array<Record<string, unknown>> | undefined) ?? []) {
      const fn = call.function as Record<string, unknown> | undefined;
      const name = fn?.name;
      if (!name) continue;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(String(fn?.arguments ?? "{}")); } catch { args = {}; }
      plan.push({ tool: String(name), args });
    }
    const content = message?.content;
    if (typeof content === "string") summary = content;
    else if (Array.isArray(content)) summary = content.map((part: { text?: string }) => part?.text ?? "").join("");
    return { plan, summary: summary.trim(), model: String(data.model ?? LOVABLE_MODEL) };
  }

  const candidate = (data.candidates as Array<Record<string, unknown>> | undefined)?.[0];
  const parts = ((candidate?.content as Record<string, unknown> | undefined)?.parts as Array<Record<string, unknown>> | undefined) ?? [];
  for (const part of parts) {
    const functionCall = part.functionCall as Record<string, unknown> | undefined;
    if (functionCall?.name) plan.push({ tool: String(functionCall.name), args: (functionCall.args as Record<string, unknown>) ?? {} });
    if (typeof part.text === "string") summary += part.text;
  }
  return { plan, summary: summary.trim(), model: GEMINI_MODEL };
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(corsHeaders, { error: "Method not allowed", code: "method_not_allowed" }, 405);

  const guard = await guardRequest(req, corsHeaders, { fn: "ai-orchestrator", limit: 20, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) return jsonResponse(corsHeaders, { error: read.reason === "too_large" ? "Corpo da requisição muito grande." : "JSON inválido.", code: read.reason === "too_large" ? "payload_too_large" : "invalid_json" }, read.reason === "too_large" ? 413 : 400);
    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) return jsonResponse(corsHeaders, { error: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);

    const contextBlock = parsed.data.context ? `\n\nCONTEXTO ATUAL:\n${JSON.stringify(parsed.data.context, null, 2)}` : "";
    let resolution: { primary: Provider; fallback: Provider | null };
    try {
      resolution = await resolveProvider(guard.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "provider_settings_unavailable") return jsonResponse(corsHeaders, { error: "Não foi possível ler a configuração do provedor de IA.", code: "provider_configuration_error" }, 503);
      throw error;
    }
    const providers: Provider[] = resolution.fallback ? [resolution.primary, resolution.fallback] : [resolution.primary];
    let lastError: unknown = null;

    for (const provider of providers) {
      try {
        const data = provider === "lovable" ? await callLovable(parsed.data.userPrompt, contextBlock) : await callGemini(parsed.data.userPrompt, contextBlock);
        const result = parseProviderResponse(provider, data);
        return jsonResponse(corsHeaders, { ...result, provider });
      } catch (error) {
        lastError = error;
        console.error(`AI orchestrator provider ${provider} failed`, error);
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    if (message.startsWith("provider_not_configured")) return jsonResponse(corsHeaders, { error: "Nenhum provedor de IA de texto está configurado. Ative um provedor no Admin.", code: "provider_not_configured" }, 500);
    if (message.includes("provider_http:402")) return jsonResponse(corsHeaders, { error: "Os créditos do provedor de IA acabaram.", code: "provider_credits_exhausted" }, 402);
    if (message.includes("provider_http:429")) return jsonResponse(corsHeaders, { error: "O limite do provedor de IA foi atingido. Tente novamente em alguns segundos.", code: "rate_limited" }, 429, { "Retry-After": "10" });
    if (message === "provider_timeout") return jsonResponse(corsHeaders, { error: "O provedor de IA demorou além do limite esperado.", code: "provider_timeout" }, 504);
    if (message === "provider_connection_error") return jsonResponse(corsHeaders, { error: "Não foi possível comunicar com o provedor de IA.", code: "provider_connection_error" }, 502);
    return jsonResponse(corsHeaders, { error: "O provedor de IA está indisponível no momento.", code: "upstream_error" }, 502);
  } catch (e) {
    console.error("ai-orchestrator error:", e);
    return jsonResponse(corsHeaders, { error: "Erro interno no orquestrador.", code: "internal_error" }, 500);
  }
});
