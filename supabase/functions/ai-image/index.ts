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
const IMAGE_MODEL = Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-2.5-flash-image";

const ImageSchema = z.object({ mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp|gif)$/i), data: z.string().min(1).max(15_000_000) });
const BodySchema = z.object({ prompt: z.string().min(1), images: z.array(ImageSchema).max(8).optional(), size: z.object({ width: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(), height: z.number().int().min(MIN_DIM).max(MAX_DIM).optional() }).optional(), idempotencyKey: z.string().trim().min(8).max(200) });
const EXTRA_ORIGINS = ["https://marcenapp.com.br", "https://www.marcenapp.com.br", ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(","), Deno.env.get("APP_URL") ?? "", Deno.env.get("PUBLIC_APP_URL") ?? ""].map(v => v.trim().replace(/\/$/, "")).filter(Boolean);
const isAllowedOrigin = (origin: string | null) => { if (!origin) return false; try { const u = new URL(origin); if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true; if (u.protocol !== "https:") return false; return EXTRA_ORIGINS.includes(origin.replace(/\/$/, "")); } catch { return false; } };
const cors = (req: Request) => { const origin = req.headers.get("origin"); const allowed = isAllowedOrigin(origin) ? origin! : "null"; return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" }; };
const json = (h: Record<string, string>, body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...h, ...extra, "Content-Type": "application/json" } });
const adminClient = () => { const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) throw new Error("server_config_incomplete"); return createClient(url, key, { auth: { persistSession: false } }); };
async function guardRequest(req: Request, h: Record<string, string>) { const auth = req.headers.get("Authorization") ?? "", token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""; if (!token) return { ok: false as const, response: json(h, { error: "Autenticação necessária." }, 401) }; const admin = adminClient(); const { data, error } = await admin.auth.getUser(token); if (error || !data.user) return { ok: false as const, response: json(h, { error: "Sessão inválida ou expirada." }, 401) }; const { data: rl, error: rlError } = await admin.rpc("consume_ai_rate_limit", { _user_id: data.user.id, _fn: "ai-image", _limit: 10, _window_seconds: 60 }); if (rlError) return { ok: false as const, response: json(h, { error: "Não foi possível validar o limite de uso da IA.", code: "rate_limit_unavailable" }, 503, { "Retry-After": "10" }) }; const row = Array.isArray(rl) ? rl[0] : rl; if (!row || row.allowed === false) { const retry = Math.max(1, Number(row?.retry_after_seconds ?? 60)); return { ok: false as const, response: json(h, { error: "Limite de uso atingido.", retryAfterSeconds: retry }, 429, { "Retry-After": String(retry) }) }; } return { ok: true as const, userId: data.user.id }; }
async function refund(userId: string, key: string) { await adminClient().rpc("refund_billing_credit", { p_user_id: userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: key }); }

