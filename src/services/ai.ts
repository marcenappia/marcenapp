import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/config';

/** Returns true if user is logged in, false otherwise */
export const requireAuth = async (): Promise<boolean> => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY;

export class AIAuthError extends Error {
  constructor(message = 'Faça login para usar os recursos de IA.') {
    super(message);
    this.name = 'AIAuthError';
  }
}

export class AIConfigError extends Error {
  constructor(message = 'A conexão com a IA não está configurada nesta publicação.') {
    super(message);
    this.name = 'AIConfigError';
  }
}

/** Cabeçalhos para as Edge Functions de IA: envia somente o JWT da sessão. */
export const aiHeaders = async (): Promise<Record<string, string>> => {
  if (!supabase || !SUPABASE_URL || !SUPABASE_KEY) throw new AIConfigError();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new AIAuthError();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_KEY,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** POST autenticado em uma Edge Function com retry curto apenas para falhas transitórias. */
export const callAIFunction = async <T = unknown>(fn: string, body: unknown): Promise<T> => {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new AIConfigError();

  const headers = await aiHeaders();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { ...headers, 'x-retry-count': String(attempt) },
        body: JSON.stringify(body),
      });

      let data: { error?: string; message?: string } | null = null;
      try { data = await res.json(); } catch { /* corpo vazio */ }

      if (res.ok) return data as unknown as T;
      if (res.status === 401) throw new AIAuthError('Sessão expirada. Faça login novamente.');

      const msg = data?.error || data?.message || `Erro ${res.status}`;
      const transient = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
      if (transient && attempt < 2) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? 2);
        await sleep(Math.min(Math.max(Number.isFinite(retryAfter) ? retryAfter : 2, 1), 10) * 1000);
        lastError = new Error(msg);
        continue;
      }
      throw new Error(msg);
    } catch (error) {
      if (error instanceof AIAuthError || error instanceof AIConfigError) throw error;
      lastError = error instanceof Error ? error : new Error('Falha ao comunicar com a IA.');
      if (attempt < 2 && /Failed to fetch|NetworkError|network/i.test(lastError.message)) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('Falha ao comunicar com a IA.');
};

const imageParts = (images?: { mimeType: string; data: string }[]) =>
  (images ?? []).filter((image) => image?.data).slice(0, 4).map((image) => ({
    mimeType: image.mimeType || 'image/jpeg',
    data: image.data,
  }));

export const callAIImage = async (prompt: string, images?: { mimeType: string; data: string }[]) => {
  const payloadImages = imageParts(images).map((image) => `data:${image.mimeType};base64,${image.data}`);
  const data = await callAIFunction<{ imageBase64?: string; imageUrl?: string | null }>('ai-image', {
    prompt,
    images: payloadImages,
  });
  if (data.imageUrl) return data.imageUrl;
  if (data.imageBase64) return `data:image/png;base64,${data.imageBase64}`;
  return null;
};

export const callAIText = async (prompt: string, images?: { mimeType: string; data: string }[], jsonMode = false) => {
  const data = await callAIFunction<{ text: string }>('ai-text', {
    prompt,
    jsonMode,
    images: imageParts(images),
  });
  return data.text;
};
