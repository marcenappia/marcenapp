import { supabase } from '@/integrations/supabase/client';
import { getAIProvider } from './aiProvider';

/** Returns true if user is logged in, false otherwise */
export const requireAuth = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export class AIAuthError extends Error {
  constructor(message = 'Faça login para usar os recursos de IA.') {
    super(message);
    this.name = 'AIAuthError';
  }
}

/**
 * Cabeçalhos para as Edge Functions de IA: envia o JWT da sessão do usuário
 * (nunca a chave privada do provedor). A escolha do provedor é lida da
 * configuração do usuário e enviada como preferência operacional, nunca como segredo.
 */
export const aiHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new AIAuthError();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_KEY,
  };
};

/** POST autenticado em uma Edge Function; converte erros em mensagens legíveis. */
export const callAIFunction = async <T = any>(fn: string, body: unknown): Promise<T> => {
  const headers = await aiHeaders();
  const provider = await getAIProvider();
  const requestBody = {
    ...(body && typeof body === 'object' ? body as Record<string, unknown> : { input: body }),
    provider,
  };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* corpo vazio */ }
  if (!res.ok) {
    if (res.status === 401) throw new AIAuthError('Sessão expirada. Faça login novamente.');
    const msg = data?.error || data?.message || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
};

export const callAIImage = async (prompt: string, images?: { mimeType: string; data: string }[]) => {
  const data = await callAIFunction<{ imageUrl: string | null }>('ai-image', { prompt, images });
  return data.imageUrl ?? null;
};

export const callAIText = async (prompt: string, images?: { mimeType: string; data: string }[], jsonMode = false) => {
  const data = await callAIFunction<{ text: string }>('ai-text', { prompt, images, jsonMode });
  return data.text;
};
