import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, readJsonBody, jsonResponse } from "../_shared/guard.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "openai/gpt-5.5";
const GEMINI_MODEL = Deno.env.get("GEMINI_TEXT_MODEL") ?? "gemini-3.7-flash";
const VERCEL_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
type Provider = "lovable" | "gemini" | "vercel";

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
  { name: "createProjeto", description: "Cria um projeto de marcenaria diretamente a partir de texto, sem exigir imagem. Use somente quando nome, largura, altura e profundidade estiverem explícitos. Preserve também contagens explicitamente informadas, como número de portas, gavetas ou módulos. Não invente dimensões nem contagens; se faltar alguma dimensão obrigatória, peça somente a informação que falta.", parameters: { type: "object", properties: { nome: { type: "string" }, clienteNome: { type: "string" }, width: { type: "number" }, height: { type: "number" }, depth: { type: "number" }, doors: { type: "number" }, drawers: { type: "number" }, modules: { type: "number" }, tipo: { type: "string" }, confirmado: { type: "boolean" } }, required: ["nome", "width", "height", "depth", "confirmado"] } },
  { name: "gerarRender", description: "Gera uma visualização do móvel por texto. Pode ser executado sem imagem base. Com imagem, preserve o contexto visual.", parameters: { type: "object", properties: { prompt: { type: "string" }, estilo: { type: "string" } }, required: ["prompt"] } },
  { name: "calcularOrcamento", description: "Calcula orçamento a partir dos dados reais do projeto atual. Se faltarem dados críticos, não invente.", parameters: { type: "object", properties: { projetoId: { type: "string" } } } },
  { name: "operationalIntelligence", description: "Analisa informações operacionais reais do projeto. Nunca invente dados ausentes.", parameters: { type: "object", properties: { projetoId: { type: "string" } } } },
  { name: "gerarContrato", description: "Prepara documentação contratual assistida por IA.", parameters: { type: "object", properties: { clienteNome: { type: "string" }, valor: { type: "number" }, prazoDias: { type: "number" }, clausulasExtras: { type: "array", items: { type: "string" } } }, required: ["clienteNome"] } },
  { name: "iaraSmartAction", description: "Executa uma ação contextual da IARA usando dados reais do projeto. Use para materiais, ferragens, corte, estoque, produção, orçamento, documentos, pedido, montagem, instalação, checklist, entrega, revisão ou conferência de medidas.", parameters: { type: "object", properties: { action: { type: "string", enum: ["materials", "hardware", "inventory", "production", "cut", "budget", "documents", "order", "assembly", "installation", "checklist", "delivery", "review_project", "check_measurements"] }, projectId: { type: "string" } }, required: ["action"] } },
];

const SYSTEM_INSTRUCTION = `Você é o orquestrador IARA OS da Marcenapp. Interprete a intenção e produza um PLANO DE AÇÕES usando somente as ferramentas disponíveis.
- Responda em português brasileiro, direto e técnico.
- Use o contexto da conversa para manter continuidade.
- A IARA funciona por texto mesmo sem imagem.
- Para criar projeto, use createProjeto quando nome e largura, altura e profundidade estiverem explicitamente informados na mensagem ou contexto imediato. Sem imagem também pode criar. Nunca invente dimensão.
- Para gerarRender, a ferramenta real exige contexto visual. Se não houver imagem disponível, não invente uma; peça uma referência visual ou ambiente com foto.
- Para materiais, ferragens, corte, estoque, produção, orçamento, documentos, pedido, montagem, instalação, checklist, entrega, revisão e conferência de medidas, use iaraSmartAction quando a intenção estiver clara.
- Nunca invente medidas, preços, materiais, clientes ou condições.
- Se faltar informação obrigatória, peça somente a informação faltante sem chamar ferramenta.
- Para múltiplas ações, retorne as chamadas em ordem lógica e segura.`;

