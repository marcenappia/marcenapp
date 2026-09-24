import { supabase } from '@/integrations/supabase/client';

type AIImageInput = string | { mimeType: string; data: string };
type AIErrorBody = { error?: string; message?: string; code?: string };
type AIImageResponse = { imageBase64?: string | null; imageUrl?: string | null; provider?: string; model?: string; requestId?: string; renderId?: string };

export interface AIImagePersistence {
  projectId?: string | null;
  environmentId?: string | null;
  versionId?: string | null;
  correlationId?: string | null;
  generation?: number | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uzhqhieqlcyncelltfjw.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_o9A9xyvRYXt-Rl9MZfdArA_SdYOAySX';

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
      return new Error('Nenhum provedor de IA está configurado para esta operação. Verifique a configuração no Admin.');
    case 'commercial_rule_missing':
      return new Error('Esta ferramenta de IA ainda não está habilitada comercialmente.');
    case 'insufficient_credits':
      return new Error('Créditos Marcenapp insuficientes para gerar o render.');
    case 'provider_credits_exhausted':
    case 'credits_exhausted':
      return new Error('Os créditos do provedor de IA acabaram. Verifique o provedor configurado no Admin.');
    case 'rate_limit_unavailable':
      return new Error('O controle de uso da IA está indisponível. Tente novamente em instantes.');
    case 'provider_connection_error':
      return new Error('Não foi possível comunicar com o provedor de IA. Tente novamente.');
    case 'provider_timeout':
      return new Error('O provedor de IA demorou além do limite esperado. Tente novamente.');
    case 'upstream_error':
      return new Error('O provedor de IA está indisponível no momento. Tente novamente.');
    case 'rate_limited':
      return new Error('O limite do provedor de IA foi atingido. Tente novamente em alguns segundos.');
    default:
      return new Error(body.error || body.message || `Erro ${status}`);
  }
};

export const callAIFunction = async <T = unknown>(fn: string, body: unknown, requestId?: string): Promise<T> => {
  const headers = await aiHeaders();
  if (requestId) headers['x-request-id'] = requestId;
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error('Não foi possível comunicar com o serviço de IA. Verifique sua conexão e tente novamente.');
  }

  let data: unknown = null;
  try { data = await res.json(); } catch { /* corpo vazio */ }
  if (!res.ok) throw normalizeAIError(res.status, data);
  return data as T;
};

export const callAIImage = async (
  prompt: string,
  images?: AIImageInput[],
  idempotencyKey: string = crypto.randomUUID(),
  persistence?: AIImagePersistence,
) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  console.debug(JSON.stringify({ stage: '[CLIENT_REQUEST]', status: 'started', durationMs: 0, provider: 'unresolved', requestId, renderId: idempotencyKey }));
  const normalizedImages = images?.map(img => {
    if (typeof img === 'string') {
      const raw = img.includes(',') ? img.split(',')[1] : img;
      return { mimeType: 'image/png', data: raw };
    }
    return img;
  });
  const data = await callAIFunction<AIImageResponse>('ai-image', {
    prompt,
    images: normalizedImages,
    idempotencyKey,
    ...(persistence ? { persistGallery: persistence } : {}),
  }, requestId);
  const image = data.imageBase64 ?? data.imageUrl ?? null;
  if (!image || (!image.startsWith('data:image/') && !/^https:\/\//i.test(image))) {
    throw new Error('O serviço de IA não retornou uma imagem válida.');
  }
  console.info('[FRONTEND_RECEIVED]', JSON.stringify({ status: 'success', durationMs: Date.now() - startedAt, provider: data.provider ?? 'unresolved', model: data.model ?? 'unresolved', requestId: data.requestId ?? requestId, renderId: data.renderId ?? idempotencyKey }));
  return image;
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
