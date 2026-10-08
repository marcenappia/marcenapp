import { createClient } from '@supabase/supabase-js';
import { generateImage, generateText } from 'ai';

const MODEL = 'openai/gpt-image-2.5-sunburst';
const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MAX_PROMPT = 4000;
const MAX_IMAGES = 4;

type ImageInput = { mimeType: string; data: string };

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function env(name: string): string {
  return process.env[name] ?? '';
}

function imageBytes(image: ImageInput): Uint8Array {
  const binary = Buffer.from(image.data, 'base64');
  return new Uint8Array(binary);
}

async function authenticate(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;

  const token = authorization.slice(7).trim();
  const url = env('VITE_SUPABASE_URL');
  const key = env('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) throw new Error('supabase_auth_config_missing');

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ code: 'invalid_content_type' }, 415);
  }

  try {
    const user = await authenticate(request);
    if (!user) return json({ code: 'unauthorized', message: 'Autenticação necessária.' }, 401);

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ code: 'payload_too_large' }, 413);

    const body = JSON.parse(raw) as {
      prompt?: unknown;
      images?: unknown;
      size?: { width?: unknown; height?: unknown };
    };

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > MAX_PROMPT) {
      return json({ code: 'validation_error', message: 'Prompt inválido.' }, 400);
    }

    const images = Array.isArray(body.images)
      ? body.images.slice(0, MAX_IMAGES).filter((item): item is ImageInput =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as ImageInput).mimeType === 'string' &&
          typeof (item as ImageInput).data === 'string' &&
          /^image\/(png|jpeg|jpg|webp)$/i.test((item as ImageInput).mimeType) &&
          (item as ImageInput).data.length > 0
        )
      : [];

    const width = typeof body.size?.width === 'number' ? Math.max(1024, Math.min(1536, Math.round(body.size.width))) : 1024;
    const height = typeof body.size?.height === 'number' ? Math.max(1024, Math.min(1536, Math.round(body.size.height))) : 1024;

    const promptInput = images.length
      ? {
          text: prompt,
          images: images.map(imageBytes),
        }
      : prompt;

    // On Vercel, AI Gateway authenticates through the deployment OIDC token.
    // Prefer OIDC over any stale API-key environment variable.
    const gatewayToken = process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
    if (!gatewayToken) {
      return json({ code: 'gateway_auth_missing', message: 'Vercel AI Gateway não está autenticado nesta publicação.' }, 503);
    }

    const headers = {
      Authorization: `Bearer ${gatewayToken}`,
    };

    try {
      const result = await generateImage({
        model: MODEL,
        prompt: promptInput,
        size: `${width}x${height}`,
        n: 1,
        maxRetries: 0,
        headers,
      });
      const generated = result.images?.[0] ?? result.image;
      if (generated?.base64) {
        return json({
          imageBase64: `data:${generated.mediaType ?? 'image/png'};base64,${generated.base64}`,
          provider: 'vercel',
          model: MODEL,
        });
      }
    } catch (primaryError) {
      console.warn('[AI_IMAGE_PRIMARY_FAILED]', primaryError);
    }

    // Native multimodal fallback: Nano Banana Pro accepts the reference image
    // as an image part and returns the generated image in result.files.
    const content = [
      { type: 'text' as const, text: prompt },
      ...images.map((image) => ({
        type: 'image' as const,
        image: imageBytes(image),
      })),
    ];

    const fallback = await generateText({
      model: 'google/gemini-3-pro-image',
      messages: [{ role: 'user', content }],
      maxRetries: 0,
      headers,
    });
    const generatedFile = fallback.files.find((file) => file.mediaType?.startsWith('image/'));
    if (!generatedFile) {
      return json({ code: 'empty_image_result', message: 'Nenhum modelo de imagem retornou uma imagem.' }, 502);
    }

    return json({
      imageBase64: `data:${generatedFile.mediaType ?? 'image/png'};base64,${generatedFile.base64}`,
      provider: 'vercel',
      model: 'google/gemini-3-pro-image',
    });
  } catch (error) {
    console.error('[AI_IMAGE_GATEWAY_ERROR]', error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ code: 'gateway_generation_error', message: message.slice(0, 500) }, 502);
  }
}

export const maxDuration = 60;
