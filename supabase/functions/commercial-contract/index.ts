import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 64 * 1024;
const BodySchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  idempotencyKey: z.string().trim().min(8).max(200),
});
const OPERATION_TYPE = "gerarContrato";

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server_config_incomplete");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function refund(userId: string, idempotencyKey: string) {
  const admin = adminClient();
  await admin.rpc("refund_billing_credit", {
    p_user_id: userId,
    p_operation_type: OPERATION_TYPE,
    p_idempotency_key: idempotencyKey,
  });
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return jsonResponse(cors, { error: "Method not allowed" }, 405);

  const guard = await guardRequest(req, cors, { fn: "commercial-contract", limit: 10, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) return jsonResponse(cors, { error: read.reason === "too_large" ? "Corpo da requisição muito grande." : "JSON inválido.", code: read.reason === "too_large" ? "payload_too_large" : "invalid_json" }, read.reason === "too_large" ? 413 : 400);
    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) return jsonResponse(cors, { error: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);

    const { prompt, idempotencyKey } = parsed.data;
    const admin = adminClient();
    const { data: consumed, error: consumeError } = await admin.rpc("consume_billing_credit", {
      p_user_id: guard.userId,
      p_operation_type: OPERATION_TYPE,
      p_idempotency_key: idempotencyKey,
    });
    if (consumeError) {
      const message = consumeError.message.includes("commercial_rule_missing")
        ? "Esta operação ainda não possui uma regra comercial configurada."
        : consumeError.message.includes("insufficient_credits")
          ? "Créditos insuficientes para gerar o contrato."
          : "Não foi possível autorizar o consumo de créditos.";
      return jsonResponse(cors, { error: message, code: consumeError.message.includes("commercial_rule_missing") ? "commercial_rule_missing" : consumeError.message.includes("insufficient_credits") ? "insufficient_credits" : "credit_authorization_failed" }, 402);
    }

    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_KEY) {
      await refund(guard.userId, idempotencyKey);
      return jsonResponse(cors, { error: "Serviço de IA não configurado.", code: "missing_api_key" }, 500);
    }

    const model = "gemini-3.8-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `Prepare uma cláusula contratual curta e objetiva para um contrato de marcenaria sobre: "${prompt}". Use português formal. Não apresente aconselhamento jurídico e não afirme que o texto substitui revisão profissional.` }] }] }),
    });

    if (!response.ok) {
      await refund(guard.userId, idempotencyKey);
      const status = response.status === 429 ? 429 : 502;
      return jsonResponse(cors, { error: response.status === 429 ? "Limite do provedor de IA atingido." : "O serviço de IA está indisponível.", code: response.status === 429 ? "rate_limited" : "upstream_error" }, status, response.status === 429 ? { "Retry-After": "10" } : {});
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim() ?? "";
    if (!text) {
      await refund(guard.userId, idempotencyKey);
      return jsonResponse(cors, { error: "A IA não retornou uma cláusula.", code: "empty_ai_result" }, 502);
    }

    const { data: inserted, error: insertError } = await admin.from("custom_clauses").insert({
      user_id: guard.userId,
      clause_text: text,
      prompt,
    }).select("id").single();
    if (insertError || !inserted) {
      await refund(guard.userId, idempotencyKey);
      return jsonResponse(cors, { error: "Não foi possível persistir a cláusula.", code: "persistence_failed" }, 500);
    }

    return jsonResponse(cors, { id: inserted.id, text, model, operationType: OPERATION_TYPE, creditConsumption: Array.isArray(consumed) ? consumed[0] : consumed });
  } catch (e) {
    console.error("commercial-contract error:", e);
    return jsonResponse(cors, { error: "Erro interno ao gerar contrato.", code: "internal_error" }, 500);
  }
});
