import { supabase } from '@/integrations/supabase/client';

type AIImageInput = string | { mimeType: string; data: string };
type AIErrorBody = { error?: string; message?: string; code?: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uzhqhieqlcyncelltfjw.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_o9A9xyvRYXt-Rl9MZfdArA_SdYOAySX';
const AI_TIMEOUT_MS = 90_000;

export const requireAuth = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

export class AIAuthError extends Error {
  constructor(message = 'Faça login para usar os recursos de IA.') {
    super(message);
    this.name = 'AIAuthError';
  }
}

export const aiHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new AIAuthError();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_KEY,
  };
};

const isAIErrorBody = (value: unknown): value is AIErrorBody =>
  typeof value === 'object' && value !== null && ('error' in value || 'message' in value || 'code' in value);

const normalizeAIError = (status: number, data: unknown): Error => {
  if (status === 401) return new AIAuthError('Sessão expirada. Faça login novamente.');
  const body = isAIErrorBody(data) ? data : {};
  switch (body.code) {
    case 'missing_api_key':
    case 'provider_not_configured':
      return new Error('Nenhum provedor de IA configurado para esta operação. Ative Lovable AI no Admin ou configure o Google Gemini.');
    case 'commercial_rule_missing':
      return new Error('Esta ferramenta de IA ainda não está habilitada comercialmente.');
    case 'insufficient_credits':
      return new Error('Créditos Marcenapp insuficientes para gerar o render.');
    case 'provider_credits_exhausted':
      return new Error('Os créditos do provedor de IA acabaram. Você pode trocar o provedor no Admin ou adicionar saldo ao provedor atual.');
    case 'rate_limit_unavailable':
      return new Error('O controle de uso da IA está indisponível. Tente novamente em instantes.');
    case 'provider_connection_error':
      return new Error('Não foi possível conectar ao provedor de imagens. Tente novamente.');
    case 'upstream_error':
      return new Error('O provedor de imagens está indisponível no momento. Tente novamente.');
    case 'rate_limited':
      return new Error('O limite do provedor de IA foi atingido. Tente novamente em alguns segundos.');
    default:
      return new Error(body.error || body.message || `Erro ${status}`);
  }
};

export const callAIFunction = async <T = unknown>(fn: string, body: unknown): Promise<T> => {
  const headers = await aiHeaders();
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('A IA demorou mais que o limite esperado. Tente novamente.');
    }
    throw new Error('Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.');
  }

  let data: unknown = null;
  try { data = await res.json(); } catch { /* corpo vazio */ }
  if (!res.ok) throw normalizeAIError(res.status, data);
  return data as T;
};

export const callAIImage = async (
  prompt: string,
  images?: AIImageInput[],
  idempotencyKey = crypto.randomUUID(),
) => {
  const normalizedImages = images?.map(img => {
    if (typeof img === 'string') {
      const raw = img.includes(',') ? img.split(',')[1] : img;
      return { mimeType: 'image/png', data: raw };
    }
    return img;
  });
  const data = await callAIFunction<{ imageUrl: string | null }>('ai-image', {
    prompt,
    images: normalizedImages,
    idempotencyKey,
  });
  return data.imageUrl ?? null;
};

export const callAIText = async (prompt: string, images?: { mimeType: string; data: string }[], jsonMode = false) => {
  const data = await callAIFunction<{ text: string }>('ai-text', { prompt, images, jsonMode });
  return data.text;
};

export const callAIContractClause = async (prompt: string, idempotencyKey = crypto.randomUUID()) => {
  const data = await callAIFunction<{ id: string; text: string; model: string; operationType: string }>('commercial-contract', {
    prompt,
    idempotencyKey,
  });
  return data;
};
