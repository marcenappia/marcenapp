import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";
import { resolveProvider, type AIProvider } from "../_shared/provider.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MIN_DIM = 64;
const MAX_DIM = 4096;
const DEFAULT_DIM = 1024;
const MAX_PROMPT_CHARS = 4000;
const MAX_PROMPT_WORDS = 800;
const OPERATION_TYPE = "gerarRender";
const LOVABLE_IMAGE_MODEL = "openai/gpt-image-2";
const LOVABLE_GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
const GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1/models";

const ImageSchema = z.object({
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/i),
  data: z.string().min(1).max(15_000_000),
});
const GenerateBodySchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_CHARS),
  images: z.array(ImageSchema).max(8).optional(),
  size: z.object({
    width: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
    height: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
  }).optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
});
const PersistenceSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  environmentId: z.string().uuid().nullable().optional(),
  versionId: z.string().uuid().nullable().optional(),
  correlationId: z.string().trim().max(200).nullable().optional(),
  generation: z.number().int().nullable().optional(),
});
const BodySchema = GenerateBodySchema.extend({
  persistGallery: PersistenceSchema.optional(),
});

type ImageInput = z.infer<typeof ImageSchema>;
type GatewayError = Error & { status?: number; retryAfter?: string };

function imageExtension(mimeType: string): string {
  if (/jpeg|jpg/i.test(mimeType)) return "jpg";
  if (/webp/i.test(mimeType)) return "webp";
  return "png";
}

function imageBlob(image: ImageInput): Blob {
  const binary = atob(image.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: image.mimeType });
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("Retry-After"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 10_000);
  return Math.min(750 * (2 ** attempt) + Math.floor(Math.random() * 250), 5_000);
}

async function gatewayFetch(url: string, init: RequestInit): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(url, init);
    if (response.ok || (response.status !== 429 && response.status < 500)) return response;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, retryDelay(response as Response, attempt)));
  }
  return response as Response;
}

async function readBufferedImage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  } | null;
  const image = body?.data?.[0];
  if (image?.b64_json) {
    const value = image.b64_json.trim();
    if (!value) throw new Error("empty_image_result");
    return value.startsWith("data:image/") ? value : `data:image/png;base64,${value}`;
  }
  if (image?.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) throw new Error(`provider_image_download:${imageResponse.status}`);
    const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "image/png";
    const bytes = new Uint8Array(await imageResponse.arrayBuffer());
    if (!bytes.length) throw new Error("empty_image_result");
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  }
  throw new Error("empty_image_result");
}

function gatewayError(response: Response, body: string): GatewayError {
  let safeMessage = "O provedor de imagens recusou a solicitação.";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    safeMessage = parsed.error?.message ?? parsed.message ?? safeMessage;
  } catch { /* Keep the safe default. */ }
  const error = new Error(safeMessage) as GatewayError;
  error.status = response.status;
  error.retryAfter = response.headers.get("Retry-After") ?? undefined;
  return error;
}

async function requestGateway(prompt: string, images: ImageInput[], size?: { width?: number; height?: number }): Promise<Response> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("provider_not_configured");

  const headers = {
    Authorization: `Bearer ${key}`,
    "Lovable-API-Key": key,
    "X-Lovable-AIG-SDK": "fetch",
  };

  const width = size?.width ?? size?.height ?? DEFAULT_DIM;
  const height = size?.height ?? size?.width ?? DEFAULT_DIM;
  const sizeValue = `${width}x${height}`;

  if (images.length > 0) {
    const form = new FormData();
    form.set("model", LOVABLE_IMAGE_MODEL);
    form.set("prompt", prompt);
    form.set("size", sizeValue);
    images.forEach((image, index) => {
      form.append(images.length === 1 ? "image" : "image[]", imageBlob(image), `reference-${index}.${imageExtension(image.mimeType)}`);
    });
    return gatewayFetch(`${LOVABLE_GATEWAY_BASE_URL}/images/edits`, {
      method: "POST",
      headers,
      body: form,
    });
  }

  return gatewayFetch(`${LOVABLE_GATEWAY_BASE_URL}/images/generations`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LOVABLE_IMAGE_MODEL,
      prompt,
      size: sizeValue,
      n: 1,
    }),
  });
}

async function generateLovableImage(prompt: string, images: ImageInput[], size?: { width?: number; height?: number }): Promise<string> {
  const response = await requestGateway(prompt, images, size);
  if (!response.ok) throw gatewayError(response, await response.text());
  return readBufferedImage(response);
}

