import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MIN_DIM = 64;
const MAX_DIM = 4096;
const DEFAULT_DIM = 1024;
const MAX_PROMPT_CHARS = 4000;
const MAX_PROMPT_WORDS = 800;
const OPERATION_TYPE = "gerarRender";
const LOVABLE_IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";
const LOVABLE_GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";

const ImageSchema = z.object({
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/i),
  data: z.string().min(1).max(15_000_000),
});
const BodySchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_CHARS),
  images: z.array(ImageSchema).max(8).optional(),
  size: z.object({
    width: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
    height: z.number().int().min(MIN_DIM).max(MAX_DIM).optional(),
  }).optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
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

async function readImageStream(response: Response): Promise<string> {
  if (!response.body) throw new Error("empty_image_stream");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let completedImage: string | null = null;
  let eventCount = 0;
  let streamError: string | null = null;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += chunk.value;
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const eventName = frame.split(/\r?\n/).find(line => line.startsWith("event:"))?.slice(6).trim();
      const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
      if (!data || data === "[DONE]") continue;
      let payload: { type?: string; b64_json?: string; error?: { message?: string } };
      try { payload = JSON.parse(data); } catch { continue; }
      eventCount += 1;
      if (eventName === "error" || payload.type === "error") {
        streamError = payload.error?.message ?? "Falha no provedor de imagens.";
        continue;
      }
      if ((eventName === "image_generation.completed" || eventName === "image_edit.completed" || payload.type === "image_generation.completed" || payload.type === "image_edit.completed") && payload.b64_json) {
        completedImage = payload.b64_json;
      }
    }
  }
  if (streamError) throw new Error(`provider_stream:${streamError}`);
  if (completedImage) return completedImage;
  if (eventCount === 0) throw new Error("zero_image_events");
  throw new Error("incomplete_image_stream");
}

async function readBufferedImage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { data?: Array<{ b64_json?: string }> } | null;
  const image = body?.data?.[0]?.b64_json;
  if (!image) throw new Error("empty_image_result");
  return image;
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

async function requestGateway(prompt: string, images: ImageInput[], stream: boolean): Promise<Response> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("provider_not_configured");
  const headers = { Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" };
  if (images.length > 0) {
    const form = new FormData();
    form.set("model", LOVABLE_IMAGE_MODEL);
    form.set("prompt", prompt);
    if (stream) {
      form.set("stream", "true");
      form.set("partial_images", "1");
    }
    images.forEach((image, index) => form.append(images.length === 1 ? "image" : "image[]", imageBlob(image), `reference-${index}.${imageExtension(image.mimeType)}`));
    return gatewayFetch(`${LOVABLE_GATEWAY_BASE_URL}/images/edits`, { method: "POST", headers, body: form });
  }
  return gatewayFetch(`${LOVABLE_GATEWAY_BASE_URL}/images/generations`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ model: LOVABLE_IMAGE_MODEL, prompt, ...(stream ? { stream: true, partial_images: 1 } : {}) }),
  });
}

async function generateImage(prompt: string, images: ImageInput[]): Promise<string> {
  const streamed = await requestGateway(prompt, images, true);
  if (!streamed.ok) throw gatewayError(streamed, await streamed.text());
  try {
    return await readImageStream(streamed);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "zero_image_events") throw error;
    const replay = await requestGateway(prompt, images, false);
    if (!replay.ok) throw gatewayError(replay, await replay.text());
    return readBufferedImage(replay);
  }
}

async function refund(userId: string, idempotencyKey: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  await admin.rpc("refund_billing_credit", { p_user_id: userId, p_operation_type: OPERATION_TYPE, p_idempotency_key: idempotencyKey });
}

serve(async request => {
  const cors = buildCorsHeaders(request);
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return jsonResponse(cors, { message: "Método não permitido.", code: "method_not_allowed" }, 405);

  const guard = await guardRequest(request, cors, { fn: "ai-image", limit: 10, windowSeconds: 60 });
  if (!guard.ok) return guard.response;
  let creditConsumed = false;
  let idempotencyKey = "";
  try {
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    if (!body.ok) return jsonResponse(cors, { message: body.reason === "too_large" ? "Corpo da solicitação muito grande." : "JSON inválido.", code: body.reason === "too_large" ? "payload_too_large" : "invalid_json" }, body.reason === "too_large" ? 413 : 400);
    const parsed = BodySchema.safeParse(body.body);
    if (!parsed.success) return jsonResponse(cors, { message: "Dados inválidos.", code: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    const { prompt, images = [], size } = parsed.data;
    idempotencyKey = parsed.data.idempotencyKey;
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
    creditConsumed = true;
    const data: unknown = consumed.data;
    const imageBase64 = await generateImage(prompt, images);
    return jsonResponse(cors, { imageUrl: `data:image/png;base64,${imageBase64}`, width, height, operationType: OPERATION_TYPE, model: LOVABLE_IMAGE_MODEL, provider: "lovable", creditConsumption: Array.isArray(data) ? data[0] : data, promptStats: { wordCount, charCount: prompt.length, tokenEstimate: Math.ceil(prompt.length / 4) } });
  } catch (caught) {
    if (creditConsumed && idempotencyKey) await refund(guard.userId, idempotencyKey).catch(error => console.error("ai-image refund error", error));
    const error = caught as GatewayError;
    console.error("ai-image error", error.message);
    if (error.message === "provider_not_configured") return jsonResponse(cors, { message: "A conexão com a IA não está configurada nesta publicação.", code: "provider_not_configured" }, 500);
    if (error.status === 400) return jsonResponse(cors, { message: error.message, code: "invalid_image_request" }, 400);
    if (error.status === 401) return jsonResponse(cors, { message: "A chave do serviço de IA não está configurada corretamente.", code: "provider_auth_error" }, 401);
    if (error.status === 402) return jsonResponse(cors, { message: error.message, code: "provider_credits_exhausted" }, 402);
    if (error.status === 403) return jsonResponse(cors, { message: error.message, code: "provider_access_denied" }, 403);
    if (error.status === 429) return jsonResponse(cors, { message: error.message, code: "rate_limited" }, 429, error.retryAfter ? { "Retry-After": error.retryAfter } : {});
    return jsonResponse(cors, { message: error.message.startsWith("provider_stream:") ? error.message.slice(16) : "O provedor de imagens está indisponível no momento.", code: "upstream_error" }, 502);
  }
});