function toGeminiSchema(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value };
  if (typeof result.type === "string") result.type = result.type.toUpperCase();
  if (result.properties && typeof result.properties === "object") {
    result.properties = Object.fromEntries(Object.entries(result.properties as Record<string, Record<string, unknown>>).map(([k, v]) => [k, toGeminiSchema(v)]));
  }
  if (result.items && typeof result.items === "object" && !Array.isArray(result.items)) result.items = toGeminiSchema(result.items as Record<string, unknown>);
  return result;
}
function geminiTools() { return [{ functionDeclarations: TOOL_DECLARATIONS.map(tool => ({ name: tool.name, description: tool.description, parameters: toGeminiSchema(tool.parameters) })) }]; }
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 90000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); } catch (error) { if (error instanceof DOMException && error.name === "AbortError") throw new Error("provider_timeout"); throw new Error("provider_connection_error"); } finally { clearTimeout(timer); }
}
async function resolveProvider(userId: string): Promise<{ primary: Provider; fallback: Provider | null }> {
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server_config_incomplete");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin.from("ai_provider_settings").select("provider").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("provider_settings_unavailable");
  const configured = data?.provider as string | undefined;
  const available = { lovable: Boolean(Deno.env.get("LOVABLE_API_KEY")), gemini: Boolean(Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY")), vercel: Boolean(Deno.env.get("AI_GATEWAY_API_KEY") && Deno.env.get("AI_GATEWAY_MODEL")) };
  if (configured === "vercel" && available.vercel) return { primary: "vercel", fallback: available.lovable ? "lovable" : (available.gemini ? "gemini" : null) };
  if (configured === "lovable" && available.lovable) return { primary: "lovable", fallback: available.gemini ? "gemini" : null };
  if (configured === "gemini" && available.gemini) return { primary: "gemini", fallback: available.lovable ? "lovable" : null };
  return { primary: available.lovable ? "lovable" : "gemini", fallback: available.lovable && available.gemini ? "gemini" : null };
}
async function callLovable(userPrompt: string, contextBlock: string) {
  const key = Deno.env.get("LOVABLE_API_KEY"); if (!key) throw new Error("provider_not_configured:lovable");
  const response = await fetchWithTimeout(LOVABLE_GATEWAY_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Lovable-API-Key": key }, body: JSON.stringify({ model: LOVABLE_MODEL, messages: [{ role: "system", content: SYSTEM_INSTRUCTION }, { role: "user", content: userPrompt + contextBlock }], tools: TOOL_DECLARATIONS, tool_choice: "auto" }) });
  if (!response.ok) throw new Error(`provider_http:${response.status}`); return await response.json();
}
async function callVercel(userPrompt: string, contextBlock: string) {
  const key = Deno.env.get("AI_GATEWAY_API_KEY"); const model = Deno.env.get("AI_GATEWAY_MODEL"); if (!key || !model) throw new Error("provider_not_configured:vercel");
  const response = await fetchWithTimeout(VERCEL_GATEWAY_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_INSTRUCTION }, { role: "user", content: userPrompt + contextBlock }], tools: TOOL_DECLARATIONS, tool_choice: "auto" }) });
  if (!response.ok) throw new Error(`provider_http:${response.status}`); return await response.json();
}
async function callGemini(userPrompt: string, contextBlock: string) {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY"); if (!key) throw new Error("provider_not_configured:gemini");
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }, contents: [{ role: "user", parts: [{ text: userPrompt + contextBlock }] }], tools: geminiTools(), toolConfig: { functionCallingConfig: { mode: "AUTO" } } }) });
  if (!response.ok) throw new Error(`provider_http:${response.status}`); return await response.json();
}
type AIProviderAdapter = (userPrompt: string, contextBlock: string) => Promise<Record<string, unknown>>;

