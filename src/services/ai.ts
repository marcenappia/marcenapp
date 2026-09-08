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

/** POST autenticado em uma Edge Function; converte erros em mensagens legíveis. */
export const callAIFunction = async <T = unknown>(fn: string, body: unknown): Promise<T> => {
  const headers = await aiHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* corpo vazio */ }
  if (!res.ok) {
    if (res.status === 401) throw new AIAuthError('Sessão expirada. Faça login novamente.');
    const errorData = data as { error?: string; message?: string } | null;
    const msg = errorData?.error || errorData?.message || `Erro ${res.status}`;
    throw new Error(msg);
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
