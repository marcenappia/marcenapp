import { supabase } from '@/integrations/supabase/client';

/** Returns true if user is logged in, false otherwise */
export const requireAuth = async (): Promise<boolean> => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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
  if (!supabase || !SUPABASE_KEY) throw new AIConfigError();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new AIAuthError();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_KEY,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** POST autenticado em uma Edge Function com retry curto e seguro para 429/503. */
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
      if ((res.status === 429 || res.status === 503) && attempt < 2) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? 2);
        await sleep(Math.min(Math.max(retryAfter, 1), 10) * 1000);
        lastError = new Error(msg);
        continue;
      }
      throw new Error(msg);
    } catch (error) {
      if (error instanceof AIAuthError || error instanceof AIConfigError) throw error;
      lastError = error instanceof Error ? error : new Error('Falha ao comunicar com a IA.');
      if (attempt < 2) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
    }
  }

  throw lastError ?? new Error('Falha ao comunicar com a IA.');
};

export const callAIImage = async (prompt: string, images?: { mimeType: string; data: string }[]) => {
  const data = await callAIFunction<{ imageUrl: string | null }>('ai-image', { prompt, images });
  return data.imageUrl ?? null;
};

export const callAIText = async (prompt: string, images?: { mimeType: string; data: string }[], jsonMode = false) => {
  const data = await callAIFunction<{ text: string }>('ai-text', { prompt, images, jsonMode });
  return data.text;
};