function parseProviderResponse(provider: Provider, data: Record<string, unknown>) {
  const plan: Array<{ tool: string; args: Record<string, unknown> }> = []; let summary = "";
  if (provider === "lovable" || provider === "vercel") {
    const message = (data.choices as Array<Record<string, unknown>> | undefined)?.[0]?.message as Record<string, unknown> | undefined;
    for (const call of (message?.tool_calls as Array<Record<string, unknown>> | undefined) ?? []) { const fn = call.function as Record<string, unknown> | undefined; if (!fn?.name) continue; let args: Record<string, unknown> = {}; try { args = JSON.parse(String(fn.arguments ?? "{}")); } catch { args = {}; } plan.push({ tool: String(fn.name), args }); }
    const content = message?.content; summary = typeof content === "string" ? content : Array.isArray(content) ? content.map((p: { text?: string }) => p?.text ?? "").join("") : "";
    return { plan, summary: summary.trim(), model: String(data.model ?? (provider === "vercel" ? Deno.env.get("AI_GATEWAY_MODEL") ?? "vercel" : LOVABLE_MODEL)) };
  }
  const candidate = (data.candidates as Array<Record<string, unknown>> | undefined)?.[0];
  const parts = ((candidate?.content as Record<string, unknown> | undefined)?.parts as Array<Record<string, unknown>> | undefined) ?? [];
  for (const part of parts) { const functionCall = part.functionCall as Record<string, unknown> | undefined; if (functionCall?.name) plan.push({ tool: String(functionCall.name), args: (functionCall.args as Record<string, unknown>) ?? {} }); if (typeof part.text === "string") summary += part.text; }
  return { plan, summary: summary.trim(), model: GEMINI_MODEL };
}
serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req); if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders }); if (req.method !== "POST") return jsonResponse(corsHeaders, { error: "Method not allowed", code: "method_not_allowed" }, 405);
  const guard = await guardRequest(req, corsHeaders, { fn: "ai-orchestrator", limit: 20, windowSeconds: 60 }); if (!guard.ok) return guard.response;
  try {
    const read = await readJsonBody(req, MAX_BODY_BYTES); if (!read.ok) return jsonResponse(corsHeaders, { error: read.reason === "too_large" ? "Corpo da requisição muito grande." : "JSON inválido.", code: read.reason === "too_large" ? "payload_too_large" : "invalid_json" }, read.reason === "too_large" ? 413 : 400);
    const parsed = BodySchema.safeParse(read.body); if (!parsed.success) return jsonResponse(corsHeaders, { error: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    const contextBlock = parsed.data.context ? `\n\nCONTEXTO ATUAL:\n${JSON.stringify(parsed.data.context, null, 2)}` : "";
    let resolution: { primary: Provider; fallback: Provider | null }; try { resolution = await resolveProvider(guard.userId); } catch (error) { if (error instanceof Error && error.message === "provider_settings_unavailable") return jsonResponse(corsHeaders, { error: "Não foi possível ler a configuração do provedor de IA.", code: "provider_configuration_error" }, 503); throw error; }
    const providers: Provider[] = resolution.fallback ? [resolution.primary, resolution.fallback] : [resolution.primary]; let lastError: unknown = null;
    const providerAdapters: Record<Provider, AIProviderAdapter> = { lovable: callLovable, gemini: callGemini, vercel: callVercel };
    for (const provider of providers) { try { const data = await providerAdapters[provider](parsed.data.userPrompt, contextBlock); const result = parseProviderResponse(provider, data); return jsonResponse(corsHeaders, { ...result, provider }); } catch (error) { lastError = error; console.error(`AI orchestrator provider ${provider} failed`, error); } }
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    if (message.startsWith("provider_not_configured")) return jsonResponse(corsHeaders, { error: "Nenhum provedor de IA de texto está configurado. Ative um provedor no Admin.", code: "provider_not_configured" }, 500);
    if (message.includes("provider_http:402")) return jsonResponse(corsHeaders, { error: "Os créditos do provedor de IA acabaram.", code: "provider_credits_exhausted" }, 402);
    if (message.includes("provider_http:429")) return jsonResponse(corsHeaders, { error: "O limite do provedor de IA foi atingido. Tente novamente em alguns segundos.", code: "rate_limited" }, 429, { "Retry-After": "10" });
    if (message === "provider_timeout") return jsonResponse(corsHeaders, { error: "O provedor de IA demorou além do limite esperado.", code: "provider_timeout" }, 504);
    if (message === "provider_connection_error") return jsonResponse(corsHeaders, { error: "Não foi possível comunicar com o provedor de IA.", code: "provider_connection_error" }, 502);
    return jsonResponse(corsHeaders, { error: "O provedor de IA está indisponível no momento.", code: "upstream_error" }, 502);
  } catch (e) { console.error("ai-orchestrator error:", e); return jsonResponse(corsHeaders, { error: "Erro interno no orquestrador.", code: "internal_error" }, 500); }
});
