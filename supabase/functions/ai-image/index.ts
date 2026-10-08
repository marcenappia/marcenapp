import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "./guard.ts";
import { resolveProvider, type AIProvider } from "./provider.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MIN_DIM = 64;
const MAX_DIM = 4096;
const DEFAULT_DIM = 1024;
const MAX_PROMPT_CHARS = 4000;
const MAX_PROMPT_WORDS = 800;
const OPERATION_TYPE = "gerarRender";

function buildRenderPrompt(prompt: string, hasReferenceImage: boolean): string {
  if (!hasReferenceImage) return prompt;
  return [
    "RENDER DE MARCENARIA FOTORREALISTA — a imagem de referência é a fonte de verdade da cena.",
    "Preserve a arquitetura, enquadramento, proporções, paredes, vãos, piso, teto, iluminação estrutural e elementos existentes que aparecem na referência.",
    "Não invente cômodos, paredes, janelas, portas, eletros ou objetos estruturais que não estejam na referência.",
    "Não altere a posição dos móveis existentes sem que isso seja solicitado explicitamente.",
    "As alterações solicitadas devem ser aplicadas somente ao que foi pedido.",
    "Materiais devem ter aparência física plausível: MDF, madeira, pedra, vidro, metal, ferragens, reflexos e sombras coerentes com a iluminação da cena.",
    "Evite aparência de ilustração, 3D genérico, showroom artificial, objetos flutuando, geometria impossível ou proporções irreais.",
    "Resultado final: fotografia de ambiente realista, com escala humana e construção fisicamente plausível.",
    "",
    "INSTRUÇÃO DO USUÁRIO:",
    prompt,
  ].join("\\n");
}
const LOVABLE_IMAGE_MODEL = "openai/gpt-image-2";
const LOVABLE_GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
const VERCEL_IMAGE_MODEL = Deno.env.get("VERCEL_AI_IMAGE_MODEL") ?? "openai/gpt-image-2.5-sunburst";
// Image output (responseModalities) is documented on v1beta for Gemini image models.
const GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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

async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, code = "provider_timeout"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(code)), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readBufferedImage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  } | null;
  const image = body?.data?.[0];
  if (typeof image?.b64_json === "string") {
    const value = image.b64_json.trim();
    if (!value) throw new Error("empty_image_result");
    const dataUrl = value.startsWith("data:image/") ? value : `data:image/png;base64,${value}`;
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(dataUrl)) throw new Error("invalid_image_result");
    return dataUrl;
  }
  if (image?.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) throw new Error(`provider_image_download:${imageResponse.status}`);
    const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "image/png";
    if (!/^image\/(png|jpeg|webp)$/i.test(contentType)) throw new Error("invalid_image_result");
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