async function generateGeminiImage(prompt: string, images: ImageInput[]): Promise<string> {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!key) throw new Error("provider_not_configured:gemini");

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const image of images) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  const response = await fetch(`${GEMINI_GENERATE_URL}/${GEMINI_IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = gatewayError(response, body);
    throw new Error(`gemini_http_${error.status ?? response.status}:${error.message}`);
  }

  const body = await response.json().catch(() => null) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
  } | null;

  const imagePart = body?.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) throw new Error("gemini_empty_image_result");

  return `data:${imagePart.inlineData.mimeType ?? "image/png"};base64,${imagePart.inlineData.data}`;
}

async function generateImage(
  provider: AIProvider,
  prompt: string,
  images: ImageInput[],
  size?: { width?: number; height?: number },
): Promise<string> {
  if (provider === "gemini") return generateGeminiImage(prompt, images);
  return generateLovableImage(prompt, images, size);
}

async function refund(userId: string, idempotencyKey: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("billing_refund_configuration_missing");
  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await admin.rpc("refund_billing_credit", { p_user_id: userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: idempotencyKey });
    if (!error) return;
    lastError = error;
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`billing_refund_failed:${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

serve(async request => {
  const cors = buildCorsHeaders(request);
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return jsonResponse(cors, { message: "Método não permitido.", code: "method_not_allowed" }, 405);

  const guard = await guardRequest(request, cors, { fn: "ai-image", limit: 10, windowSeconds: 60 });
  if (!guard.ok) return guard.response;
  let creditConsumed = false;
  let imageGenerated = false;
  let idempotencyKey = "";
  try {
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    if (!body.ok) return jsonResponse(cors, { message: body.reason === "too_large" ? "Corpo da solicitação muito grande." : "JSON inválido.", code: body.reason === "too_large" ? "payload_too_large" : "invalid_json" }, body.reason === "too_large" ? 413 : 400);
    const parsed = BodySchema.safeParse(body.body);
    if (!parsed.success) return jsonResponse(cors, { message: "Dados inválidos.", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    const { prompt, images = [], size, persistGallery } = parsed.data;
    idempotencyKey = parsed.data.idempotencyKey;
    console.info("[AI_IMAGE_START]", JSON.stringify({ status: "started", requestId: idempotencyKey, renderId: idempotencyKey, referenceCount: images.length }));
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount > MAX_PROMPT_WORDS) return jsonResponse(cors, { message: "O pedido é muito longo.", code: "validation_error" }, 400);
    const width = size?.width ?? size?.height ?? DEFAULT_DIM;
    const height = size?.height ?? size?.width ?? DEFAULT_DIM;

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jsonResponse(cors, { message: "Configuração do servidor incompleta.", code: "server_config_incomplete" }, 500);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const consumed = await admin.rpc("consume_billing_credit", { p_user_id: guard.userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: idempotencyKey });
    if (consumed.error) {
      const missing = consumed.error.message.includes("commercial_rule_missing");
      const insufficient = consumed.error.message.includes("insufficient_credits");
      console.error("ai-image credit authorization failed", consumed.error.message);
      return jsonResponse(cors, { message: missing ? "Esta operação ainda não possui uma regra comercial configurada." : insufficient ? "Créditos insuficientes para gerar o render." : "Não foi possível autorizar o consumo de créditos.", code: missing ? "commercial_rule_missing" : insufficient ? "insufficient_credits" : "credit_authorization_failed" }, 402);
    }
    const data: unknown = consumed.data;
    const consumption = Array.isArray(data) ? data[0] : data;
    if (!consumption || typeof consumption !== "object" || (consumption as { status?: unknown }).status !== "consumed") {
      throw new Error("credit_already_refunded");
    }
    creditConsumed = true;
    const resolution = await resolveProvider(guard.userId);
    const providers: AIProvider[] = [resolution.primary];
    let imageBase64 = "";
    let usedProvider: AIProvider | null = null;
    let usedModel = "";
    let lastProviderError: unknown = null;

    for (const provider of providers) {
      const providerStartedAt = Date.now();
      console.info("[PROVIDER_SELECTION]", JSON.stringify({
        status: "selected",
        provider,
        requestId: idempotencyKey,
        renderId: idempotencyKey,
      }));
      try {
        console.info("[UPSTREAM_REQUEST]", JSON.stringify({
          status: "started",
          provider,
          requestId: idempotencyKey,
          renderId: idempotencyKey,
        }));
        imageBase64 = await generateImage(provider, prompt, images, size);
        imageGenerated = true;
        usedProvider = provider;
        usedModel = provider === "gemini" ? GEMINI_IMAGE_MODEL : LOVABLE_IMAGE_MODEL;
        console.info("[UPSTREAM_RESPONSE]", JSON.stringify({
          status: "success",
          provider,
          durationMs: Date.now() - providerStartedAt,
          requestId: idempotencyKey,
          renderId: idempotencyKey,
        }));
        console.info("[IMAGE_RECEIVED]", JSON.stringify({
          status: "success",
          provider,
          durationMs: Date.now() - providerStartedAt,
          requestId: idempotencyKey,
          renderId: idempotencyKey,
        }));
        break;
      } catch (providerError) {
        lastProviderError = providerError;
        console.error("[UPSTREAM_RESPONSE]", JSON.stringify({
          status: "error",
          provider,
          durationMs: Date.now() - providerStartedAt,
          requestId: idempotencyKey,
          renderId: idempotencyKey,
          error: providerError instanceof Error ? providerError.message : String(providerError),
        }));
      }
    }

    if (!imageBase64) {
      throw lastProviderError instanceof Error ? lastProviderError : new Error("provider_not_configured");
    }

    let persisted = false;
    if (persistGallery) {
      try {
        const { data: context, error: contextError } = await admin
          .from("project_iara_contexts")
          .select("project_id,environment_id,version_id,last_correlation_id,last_execution_generation")
          .eq("user_id", guard.userId)
          .eq("project_id", persistGallery.projectId ?? "")
          .limit(1)
          .maybeSingle();

        if (contextError) throw new Error("iara_context_read_failed");
        const contextMatches =
          !!context &&
          context.environment_id === (persistGallery.environmentId ?? null) &&
          context.version_id === (persistGallery.versionId ?? null) &&
          (!persistGallery.correlationId || context.last_correlation_id === persistGallery.correlationId) &&
          (persistGallery.generation == null || context.last_execution_generation === persistGallery.generation);
        if (!contextMatches) throw new Error("stale_execution_context");

        const { error: galleryError } = await admin.from("gallery_images").insert({
          user_id: guard.userId,
          image_url: imageBase64,
          prompt,
          project_id: persistGallery.projectId ?? null,
          environment_id: persistGallery.environmentId ?? null,
          version_id: persistGallery.versionId ?? null,
          correlation_id: persistGallery.correlationId ?? null,
          execution_generation: persistGallery.generation ?? null,
        });
        if (galleryError) throw new Error(`gallery_persist_failed:${galleryError.message}`);
        persisted = true;
        console.info("[DATABASE_WRITE]", JSON.stringify({ status: "success", provider: usedProvider, model: usedModel, requestId: idempotencyKey, renderId: idempotencyKey }));
      } catch (persistenceError) {
        console.error("[DATABASE_WRITE]", JSON.stringify({ status: "error", provider: usedProvider, model: usedModel, requestId: idempotencyKey, renderId: idempotencyKey, error: persistenceError instanceof Error ? persistenceError.message : String(persistenceError) }));
      }
    }

    console.info("[IMAGE_RETURN]", JSON.stringify({ status: "success", provider: usedProvider, model: usedModel, persisted, requestId: idempotencyKey, renderId: idempotencyKey }));
    return jsonResponse(cors, { imageBase64, imageUrl: imageBase64, width, height, operationType: OPERATION_TYPE, model: usedModel, provider: usedProvider, requestId: idempotencyKey, renderId: idempotencyKey, creditConsumption: Array.isArray(data) ? data[0] : data, persisted, promptStats: { wordCount, charCount: prompt.length, tokenEstimate: Math.ceil(prompt.length / 4) } });
  } catch (caught) {
    if (creditConsumed && !imageGenerated && idempotencyKey) await refund(guard.userId, idempotencyKey).catch(error => console.error("ai-image refund error", error));
    const error = caught as GatewayError;
    console.error("ai-image error", error.message);
    if (error.message === "stale_execution_context") return jsonResponse(cors, { message: "A execução do render ficou desatualizada antes da persistência.", code: "stale_execution_context" }, 409);
    if (error.message === "iara_context_read_failed") return jsonResponse(cors, { message: "Não foi possível validar o contexto atual do render.", code: "iara_context_read_failed" }, 500);
    if (error.message.startsWith("gallery_persist_failed:")) return jsonResponse(cors, { message: "Não foi possível salvar o render na galeria.", code: "gallery_persist_failed" }, 500);
    if (error.message === "credit_already_refunded") return jsonResponse(cors, { message: "Esta operação já foi estornada e não pode ser reutilizada.", code: "credit_already_refunded" }, 409);
    if (error.message === "provider_not_configured" || error.message === "PROVIDER_NOT_CONFIGURED") return jsonResponse(cors, { message: "Nenhum provider de imagem operacional está configurado nesta publicação.", code: "provider_not_configured", requestId: idempotencyKey, renderId: idempotencyKey }, 503);
    if (error.status === 400) return jsonResponse(cors, { message: error.message, code: "invalid_image_request" }, 400);
    if (error.status === 401) return jsonResponse(cors, { message: "A chave do serviço de IA não está configurada corretamente.", code: "provider_auth_error" }, 401);
    if (error.status === 402) return jsonResponse(cors, { message: error.message, code: "provider_credits_exhausted" }, 402);
    if (error.status === 403) return jsonResponse(cors, { message: error.message, code: "provider_access_denied" }, 403);
    if (error.status === 429) return jsonResponse(cors, { message: error.message, code: "rate_limited" }, 429, error.retryAfter ? { "Retry-After": error.retryAfter } : {});
    return jsonResponse(cors, { message: error.message.startsWith("provider_stream:") ? error.message.slice(16) : "O provedor de imagens está indisponível no momento.", code: "upstream_error" }, 502);
  }
});
