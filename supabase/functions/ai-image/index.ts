import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Limits
const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20MB total request body
const MIN_DIM = 64;
const MAX_DIM = 4096;
const DEFAULT_DIM = 1024;
const MAX_PROMPT_CHARS = 4000;
const MAX_PROMPT_WORDS = 800; // ~ token estimate guard

const ImageSchema = z.object({
  mimeType: z
    .string()
    .regex(/^image\/(png|jpeg|jpg|webp|gif)$/i, {
      message: "mimeType must be image/png, image/jpeg, image/webp or image/gif",
    }),
  data: z
    .string()
    .min(1, { message: "image data cannot be empty" })
    .max(15_000_000, { message: "image data exceeds 15MB base64 limit" }),
});

// Allow either width, height, both, or neither — defaults applied later.
const SizeSchema = z
  .object({
    width: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
    height: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
  })
  .optional();

const BodySchema = z.object({
  prompt: z
    .string({ required_error: "prompt is required" })
    .min(1, { message: "prompt is required" }),
  images: z.array(ImageSchema).max(8, { message: "maximum 8 images allowed" }).optional(),
  size: SizeSchema,
});

type ErrorBody = {
  message: string;
  code: string;
  fields?: Record<string, string[]>;
};

function errorResponse(status: number, body: ErrorBody) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function badRequest(body: ErrorBody) {
  return errorResponse(400, body);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_KEY) {
      return errorResponse(500, {
        message: "GOOGLE_GEMINI_API_KEY is not configured",
        code: "missing_api_key",
      });
    }

    // 1. Enforce body size BEFORE parsing JSON.
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength && contentLength > MAX_BODY_BYTES) {
      return errorResponse(413, {
        message: `Request body too large. Max ${MAX_BODY_BYTES} bytes.`,
        code: "payload_too_large",
      });
    }

    // Read as bytes with hard cap (handles missing/incorrect content-length).
    let rawText: string;
    try {
      const reader = req.body?.getReader();
      if (!reader) {
        rawText = "";
      } else {
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            received += value.byteLength;
            if (received > MAX_BODY_BYTES) {
              try { await reader.cancel(); } catch { /* ignore */ }
              return errorResponse(413, {
                message: `Request body too large. Max ${MAX_BODY_BYTES} bytes.`,
                code: "payload_too_large",
              });
            }
            chunks.push(value);
          }
        }
        const merged = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }
        rawText = new TextDecoder().decode(merged);
      }
    } catch {
      return badRequest({ message: "Failed to read request body", code: "body_read_error" });
    }

    // 2. JSON parse.
    let raw: unknown;
    try {
      raw = rawText.length > 0 ? JSON.parse(rawText) : {};
    } catch {
      return badRequest({ message: "Invalid JSON body", code: "invalid_json" });
    }

    // 3. Schema validation.
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      return badRequest({
        message: "Validation failed",
        code: "validation_error",
        fields,
      });
    }

    const { prompt: rawPrompt, images, size } = parsed.data;

    // 4. Prompt: trim, reject whitespace-only, char/word limits.
    const prompt = rawPrompt.trim();
    if (prompt.length === 0) {
      return badRequest({
        message: "Validation failed",
        code: "validation_error",
        fields: { prompt: ["prompt cannot be empty or whitespace only"] },
      });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return badRequest({
        message: "Validation failed",
        code: "validation_error",
        fields: { prompt: [`prompt must be ${MAX_PROMPT_CHARS} characters or fewer`] },
      });
    }
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount > MAX_PROMPT_WORDS) {
      return badRequest({
        message: "Validation failed",
        code: "validation_error",
        fields: { prompt: [`prompt must be ${MAX_PROMPT_WORDS} words or fewer (got ${wordCount})`] },
      });
    }

    // 5. Size: default missing dimension; re-check bounds for safety.
    let width = DEFAULT_DIM;
    let height = DEFAULT_DIM;
    if (size) {
      if (size.width !== undefined || size.height !== undefined) {
        width = size.width ?? size.height ?? DEFAULT_DIM;
        height = size.height ?? size.width ?? DEFAULT_DIM;
      }
      
      if (width < MIN_DIM || width > MAX_DIM || height < MIN_DIM || height > MAX_DIM) {
        return badRequest({
          message: "Validation failed",
          code: "validation_error",
          fields: { size: [`width and height must be between ${MIN_DIM} and ${MAX_DIM}`] },
        });
      }
    }

    const parts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
      for (const img of images) {
        parts.push({
          inlineData: { mimeType: img.mimeType, data: img.data }
        });
      }
    }

    const model = "gemini-2.5-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

    const body: Record<string, any> = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        ...(width && height ? { image_config: { width, height } } : {}),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const status = response.status;
      const errBody = await response.text();
      console.error("Gemini API error:", status, errBody);
      if (status === 429) {
        return errorResponse(429, {
          message: "Rate limit exceeded. Tente novamente em alguns segundos.",
          code: "rate_limited",
        });
      }
      return errorResponse(502, {
        message: `Gemini error: ${status}`,
        code: "upstream_error",
      });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts;

    let imageUrl: string | null = null;
    let text: string | null = null;

    if (candidate) {
      for (const part of candidate) {
        const inline = part.inlineData || part.inline_data;
        if (inline) {
          const mime = inline.mimeType || inline.mime_type;
          imageUrl = `data:${mime};base64,${inline.data}`;
        }
        if (part.text) {
          text = part.text;
        }
      }
    }

    return new Response(JSON.stringify({ imageUrl, text, width, height }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-image error:", e);
    return errorResponse(500, {
      message: e instanceof Error ? e.message : "Unknown error",
      code: "internal_error",
    });
  }
});
