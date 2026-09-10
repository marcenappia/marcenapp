import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20MB (imagens base64 para análise)
const MAX_PROMPT_CHARS = 12000;
const MAX_IMAGES = 6;
const MAX_IMAGE_BASE64 = 15 * 1024 * 1024;

const BodySchema = z.object({
  prompt: z.string().trim().min(1, "prompt is required").max(MAX_PROMPT_CHARS),
  images: z
    .array(
      z.object({
        mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp|gif)$/i),
        data: z.string().min(1).max(MAX_IMAGE_BASE64),
      }),
    )
    .max(MAX_IMAGES)
    .optional(),
  jsonMode: z.boolean().optional().default(false),
});

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return jsonResponse(cors, { error: "Method not allowed" }, 405);

  // Autenticação + rate limit por usuário (30 chamadas/min).
  const guard = await guardRequest(req, cors, { fn: "ai-text", limit: 30, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_KEY) {
      console.error("ai-text: GOOGLE_GEMINI_API_KEY não configurada");
      return jsonResponse(cors, { error: "Serviço de IA não configurado." }, 500);
    }

    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) {
      return read.reason === "too_large"
        ? jsonResponse(cors, { error: "Corpo da requisição muito grande.", code: "payload_too_large" }, 413)
        : jsonResponse(cors, { error: "JSON inválido.", code: "invalid_json" }, 400);
    }

    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) {
      return jsonResponse(
        cors,
        { error: "Validation failed", code: "validation_error", fields: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const { prompt, images, jsonMode } = parsed.data;

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    for (const img of images ?? []) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
    }

    const model = "gemini-3.8-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

    const body: Record<string, unknown> = { contents: [{ role: "user", parts }] };
    if (jsonMode) body.generationConfig = { responseMimeType: "application/json" };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("Gemini API error:", status, await response.text());
      if (status === 429) {
        return jsonResponse(cors, { error: "Limite do provedor de IA atingido. Tente novamente em alguns segundos.", code: "rate_limited" }, 429, { "Retry-After": "10" });
      }
      return jsonResponse(cors, { error: "O serviço de IA está indisponível no momento.", code: "upstream_error" }, 502);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return jsonResponse(cors, { text, model });
  } catch (e) {
    console.error("ai-text error:", e);
    return jsonResponse(cors, { error: "Erro interno ao processar texto.", code: "internal_error" }, 500);
  }
});
