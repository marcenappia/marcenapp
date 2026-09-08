import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type MaterialType = 'boards' | 'edges' | 'components';

type RequestBody = {
  action: 'list_services' | 'get_service' | 'mark_service_imported' | 'list_materials' | 'get_material' | 'update_material';
  input?: Record<string, unknown>;
};

const API_BASE_URL = Deno.env.get('CORTECLOUD_API_BASE_URL');
const EMAIL = Deno.env.get('CORTECLOUD_EMAIL');
const PASSWORD = Deno.env.get('CORTECLOUD_PASSWORD');
const API_KEY = Deno.env.get('CORTECLOUD_API_KEY');

function configurationError(): string | null {
  const missing = [
    ['CORTECLOUD_API_BASE_URL', API_BASE_URL],
    ['CORTECLOUD_EMAIL', EMAIL],
    ['CORTECLOUD_PASSWORD', PASSWORD],
    ['CORTECLOUD_API_KEY', API_KEY],
  ].filter(([, value]) => !value).map(([name]) => name);

  return missing.length ? `Integração Cortecloud não configurada. Variáveis ausentes: ${missing.join(', ')}` : null;
}

function authHeader(): string {
  return `Basic ${btoa(`${EMAIL}:${PASSWORD}`)}`;
}

function materialPath(type: MaterialType): string {
  if (!['boards', 'edges', 'components'].includes(type)) {
    throw new Error('Tipo de material Cortecloud inválido.');
  }
  return `/materials/${type}`;
}

async function cortecloudFetch(path: string, init: RequestInit = {}) {
  const url = `${API_BASE_URL!.replace(/\/$/, '')}${path}`;
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set('authorization', authHeader());
  headers.set('x-dreamfactory-api-key', API_KEY!);
  headers.set('content-type', 'application/json');

  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Cortecloud API ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }

  return data;
}

function requireStringOrNumber(value: unknown, field: string): string | number {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    throw new Error(`${field} é obrigatório.`);
  }
  return value;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const configError = configurationError();
    if (configError) {
      return new Response(JSON.stringify({ error: configError }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'POST') {
      throw new Error('Método não suportado.');
    }

    const body = (await request.json()) as RequestBody;
    const input = body.input ?? {};

    switch (body.action) {
      case 'list_services': {
        const params = new URLSearchParams();
        for (const key of ['status', 'limit', 'offset', 'internal_code', 'date_start', 'date_end']) {
          const value = input[key];
          if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
        }
        return new Response(JSON.stringify(await cortecloudFetch(`/services?${params.toString()}`)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_service': {
        const serviceId = requireStringOrNumber(input.serviceId, 'serviceId');
        return new Response(JSON.stringify(await cortecloudFetch(`/services/${encodeURIComponent(String(serviceId))}`)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'mark_service_imported': {
        const serviceId = requireStringOrNumber(input.serviceId, 'serviceId');
        const internalCode = requireStringOrNumber(input.internal_code, 'internal_code');
        return new Response(JSON.stringify(await cortecloudFetch(`/services/${encodeURIComponent(String(serviceId))}`, {
          method: 'PUT',
          body: JSON.stringify({ internal_code: internalCode }),
        })), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_materials': {
        const type = input.type as MaterialType;
        return new Response(JSON.stringify(await cortecloudFetch(materialPath(type))), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_material': {
        const type = input.type as MaterialType;
        const internalCode = requireStringOrNumber(input.internalCode, 'internalCode');
        return new Response(JSON.stringify(await cortecloudFetch(`${materialPath(type)}/${encodeURIComponent(String(internalCode))}`)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_material': {
        const type = input.type as MaterialType;
        const internalCode = requireStringOrNumber(input.internalCode, 'internalCode');
        const allowed = ['price', 'stock', 'unit', 'active'];
        const payload: Record<string, unknown> = {};
        for (const key of allowed) {
          if (input[key] !== undefined) payload[key] = input[key];
        }
        if (!Object.keys(payload).length) throw new Error('Informe ao menos um campo para atualização.');

        return new Response(JSON.stringify(await cortecloudFetch(`${materialPath(type)}/${encodeURIComponent(String(internalCode))}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Ação Cortecloud não suportada.');
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido na integração Cortecloud.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
