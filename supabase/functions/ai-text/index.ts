import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MAX_PROMPT_CHARS = 12000;
const MAX_IMAGES = 6;
const MAX_IMAGE_BASE64 = 15 * 1024 * 1024;
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "google/gemini-3.7-flash";

const BodySchema = z.object({
  prompt: z.string().trim().min(1, "prompt is required").max(MAX_PROMPT_CHARS),
  images: z.array(z.object({
    mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp|gif)$/i),
    data: z.string().min(1).max(MAX_IMAGE_BASE64),
  })).max(MAX_IMAGES).optional(),
  jsonMode: z.boolean().optional().default(false),
  provider: z.literal("lovable").optional().default("lovable"),
});
type Input = z.infer<typeof BodySchema>;

const callLovable = async (input: Input, apiKey: string) => {
  const content: Array<Record<string, unknown>> = [{ type: "text", text: input.prompt }];
  for (const img of input.images ?? []) {
    content.push({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
  }

  const body: Record<string, unknown> = {
    model: LOVABLE_MODEL,
    messages: [{ role: "user", content }],
  };
  if (input.jsonMode) body.response_format = { type: "json_object" };

  const response = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    console.error("Lovable AI Gateway error:", status, await response.text());
    const error = new Error(status === 402
      ? "Créditos do Lovable AI esgotados."
      : "O serviço Lovable AI está indisponível no momento.");
    (error as Error & { status?: number }).status = status;
    throw error;
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message?.content;
  const text = Array.isArray(message)
    ? message.map((part: { type?: string; text?: string }) => part?.text ?? "").join("")
    : (message ?? "");

  return { text, model: data.model ?? LOVABLE_MODEL, provider: "lovable" };
};

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return jsonResponse(cors, { error: "Method not allowed" }, 405);

  const guard = await guardRequest(req, cors, { fn: "ai-text", limit: 30, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) {
      return read.reason === "too_large"
        ? jsonResponse(cors, { error: "Corpo da requisição muito grande.", code: "payload_too_large" }, 413)
        : jsonResponse(cors, { error: "JSON inválido.", code: "invalid_json" }, 400);
    }

    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) {
      return jsonResponse(cors, {
        error: "Validation failed",
        code: "validation_error",
        fields: parsed.error.flatten().fieldErrors,
      }, 400);
    }

    const input = parsed.data;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return jsonResponse(cors, {
        error: "Serviço Lovable AI não configurado.",
        code: "provider_not_configured",
        provider: "lovable",
      }, 500);
    }

    return jsonResponse(cors, await callLovable(input, lovableKey));
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 429) {
      return jsonResponse(cors, {
        error: "Limite do Lovable AI atingido. Tente novamente em alguns segundos.",
        code: "rate_limited",
      }, 429, { "Retry-After": "10" });
    }
    if (status === 402) {
      return jsonResponse(cors, {
        error: "Créditos do Lovable AI esgotados.",
        code: "credits_exhausted",
      }, 402);
    }
    console.error("ai-text error:", e);
    return jsonResponse(cors, {
      error: e instanceof Error ? e.message : "Erro interno ao processar texto.",
      code: "internal_error",
    }, 500);
  }
});
