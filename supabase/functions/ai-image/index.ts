import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MIN_DIM = 64;
const MAX_DIM = 4096;
const DEFAULT_DIM = 1024;
const MAX_PROMPT_CHARS = 4000;
const MAX_PROMPT_WORDS = 800;
const MAX_IMAGES = 8;
const MAX_IMAGE_BASE64 = 15_000_000;
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "google/gemini-2.5-flash-image";

const ImageSchema = z.object({
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp|gif)$/i),
  data: z.string().min(1).max(MAX_IMAGE_BASE64),
});
const SizeSchema = z.object({
  width: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
  height: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
}).optional();
const BodySchema = z.object({
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
  images: z.array(ImageSchema).max(MAX_IMAGES).optional(),
  size: SizeSchema,
});

type ErrorBody = { message: string; code: string; fields?: Record<string, string[]> };

const errorResponse = (cors: Record<string, string>, status: number, body: ErrorBody) =>
  jsonResponse(cors, body, status);

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return errorResponse(cors, 405, { message: "Method not allowed", code: "method_not_allowed" });

  const guard = await guardRequest(req, cors, { fn: "ai-image", limit: 10, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return errorResponse(cors, 500, {
        message: "Serviço Lovable AI não configurado.",
        code: "provider_not_configured",
        fields: { provider: ["lovable"] },
      });
    }

    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) {
      return errorResponse(cors, read.reason === "too_large" ? 413 : 400, {
        message: read.reason === "too_large" ? "Request body too large." : "Invalid JSON body",
        code: read.reason === "too_large" ? "payload_too_large" : "invalid_json",
      });
    }

    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) {
      return errorResponse(cors, 400, {
        message: "Validation failed",
        code: "validation_error",
        fields: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
    }

    const { prompt: rawPrompt, images, size } = parsed.data;
    const isWhitespaceTrimmed = rawPrompt !== rawPrompt.trim();
    const prompt = rawPrompt.trim();
    if (!prompt) {
      return errorResponse(cors, 400, {
        message: "Validation failed",
        code: "validation_error",
        fields: { prompt: ["prompt cannot be empty or whitespace only"] },
      });
    }

    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount > MAX_PROMPT_WORDS) {
      return errorResponse(cors, 400, {
        message: "Validation failed",
        code: "validation_error",
        fields: { prompt: [`prompt must be ${MAX_PROMPT_WORDS} words or fewer (got ${wordCount})`] },
      });
    }

    let width = DEFAULT_DIM;
    let height = DEFAULT_DIM;
    if (size && (size.width !== undefined || size.height !== undefined)) {
      width = size.width ?? size.height ?? DEFAULT_DIM;
      height = size.height ?? size.width ?? DEFAULT_DIM;
    }

    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    for (const img of images ?? []) {
      content.push({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
    }

    const response = await fetch(LOVABLE_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: LOVABLE_MODEL,
        messages: [{ role: "user", content }],
        modalities: ["text", "image"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("Lovable image gateway error:", status, await response.text());
      if (status === 429) {
        return errorResponse(cors, 429, { message: "Limite do Lovable AI atingido. Tente novamente em alguns segundos.", code: "rate_limited" });
      }
      if (status === 402) {
        return errorResponse(cors, 402, { message: "Créditos do Lovable AI esgotados.", code: "credits_exhausted" });
      }
      return errorResponse(cors, 502, { message: "O serviço Lovable AI está indisponível no momento.", code: "upstream_error" });
    }

    const data = await response.json();
    const parts = data.choices?.[0]?.message?.content;
    let imageUrl: string | null = null;
    let text: string | null = null;

    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (part?.type === "text" && part.text) text = part.text;
        const image = part?.image_url?.url ?? part?.image?.url ?? part?.inlineData?.data ?? part?.inline_data?.data;
        if (image) {
          const mime = part?.inlineData?.mimeType ?? part?.inline_data?.mime_type ?? "image/png";
          imageUrl = String(image).startsWith("data:") ? String(image) : `data:${mime};base64,${image}`;
        }
      }
    } else if (typeof parts === "string") {
      text = parts;
    }

    return jsonResponse(cors, {
      imageUrl,
      text,
      width,
      height,
      provider: "lovable",
      model: data.model ?? LOVABLE_MODEL,
      promptStats: {
        wordCount,
        charCount: prompt.length,
        tokenEstimate: Math.ceil(prompt.length / 4),
        tokenFormula: "Math.ceil(charCount / 4)",
        normalization: { whitespaceTrimmed: isWhitespaceTrimmed, truncated: false },
        thresholds: { maxChars: MAX_PROMPT_CHARS, maxWords: MAX_PROMPT_WORDS, minDimension: MIN_DIM, maxDimension: MAX_DIM, defaultDimension: DEFAULT_DIM },
      },
    });
  } catch (e) {
    console.error("ai-image error:", e);
    return errorResponse(cors, 500, { message: "Erro interno ao gerar imagem.", code: "internal_error" });
  }
});
