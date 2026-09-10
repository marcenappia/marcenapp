import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const MAX_BODY_BYTES = 64 * 1024;
const OPERATION_TYPE = "gerarContrato";
const BodySchema = z.object({ prompt: z.string().trim().min(1).max(4000), idempotencyKey: z.string().trim().min(8).max(200) });
const allowedSuffixes = [".lovable.app", ".lovableproject.com", ".lovable.dev"];
const cors = (req: Request) => {
  const origin = req.headers.get("origin");
  let allowed = "null";
  try {
    if (origin) {
      const u = new URL(origin);
      const extras = [Deno.env.get("ALLOWED_ORIGINS") ?? "", Deno.env.get("APP_URL") ?? "", Deno.env.get("PUBLIC_APP_URL") ?? ""].flatMap(v => v.split(",")).map(v => v.trim().replace(/\/$/, "")).filter(Boolean);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || extras.includes(origin.replace(/\/$/, "")) || (u.protocol === "https:" && allowedSuffixes.some(s => u.hostname.endsWith(s)))) allowed = origin;
    }
  } catch {}
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
};
const json = (h: Record<string,string>, body: unknown, status = 200, extra: Record<string,string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...h, ...extra, "Content-Type": "application/json" } });
const adminClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server_config_incomplete");
  return createClient(url, key, { auth: { persistSession: false } });
};
async function guardRequest(req: Request, h: Record<string,string>) {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false as const, response: json(h, { error: "Autenticação necessária." }, 401) };
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, response: json(h, { error: "Sessão inválida ou expirada." }, 401) };
  const { data: rl, error: rlError } = await admin.rpc("consume_ai_rate_limit", { _user_id: data.user.id, _fn: "commercial-contract", _limit: 10, _window_seconds: 60 });
  if (rlError) return { ok: false as const, response: json(h, { error: "Não foi possível validar o limite de uso da IA.", code: "rate_limit_unavailable" }, 503, { "Retry-After": "10" }) };
  const row = Array.isArray(rl) ? rl[0] : rl;
  if (!row || row.allowed === false) return { ok: false as const, response: json(h, { error: "Limite de uso atingido.", retryAfterSeconds: Math.max(1, Number(row?.retry_after_seconds ?? 60)) }, 429) };
  return { ok: true as const, userId: data.user.id };
}
async function refund(userId: string, idempotencyKey: string) {
  await adminClient().rpc("refund_billing_credit", { p_user_id: userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: idempotencyKey });
}
serve(async req => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return json(h, { error: "Method not allowed" }, 405);
  const guard = await guardRequest(req, h);
  if (!guard.ok) return guard.response;
  try {
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > MAX_BODY_BYTES) return json(h, { error: "Corpo da requisição muito grande.", code: "payload_too_large" }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json(h, { error: "Corpo da requisição muito grande.", code: "payload_too_large" }, 413);
    let body: unknown;
    try { body = JSON.parse(raw || "{}"); } catch { return json(h, { error: "JSON inválido.", code: "invalid_json" }, 400); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json(h, { error: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    const { prompt, idempotencyKey } = parsed.data;
    const admin = adminClient();
    const { data: consumed, error: consumeError } = await admin.rpc("consume_billing_credit", { p_user_id: guard.userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: idempotencyKey });
    if (consumeError) {
      const missing = consumeError.message.includes("commercial_rule_missing");
      const insufficient = consumeError.message.includes("insufficient_credits");
      return json(h, { error: missing ? "Esta operação ainda não possui uma regra comercial configurada." : insufficient ? "Créditos insuficientes para gerar o contrato." : "Não foi possível autorizar o consumo de créditos.", code: missing ? "commercial_rule_missing" : insufficient ? "insufficient_credits" : "credit_authorization_failed" }, 402);
    }
    const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!key) { await refund(guard.userId, idempotencyKey); return json(h, { error: "Serviço de IA não configurado.", code: "missing_api_key" }, 500); }
    const model = "gemini-3.8-flash";
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `Prepare uma cláusula contratual curta e objetiva para um contrato de marcenaria sobre: \"${prompt}\". Use português formal. Não apresente aconselhamento jurídico e não afirme que o texto substitui revisão profissional.` }] }] }) });
    if (!upstream.ok) { await refund(guard.userId, idempotencyKey); return json(h, { error: upstream.status === 429 ? "Limite do provedor de IA atingido." : "O serviço de IA está indisponível.", code: upstream.status === 429 ? "rate_limited" : "upstream_error" }, upstream.status === 429 ? 429 : 502); }
    const data = await upstream.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim() ?? "";
    if (!text) { await refund(guard.userId, idempotencyKey); return json(h, { error: "A IA não retornou uma cláusula.", code: "empty_ai_result" }, 502); }
    const { data: inserted, error: insertError } = await admin.from("custom_clauses").insert({ user_id: guard.userId, clause_text: text, prompt }).select("id").single();
    if (insertError || !inserted) { await refund(guard.userId, idempotencyKey); return json(h, { error: "Não foi possível persistir a cláusula.", code: "persistence_failed" }, 500); }
    return json(h, { id: inserted.id, text, model, operationType: OPERATION_TYPE, creditConsumption: Array.isArray(consumed) ? consumed[0] : consumed });
  } catch (e) {
    console.error("commercial-contract error:", e);
    return json(h, { error: "Erro interno ao gerar contrato.", code: "internal_error" }, 500);
  }
});
