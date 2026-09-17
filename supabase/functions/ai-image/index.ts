import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MIN_DIM = 64;
const MAX_DIM = 4096;
const DEFAULT_DIM = 1024;
const MAX_PROMPT_CHARS = 4000;
const MAX_PROMPT_WORDS = 800;
const OPERATION_TYPE = "gerarRender";
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_IMAGE_MODEL = "openai/gpt-image-2";
const GEMINI_IMAGE_MODEL = Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-3-pro-image";
const GEMINI_IMAGE_SIZE = Deno.env.get("GEMINI_IMAGE_SIZE") ?? "2K";
const TEST_ACCOUNT_EMAIL = "marcenapp.ia@gmail.com";
type Provider = "lovable" | "gemini";

const ImageSchema = z.object({ mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp|gif)$/i), data: z.string().min(1).max(15_000_000) });
const BodySchema = z.object({ prompt: z.string().min(1), images: z.array(ImageSchema).max(8).optional(), size: z.object({ width: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(), height: z.number().int().min(MIN_DIM).max(MAX_DIM).optional() }).optional(), idempotencyKey: z.string().trim().min(8).max(200) });
const allowedSuffixes = [".lovable.app", ".lovableproject.com", ".lovable.dev", ".vercel.app"];
const cors = (req: Request) => { const origin = req.headers.get("origin"); let allowed = "null"; try { if (origin) { const u = new URL(origin); const normalized = origin.replace(/\/$/, ""); const extras = ["https://marcenapp.com.br", "https://www.marcenapp.com.br", Deno.env.get("ALLOWED_ORIGINS") ?? "", Deno.env.get("APP_URL") ?? "", Deno.env.get("PUBLIC_APP_URL") ?? ""].flatMap(v => v.split(",")).map(v => v.trim().replace(/\/$/, "")).filter(Boolean); if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || extras.includes(normalized) || (u.protocol === "https:" && allowedSuffixes.some(s => u.hostname.endsWith(s)))) allowed = origin; } } catch { /* ignore malformed Origin headers */ } return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" }; };
const json = (h: Record<string, string>, body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...h, ...extra, "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff" } });
const adminClient = () => { const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) throw new Error("server_config_incomplete"); return createClient(url, key, { auth: { persistSession: false } }); };
async function guardRequest(req: Request, h: Record<string, string>) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false as const, response: json(h, { error: "Autenticação necessária." }, 401) };
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, response: json(h, { error: "Sessão inválida ou expirada." }, 401) };
  const { data: rl, error: rlError } = await admin.rpc("consume_ai_rate_limit", { _user_id: data.user.id, _fn: "ai-image", _limit: 10, _window_seconds: 60 });
  if (rlError) return { ok: false as const, response: json(h, { error: "Não foi possível validar o limite de uso da IA.", code: "rate_limit_unavailable" }, 503, { "Retry-After": "10" }) };
  const row = Array.isArray(rl) ? rl[0] : rl;
  if (!row || row.allowed === false) { const retry = Math.max(1, Number(row?.retry_after_seconds ?? 60)); return { ok: false as const, response: json(h, { error: "Limite de uso atingido.", retryAfterSeconds: retry }, 429, { "Retry-After": String(retry) }) };
  return { ok: true as const, userId: data.user.id, email: data.user.email ?? "" };
}
async function refund(userId: string, key: string) { await adminClient().rpc("refund_billing_credit", { p_user_id: userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: key }); }
async function resolveProvider(userId: string): Promise<{ primary: Provider; fallback: Provider | null }> {
  const admin = adminClient();
  const { data } = await admin.from("ai_provider_settings").select("provider").eq("user_id", userId).maybeSingle();
  const configured = data?.provider as string | undefined;
  const lovableAvailable = Boolean(Deno.env.get("LOVABLE_API_KEY"));
  const geminiAvailable = Boolean(Deno.env.get("GOOGLE_GEMINI_API_KEY"));
  if (configured === "lovable") return { primary: "lovable", fallback: geminiAvailable ? "gemini" : null };
  if (configured === "gemini") return { primary: "gemini", fallback: lovableAvailable ? "lovable" : null };
  return { primary: lovableAvailable ? "lovable" : "gemini", fallback: lovableAvailable && geminiAvailable ? "gemini" : null };
}
async function callLovable(prompt: string, images?: Array<{ mimeType: string; data: string }>) {
  const key = Deno.env.get("LOVABLE_API_KEY"); if (!key) throw new Error("provider_not_configured:lovable");
  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  for (const img of images ?? []) content.push({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
  const response = await fetch(LOVABLE_GATEWAY_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Lovable-API-Key": key }, body: JSON.stringify({ model: LOVABLE_IMAGE_MODEL, messages: [{ role: "user", content }], modalities: ["image", "text"] }) });
  if (!response.ok) { const status = response.status; console.error("Lovable image error:", status, await response.text()); throw new Error(`provider_http:${status}`); }
  const data = await response.json(); const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
  if (!imageUrl) throw new Error("empty_image_result"); return { imageUrl, model: data.model ?? LOVABLE_IMAGE_MODEL };
}
async function callGemini(prompt: string, images?: Array<{ mimeType: string; data: string }>) {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY"); if (!key) throw new Error("provider_not_configured:gemini");
  const parts: Array<Record<string, unknown>> = [{ text: prompt }]; for (const img of images ?? []) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_IMAGE_MODEL}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], responseFormat: { image: { imageSize: GEMINI_IMAGE_SIZE } } } }) });
  if (!response.ok) { const status = response.status; console.error("Gemini image error:", status, await response.text()); throw new Error(`provider_http:${status}`); }
  const data = await response.json(); const candidate = data.candidates?.[0]?.content?.parts ?? []; let imageUrl: string | null = null;
  for (const part of candidate) { const inline = part.inlineData || part.inline_data; if (inline?.data) imageUrl = `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`; }
  if (!imageUrl) throw new Error("empty_image_result"); return { imageUrl, model: GEMINI_IMAGE_MODEL };
}
async function generateWithFallback(userId: string, prompt: string, images?: Array<{ mimeType: string; data: string }>) {
  const { primary, fallback } = await resolveProvider(userId); const providers: Provider[] = fallback ? [primary, fallback] : [primary]; let lastError: unknown = null;
  for (const provider of providers) { try { return provider === "lovable" ? { provider, ...(await callLovable(prompt, images)) } : { provider, ...(await callGemini(prompt, images)) }; } catch (error) { lastError = error; console.error(`AI image provider ${provider} failed`, error); } }
  throw lastError ?? new Error("provider_unavailable");
}
serve(async req => {
  const h = cors(req); if (req.method === "OPTIONS") return new Response(null, { headers: h }); if (req.method !== "POST") return json(h, { message: "Method not allowed", code: "method_not_allowed" }, 405);
  const guard = await guardRequest(req, h); if (!guard.ok) return guard.response;
  let creditConsumed = false; let idempotencyKey = "";
  try {
    const declared = Number(req.headers.get("content-length") ?? 0); if (declared > MAX_BODY_BYTES) return json(h, { message: "Request body too large.", code: "payload_too_large" }, 413);
    const raw = await req.text(); if (raw.length > MAX_BODY_BYTES) return json(h, { message: "Request body too large.", code: "payload_too_large" }, 413);
    let body: unknown; try { body = JSON.parse(raw || "{}"); } catch { return json(h, { message: "Invalid JSON body", code: "invalid_json" }, 400); }
    const parsed = BodySchema.safeParse(body); if (!parsed.success) return json(h, { message: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    const { prompt: rawPrompt, images, size } = parsed.data; idempotencyKey = parsed.data.idempotencyKey; const prompt = rawPrompt.trim();
    if (prompt.length === 0 || prompt.length > MAX_PROMPT_CHARS) return json(h, { message: "Validation failed", code: "validation_error" }, 400);
    const wordCount = prompt.split(/\s+/).filter(Boolean).length; if (wordCount > MAX_PROMPT_WORDS) return json(h, { message: "Validation failed", code: "validation_error" }, 400);
    let width = DEFAULT_DIM, height = DEFAULT_DIM; if (size && (size.width !== undefined || size.height !== undefined)) { width = size.width ?? size.height ?? DEFAULT_DIM; height = size.height ?? size.width ?? DEFAULT_DIM; }
    const admin = adminClient(); const isTestAccount = guard.email.trim().toLowerCase() === TEST_ACCOUNT_EMAIL;
    let consumed: unknown;
    if (isTestAccount) {
      consumed = { testAccount: true, creditCost: 0 };
    } else {
      const { data, error: consumeError } = await admin.rpc("consume_billing_credit", { p_user_id: guard.userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: idempotencyKey });
      if (consumeError) { const missing = consumeError.message.includes("commercial_rule_missing"), insufficient = consumeError.message.includes("insufficient_credits"); return json(h, { message: missing ? "Esta operação ainda não possui uma regra comercial configurada." : insufficient ? "Créditos insuficientes para gerar o render." : "Não foi possível autorizar o consumo de créditos.", code: missing ? "commercial_rule_missing" : insufficient ? "insufficient_credits" : "credit_authorization_failed" }, 402); }
      creditConsumed = true; consumed = Array.isArray(data) ? data[0] : data;
    }
    let result;
    try { result = await generateWithFallback(guard.userId, prompt, images); }
    catch (error) {
      if (creditConsumed) { await refund(guard.userId, idempotencyKey); creditConsumed = false; }
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("provider_not_configured")) return json(h, { message: "Nenhum provedor de IA de imagem está configurado. Ative Lovable AI ou configure o Google Gemini.", code: "provider_not_configured" }, 500);
      if (message.includes("provider_http:402")) return json(h, { message: "Os créditos do provedor de IA estão esgotados.", code: "provider_credits_exhausted" }, 402);
      if (message.includes("provider_http:429")) return json(h, { message: "O limite do provedor de IA foi atingido. Tente novamente em instantes.", code: "rate_limited" }, 429);
      return json(h, { message: "O provedor de imagens está indisponível no momento.", code: "upstream_error" }, 502);
    }
    return json(h, { imageUrl: result.imageUrl, width, height, operationType: OPERATION_TYPE, model: result.model, provider: result.provider, creditConsumption: consumed, promptStats: { wordCount, charCount: prompt.length, tokenEstimate: Math.ceil(prompt.length / 4) } });
  } catch (e) {
    if (creditConsumed && idempotencyKey) { try { await refund(guard.userId, idempotencyKey); } catch (refundError) { console.error("ai-image refund error:", refundError); } }
    console.error("ai-image error:", e); return json(h, { message: "Erro interno ao gerar imagem.", code: "internal_error" }, 500);
  }
});