async function generateLovableImage(prompt: string, images: ImageInput[], size?: { width?: number; height?: number }): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("provider_not_configured");

  const width = size?.width ?? size?.height ?? DEFAULT_DIM;
  const height = size?.height ?? size?.width ?? DEFAULT_DIM;
  const sizeValue = `${width}x${height}`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const OpenAI = (await import("npm:openai@7.17.0")).default;
      const client = new OpenAI({
        apiKey: key,
        baseURL: LOVABLE_GATEWAY_BASE_URL,
        defaultHeaders: {
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "tanstack-ai",
        },
      });

      return await withTimeout(async () => {
        if (images.length > 0) {
          const files = images.map((image, index) => {
            const binary = atob(image.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            return new File([bytes], `source-${index}.${imageExtension(image.mimeType)}`, { type: image.mimeType });
          });
          const response = await client.images.edit({
            model: LOVABLE_IMAGE_MODEL,
            prompt,
            image: files.length === 1 ? files[0] : files,
            n: 1,
            size: sizeValue as "1024x1024" | "1536x1024" | "1024x1536" | "auto",
          });
          return readBufferedImage(new Response(JSON.stringify(response)));
        }

        const response = await client.images.generate({
          model: LOVABLE_IMAGE_MODEL,
          prompt,
          n: 1,
          size: sizeValue as "1024x1024" | "1536x1024" | "1024x1536" | "auto",
        });
        return readBufferedImage(new Response(JSON.stringify(response)));
      }, 55_000);
    } catch (error) {
      lastError = error;
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status)
        : undefined;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = message === "provider_timeout" || status === 429 || (Number.isFinite(status) && status >= 500);
      console.error("[LOVABLE_IMAGE_ATTEMPT]", JSON.stringify({ attempt: attempt + 1, status: status ?? null, retryable, error: message.slice(0, 300) }));
      if (!retryable || attempt === 1) {
        throw new Error(`lovable_http_${Number.isFinite(status) ? status : "unknown"}:${message.slice(0, 500)}`);
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (attempt + 1), 2000)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("provider_timeout");
}
async function generateVercelImage(prompt: string, images: ImageInput[], size: { width?: number; height?: number } | undefined, authorization: string): Promise<string> {
  const bridgeUrl = Deno.env.get("VERCEL_IMAGE_BRIDGE_URL") ?? "https://marcenapp.com.br/api/ai-image-gateway";
  const width = size?.width ?? size?.height ?? DEFAULT_DIM;
  const height = size?.height ?? size?.width ?? DEFAULT_DIM;

  // Keep billing, idempotency and Storage in Supabase, while image inference
  // runs in Vercel where AI Gateway can authenticate with deployment OIDC.
  if (!authorization) throw new Error("provider_auth_error");

  const response = await withTimeout(() => fetch(bridgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({
      prompt,
      images,
      size: { width, height },
    }),
  }), 55_000);

  const body = await response.json().catch(() => null) as {
    imageBase64?: string;
    code?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    const error = new Error(body?.message ?? "Vercel image gateway request failed.") as GatewayError;
    error.status = response.status;
    throw error;
  }

  if (!body?.imageBase64 || !body.imageBase64.startsWith("data:image/")) {
    throw new Error("empty_image_result");
  }
  return body.imageBase64;
}
async function generateGeminiImage(prompt: string, images: ImageInput[]): Promise<string> {
  // Must match the availability check in _shared/provider.ts, which accepts both names.
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("provider_not_configured:gemini");

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const image of images) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  const response = await withTimeout(() => fetch(`${GEMINI_GENERATE_URL}/${GEMINI_IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  }), 55_000);

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
  size: { width?: number; height?: number } | undefined,
  authorization: string,
): Promise<string> {
  if (provider === "gemini") return generateGeminiImage(prompt, images);
  if (provider === "vercel") return generateVercelImage(prompt, images, size, authorization);
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
  if (request.method === "OPTIONS") { return new Response("ok", { headers: cors }); }
  if (request.method !== "POST") { return jsonResponse(cors, { message: "Método não permitido.", code: "method_not_allowed" }, 405); }

  const guard = await guardRequest(request, cors, { fn: "ai-image", limit: 10, windowSeconds: 60 });
  if (!guard.ok) return guard.response;
  let creditConsumed = false;
  let imageGenerated = false;
  let persisted = false;
  let persistGalleryRequired = false;
  let idempotencyKey = "";
  try {
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    if (!body.ok) return jsonResponse(cors, { message: body.reason === "too_large" ? "Corpo da solicitação muito grande." : "JSON inválido.", code: body.reason === "too_large" ? "payload_too_large" : "invalid_json" }, body.reason === "too_large" ? 413 : 400);
    const parsed = BodySchema.safeParse(body.body);
    if (!parsed.success) return jsonResponse(cors, { message: "Dados inválidos.", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    const { prompt, images = [], size, persistGallery } = parsed.data;\n    const providerPrompt = buildRenderPrompt(prompt, images.length > 0);
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
    if (persistGallery?.projectId && persistGallery.correlationId && persistGallery.generation != null) {
      let replayQuery = admin
        .from("gallery_images")
        .select("image_url,storage_path")
        .eq("user_id", guard.userId)
        .eq("project_id", persistGallery.projectId)
        .eq("correlation_id", persistGallery.correlationId)
        .eq("execution_generation", persistGallery.generation)
        .order("created_at", { ascending: false })
        .limit(1);
      if (persistGallery.environmentId) replayQuery = replayQuery.eq("environment_id", persistGallery.environmentId);
      if (persistGallery.versionId) replayQuery = replayQuery.eq("version_id", persistGallery.versionId);
      const { data: replay, error: replayError } = await replayQuery.maybeSingle();
      if (replayError) throw new Error("render_idempotency_lookup_failed");
      if (typeof replay?.image_url === "string" && replay.image_url) {
        let replayUrl = replay.image_url;
        if (typeof replay.storage_path === "string" && replay.storage_path) {
          const { data: signed } = await admin.storage.from("obras").createSignedUrl(replay.storage_path, 60 * 60 * 24);
          if (signed?.signedUrl) replayUrl = signed.signedUrl;
        }
        console.info("[IDEMPOTENT_RENDER_REPLAY]", JSON.stringify({ status: "reused", requestId: idempotencyKey, renderId: idempotencyKey }));
        return jsonResponse(cors, { imageBase64: replay.image_url, imageUrl: replayUrl, operationType: OPERATION_TYPE, requestId: idempotencyKey, renderId: idempotencyKey, persisted: true, reused: true });
      }
    }
    persistGalleryRequired = Boolean(persistGallery);
    if (persistGalleryRequired) {
      if (!persistGallery?.projectId) throw new Error("gallery_project_required");
      const { data: context, error: contextError } = await admin
        .from("project_iara_contexts")
        .select("project_id,environment_id,version_id,last_correlation_id,last_execution_generation")
        .eq("user_id", guard.userId)
        .eq("project_id", persistGallery.projectId)
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
      console.info("[EXECUTION_CONTEXT_VALIDATED]", JSON.stringify({
        status: "success",
        requestId: idempotencyKey,
        renderId: idempotencyKey,
        projectId: persistGallery.projectId,
        environmentId: persistGallery.environmentId ?? null,
        versionId: persistGallery.versionId ?? null,
        generation: persistGallery.generation ?? null,
      }));
    }

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
    const resolution = await resolveProvider(guard.userId, { requiresReference: images.length > 0 });
    const providers: AIProvider[] = resolution.fallback
      ? [resolution.primary, resolution.fallback]
      : [resolution.primary];
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
        imageBase64 = await generateImage(provider, providerPrompt, images, size, request.headers.get("Authorization") ?? "");
        imageGenerated = true;
        usedProvider = provider;
        usedModel = provider === "gemini" ? GEMINI_IMAGE_MODEL : provider === "vercel" ? VERCEL_IMAGE_MODEL : LOVABLE_IMAGE_MODEL;
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

    let persistedImageUrl = imageBase64;
    let storagePath: string | null = null;
    if (persistGallery) {
      try {
      if (!persistGallery.projectId) throw new Error("gallery_project_required");
      if (persistGallery.projectId) {
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error("gallery_image_not_data_url");
        const mimeType = match[1];
        const extension = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
        const binary = atob(match[2]);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        storagePath = `${guard.userId}/${persistGallery.projectId}/renders/${idempotencyKey}.${extension}`;
        const { error: storageError } = await admin.storage.from("obras").upload(storagePath, bytes, {
          contentType: mimeType,
          upsert: true,
          cacheControl: "31536000",
        });
        if (storageError) throw new Error(`gallery_storage_write_failed:${storageError.message}`);
        const { data: signed, error: signedError } = await admin.storage.from("obras").createSignedUrl(storagePath, 60 * 60 * 24);
        if (signedError || !signed?.signedUrl) throw new Error("gallery_signed_url_failed");
        persistedImageUrl = signed.signedUrl;
        console.info("[STORAGE_WRITE]", JSON.stringify({ status: "success", bucket: "obras", requestId: idempotencyKey, renderId: idempotencyKey }));
      }

      const { error: galleryError } = await admin.from("gallery_images").insert({
        user_id: guard.userId,
        image_url: persistedImageUrl,
        storage_path: storagePath,
        prompt,
        project_id: persistGallery.projectId ?? null,
        environment_id: persistGallery.environmentId ?? null,
        version_id: persistGallery.versionId ?? null,
        correlation_id: persistGallery.correlationId ?? null,
        execution_generation: persistGallery.generation ?? null,
      });
      if (galleryError) throw new Error(`gallery_persist_failed:${galleryError.message}`);
      persisted = true;
      console.info("[DATABASE_WRITE]", JSON.stringify({ status: "success", provider: usedProvider, model: usedModel, storagePath: Boolean(storagePath), requestId: idempotencyKey, renderId: idempotencyKey }));
      } catch (persistError) {
        console.error("[DATABASE_WRITE]", JSON.stringify({ status: "error", code: persistError instanceof Error ? persistError.message.split(":")[0] : "unknown", requestId: idempotencyKey, renderId: idempotencyKey }));
        throw persistError;
      }
    }

    console.info("[IMAGE_RETURN]", JSON.stringify({ status: "success", provider: usedProvider, model: usedModel, persisted, requestId: idempotencyKey, renderId: idempotencyKey }));
    return jsonResponse(cors, { imageBase64, imageUrl: persistedImageUrl, width, height, operationType: OPERATION_TYPE, model: usedModel, provider: usedProvider, requestId: idempotencyKey, renderId: idempotencyKey, storagePath, creditConsumption: Array.isArray(data) ? data[0] : data, persisted, promptStats: { wordCount, charCount: prompt.length, tokenEstimate: Math.ceil(prompt.length / 4) } });
  } catch (caught) {
    const error = caught as GatewayError;
    const message = error.message || String(error);
    const shouldRefund = creditConsumed && Boolean(idempotencyKey) && (!imageGenerated || (persistGalleryRequired && !persisted));
    if (shouldRefund) await refund(guard.userId, idempotencyKey).catch(refundError => console.error("ai-image refund error", refundError));

    console.error("ai-image error", JSON.stringify({ message, requestId: idempotencyKey, renderId: idempotencyKey, imageGenerated, persisted }));

    if (message === "stale_execution_context") return jsonResponse(cors, { message: "A execução do render ficou desatualizada antes da persistência.", code: "stale_execution_context", stage: "execution_context" }, 409);
    if (message === "iara_context_read_failed") return jsonResponse(cors, { message: "Não foi possível validar o contexto atual do render.", code: "iara_context_read_failed", stage: "execution_context" }, 500);
    if (message === "render_idempotency_lookup_failed") return jsonResponse(cors, { message: "Não foi possível validar se este render já foi concluído.", code: "render_idempotency_lookup_failed", stage: "idempotency" }, 500);
    if (message === "gallery_project_required") return jsonResponse(cors, { message: "O render da IARA precisa estar vinculado a um projeto.", code: "gallery_project_required", stage: "execution_context" }, 409);
    if (message === "gallery_image_not_data_url" || message === "invalid_image_result" || message === "empty_image_result" || message === "gemini_empty_image_result") {
      return jsonResponse(cors, { message: "O provider respondeu, mas não entregou uma imagem válida.", code: "provider_invalid_image", stage: "generation" }, 502);
    }
    if (message === "gallery_signed_url_failed") return jsonResponse(cors, { message: "A imagem foi gerada, mas o Storage não conseguiu produzir a URL persistente.", code: "gallery_signed_url_failed", stage: "storage" }, 500);
    if (message.startsWith("gallery_storage_write_failed:")) return jsonResponse(cors, { message: "A imagem foi gerada, mas falhou a gravação no Storage: " + message.slice("gallery_storage_write_failed:".length), code: "gallery_storage_write_failed", stage: "storage" }, 500);
    if (message.startsWith("gallery_persist_failed:")) return jsonResponse(cors, { message: "A imagem foi gerada e armazenada, mas falhou o registro na galeria: " + message.slice("gallery_persist_failed:".length), code: "gallery_persist_failed", stage: "database" }, 500);
    if (message === "credit_already_refunded") return jsonResponse(cors, { message: "Esta operação já foi estornada e não pode ser reutilizada.", code: "credit_already_refunded", stage: "billing" }, 409);
    if (message === "provider_not_configured" || message === "PROVIDER_NOT_CONFIGURED" || message.startsWith("provider_not_configured:")) {
      const provider = message.includes(":") ? message.split(":")[1] : undefined;
      return jsonResponse(cors, { message: provider ? "O provider de imagem " + provider + " não está configurado nesta publicação." : "Nenhum provider de imagem operacional está configurado nesta publicação.", code: "provider_not_configured", provider, stage: "provider_selection", requestId: idempotencyKey, renderId: idempotencyKey }, 503);
    }
    if (message.startsWith("configured_provider_unavailable:")) {
      const provider = message.slice("configured_provider_unavailable:".length);
      return jsonResponse(cors, { message: "O provider de imagem configurado (" + provider + ") não está disponível nesta publicação.", code: "provider_not_configured", provider, stage: "provider_selection", requestId: idempotencyKey, renderId: idempotencyKey }, 503);
    }
    if (message === "provider_timeout" || message.includes("provider_timeout")) return jsonResponse(cors, { message: "O provider de imagem excedeu o tempo limite.", code: "provider_timeout", stage: "generation" }, 504);
    if (message === "provider_connection_error" || message.includes("provider_connection_error")) return jsonResponse(cors, { message: "Não foi possível estabelecer comunicação com o provider de imagem.", code: "provider_connection_error", stage: "generation" }, 502);

    const encodedStatus = message.match(/(?:lovable|gemini|vercel)_http_(\d{3})/i)?.[1];
    const status = error.status ?? (encodedStatus ? Number(encodedStatus) : undefined);
    if (status === 400) return jsonResponse(cors, { message: message.replace(/^(?:lovable|gemini|vercel)_http_\d{3}:/i, ""), code: "invalid_image_request", stage: "generation" }, 400);
    if (status === 401) return jsonResponse(cors, { message: "O provider recusou a autenticação da credencial configurada.", code: "provider_auth_error", stage: "generation" }, 401);
    if (status === 402) return jsonResponse(cors, { message: "O provider recusou a geração por créditos/saldo insuficiente.", code: "provider_credits_exhausted", stage: "generation" }, 402);
    if (status === 403) return jsonResponse(cors, { message: "O provider recusou o acesso da credencial ou modelo configurado.", code: "provider_access_denied", stage: "generation" }, 403);
    if (status === 429) return jsonResponse(cors, { message: "O limite do provider de imagem foi atingido.", code: "rate_limited", stage: "generation" }, 429, error.retryAfter ? { "Retry-After": error.retryAfter } : {});

    return jsonResponse(cors, { message: message.startsWith("provider_stream:") ? message.slice(16) : message, code: "upstream_error", stage: "generation" }, 502);
  }
});
