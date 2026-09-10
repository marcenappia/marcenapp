import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MAX_PROMPT_CHARS = 12000;
const MAX_IMAGES = 6;
const MAX_IMAGE_BASE64 = 15 * 1024 * 1024;
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "openai/gpt-5.5";

const BodySchema = z.object({
  prompt: z.string().trim().min(1, "prompt is required").max(MAX_PROMPT_CHARS),
  images: z.array(z.object({
    mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp|gif)$/i),
    data: z.string().min(1).max(MAX_IMAGE_BASE64),
  })).max(MAX_IMAGES).optional(),
  jsonMode: z.boolean().optional().default(false),
});

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return jsonResponse(cors, { error: "Method not allowed" }, 405);

  const guard = await guardRequest(req, cors, { fn: "ai-text", limit: 30, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return jsonResponse(cors, { error: "Serviço de IA não configurado.", code: "provider_not_configured", provider: "lovable" }, 500);
    }

    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) {
      return read.reason === "too_large"
        ? jsonResponse(cors, { error: "Corpo da requisição muito grande.", code: "payload_too_large" }, 413)
        : jsonResponse(cors, { error: "JSON inválido.", code: "invalid_json" }, 400);
    }

    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) {
      return jsonResponse(cors, { error: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    }

    const content: Array<Record<string, unknown>> = [{ type: "text", text: parsed.data.prompt }];
    for (const img of parsed.data.images ?? []) {
      content.push({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
    }

    const body: Record<string, unknown> = {
      model: LOVABLE_MODEL,
      messages: [{ role: "user", content }],
    };
    if (parsed.data.jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch(LOVABLE_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("Lovable AI Gateway error:", status, await response.text());
      if (status === 402) return jsonResponse(cors, { error: "Créditos da IA esgotados.", code: "credits_exhausted" }, 402);
      if (status === 429) return jsonResponse(cors, { error: "Limite de uso da IA atingido. Tente novamente em alguns segundos.", code: "rate_limited" }, 429, { "Retry-After": "10" });
      return jsonResponse(cors, { error: "O serviço de IA está indisponível no momento.", code: "upstream_error" }, 502);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;
    const text = Array.isArray(message)
      ? message.map((part: { text?: string }) => part?.text ?? "").join("")
      : (message ?? "");

    return jsonResponse(cors, { text, model: data.model ?? LOVABLE_MODEL, provider: "lovable" });
  } catch (e) {
    console.error("ai-text error:", e);
    return jsonResponse(cors, { error: "Erro interno ao processar texto.", code: "internal_error" }, 500);
  }
});