serve(async req => {
  const h = cors(req); if (req.method === "OPTIONS") return new Response(null, { headers: h }); if (req.method !== "POST") return json(h, { message: "Method not allowed", code: "method_not_allowed" }, 405);
  const guard = await guardRequest(req, h); if (!guard.ok) return guard.response;
  let creditConsumed = false;
  let idempotencyKey = "";
  try {
    const declared = Number(req.headers.get("content-length") ?? 0); if (declared > MAX_BODY_BYTES) return json(h, { message: "Request body too large.", code: "payload_too_large" }, 413);
    const raw = await req.text(); if (raw.length > MAX_BODY_BYTES) return json(h, { message: "Request body too large.", code: "payload_too_large" }, 413);
    let body: unknown; try { body = JSON.parse(raw || "{}"); } catch { return json(h, { message: "Invalid JSON body", code: "invalid_json" }, 400); }
    const parsed = BodySchema.safeParse(body); if (!parsed.success) return json(h, { message: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    const { prompt: rawPrompt, images, size } = parsed.data; idempotencyKey = parsed.data.idempotencyKey; const prompt = rawPrompt.trim();
    if (prompt.length === 0 || prompt.length > MAX_PROMPT_CHARS) return json(h, { message: "Validation failed", code: "validation_error", fields: { prompt: ["prompt length invalid"] } }, 400);
    const wordCount = prompt.split(/\s+/).filter(Boolean).length; if (wordCount > MAX_PROMPT_WORDS) return json(h, { message: "Validation failed", code: "validation_error", fields: { prompt: ["prompt has too many words"] } }, 400);
    let width = DEFAULT_DIM, height = DEFAULT_DIM; if (size && (size.width !== undefined || size.height !== undefined)) { width = size.width ?? size.height ?? DEFAULT_DIM; height = size.height ?? size.width ?? DEFAULT_DIM; }
    if (width < MIN_DIM || width > MAX_DIM || height < MIN_DIM || height > MAX_DIM) return json(h, { message: "Validation failed", code: "validation_error" }, 400);
    const admin = adminClient(); const { data: consumed, error: consumeError } = await admin.rpc("consume_billing_credit", { p_user_id: guard.userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: idempotencyKey });
    if (consumeError) { const missing = consumeError.message.includes("commercial_rule_missing"), insufficient = consumeError.message.includes("insufficient_credits"); return json(h, { message: missing ? "Esta operação ainda não possui uma regra comercial configurada." : insufficient ? "Créditos insuficientes para gerar o render." : "Não foi possível autorizar o consumo de créditos.", code: missing ? "commercial_rule_missing" : insufficient ? "insufficient_credits" : "credit_authorization_failed" }, 402); }
    creditConsumed = true;
    const key = Deno.env.get("GOOGLE_GEMINI_API_KEY"); if (!key) { await refund(guard.userId, idempotencyKey); creditConsumed = false; return json(h, { message: "GOOGLE_GEMINI_API_KEY não está configurada.", code: "missing_api_key" }, 500); }
    const parts: Array<Record<string, unknown>> = [{ text: prompt }]; for (const img of images ?? []) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    let response: Response; try { response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${IMAGE_MODEL}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }) }); } catch (error) { await refund(guard.userId, idempotencyKey); creditConsumed = false; console.error("Gemini connection error:", error); return json(h, { message: "Não foi possível conectar ao provedor de imagens.", code: "provider_connection_error" }, 502); }
    if (!response.ok) { await refund(guard.userId, idempotencyKey); creditConsumed = false; const status = response.status; const providerBody = await response.text(); console.error("Gemini image error:", status, providerBody); return json(h, { message: status === 429 ? "Rate limit do provedor de imagens. Tente novamente em alguns segundos." : "O provedor de imagens está indisponível no momento.", code: status === 429 ? "rate_limited" : "upstream_error" }, status === 429 ? 429 : 502, status === 429 ? { "Retry-After": "10" } : {}); }
    let data: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string }; text?: string }> } }> }; try { data = await response.json(); } catch { await refund(guard.userId, idempotencyKey); creditConsumed = false; return json(h, { message: "Resposta inválida do provedor de imagens.", code: "invalid_provider_response" }, 502); }
    const candidate = data.candidates?.[0]?.content?.parts ?? []; let imageUrl: string | null = null; let text: string | null = null;
    for (const part of candidate) { const inline = part.inlineData || part.inline_data; if (inline?.data) imageUrl = `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`; if (part.text) text = part.text; }
    if (!imageUrl) { await refund(guard.userId, idempotencyKey); creditConsumed = false; return json(h, { message: "O provedor não retornou uma imagem.", code: "empty_image_result" }, 502); }
    return json(h, { imageUrl, text, width, height, operationType: OPERATION_TYPE, model: IMAGE_MODEL, creditConsumption: Array.isArray(consumed) ? consumed[0] : consumed, promptStats: { wordCount, charCount: prompt.length, tokenEstimate: Math.ceil(prompt.length / 4) } });
  } catch (e) {
    if (creditConsumed && idempotencyKey) { try { await refund(guard.userId, idempotencyKey); } catch (refundError) { console.error("ai-image refund error:", refundError); } }
    console.error("ai-image error:", e); return json(h, { message: "Erro interno ao gerar imagem.", code: "internal_error" }, 500);
  }
});
