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
  const body = isAIErrorBody(data) ? data : {};
  if (status === 401 && body.code !== 'provider_auth_error') return new AIAuthError('Sessão expirada. Faça login novamente.');
  // Preserve the safe server reason; a provider failure is not an expired user session.
  if (body.message) return new Error(body.message);
  switch (body.code) {
    case 'missing_api_key':
    case 'provider_not_configured':
      return new Error('YARA: provider de imagem não configurado ou indisponível. Verifique a configuração do provedor.');
    case 'commercial_rule_missing':
      return new Error('YARA: a operação de render ainda não está habilitada comercialmente.');
    case 'insufficient_credits':
      return new Error('YARA: créditos Marcenapp insuficientes para gerar o render.');
    case 'provider_credits_exhausted':
    case 'credits_exhausted':
      return new Error('YARA: o provider de imagem recusou a geração por falta de créditos/saldo.');
    case 'provider_auth_error':
      return new Error('YARA: a credencial do provider de imagem foi recusada. A falha ocorreu na autenticação do provider.');
    case 'provider_access_denied':
      return new Error('YARA: o provider recusou acesso à credencial ou ao modelo configurado.');
    case 'provider_invalid_image':
      return new Error('YARA: o provider respondeu, mas não entregou uma imagem válida.');
    case 'provider_connection_error':
      return new Error('YARA: não foi possível comunicar com o provider de imagem.');
    case 'provider_timeout':
      return new Error('YARA: o provider de imagem ultrapassou o tempo limite.');
    case 'gallery_storage_write_failed':
      return new Error('YARA: a imagem foi gerada, mas falhou a gravação no Storage.');
    case 'gallery_signed_url_failed':
      return new Error('YARA: a imagem foi gerada, mas o Storage não conseguiu criar a URL persistente.');
    case 'gallery_persist_failed':
      return new Error('YARA: a imagem foi gerada e armazenada, mas falhou o registro na galeria.');
    case 'stale_execution_context':
      return new Error('YARA: o contexto do projeto mudou durante a geração. O render foi descartado para evitar salvar a imagem no projeto errado.');
    case 'iara_context_read_failed':
      return new Error('YARA: não foi possível validar o contexto atual do projeto antes de salvar o render.');
    case 'render_idempotency_lookup_failed':
      return new Error('YARA: não foi possível validar se este render já havia sido concluído.');
    case 'rate_limit_unavailable':
      return new Error('YARA: o controle de uso da IA está indisponível. Tente novamente em instantes.');
    case 'rate_limited':
      return new Error('YARA: o limite do provider de imagem foi atingido. Tente novamente em alguns segundos.');
    case 'upstream_error':
      return new Error(typeof body.error === 'string' && body.error ? `YARA: ${body.error}` : 'YARA: o provider de imagem falhou na etapa de geração.');
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
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(fn === 'ai-image'
        ? 'A geração do render ultrapassou 125 segundos sem resposta do serviço.'
        : 'O serviço de IA demorou além do limite esperado.');
    }
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
  idempotencyKey?: string,
  persistence?: AIImagePersistence,
) => {
  const stableIdempotencyKey = idempotencyKey?.trim() || crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  console.debug(JSON.stringify({ stage: '[CLIENT_REQUEST]', status: 'started', durationMs: 0, provider: 'unresolved', requestId, renderId: stableIdempotencyKey }));
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
    idempotencyKey: stableIdempotencyKey,
    ...(persistence ? { persistGallery: persistence } : {}),
  }, requestId);
  // Prefer the private, signed gallery URL when persistence succeeded: it can
  // also be saved in chat without writing a multi-megabyte data URL to the DB.
  const image = data.imageUrl?.startsWith('https://') ? data.imageUrl : data.imageBase64 ?? data.imageUrl ?? null;
  if (!image || (!image.startsWith('data:image/') && !/^https:\/\//i.test(image))) {
    throw new Error('O serviço de IA não retornou uma imagem válida.');
  }
  console.info('[FRONTEND_RECEIVED]', JSON.stringify({ status: 'success', durationMs: Date.now() - startedAt, provider: data.provider ?? 'unresolved', model: data.model ?? 'unresolved', requestId: data.requestId ?? requestId, renderId: data.renderId ?? stableIdempotencyKey }));
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
