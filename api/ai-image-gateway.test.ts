import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { POST } from './ai-image-gateway';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('ai', () => ({ generateImage: vi.fn() }));
vi.mock('@vercel/oidc', () => ({ getVercelOidcToken: vi.fn().mockResolvedValue('') }));

const gatewayPath = fileURLToPath(new URL('./ai-image-gateway.ts', import.meta.url));

describe('Vercel image gateway contract', () => {
  it('keeps image provider ownership in the Vercel image adapter without a hidden Gemini fallback', async () => {
    const source = await readFile(gatewayPath, 'utf8');
    expect(source).toContain("import { generateImage } from 'ai';");
    expect(source).not.toContain("generateText");
    expect(source).not.toContain("google/gemini-3-pro-image");
    expect(source).toContain("model: MODEL");
  });

  it('keeps the gateway source syntactically valid around the text/responses body contract', async () => {
    const source = await readFile(gatewayPath, 'utf8');
    expect(source).toContain("response_format?: unknown;");
    expect(source).toContain("input?: unknown;");
    expect(source).not.toContain("\\n      input?: unknown;");
  });
});

describe('gateway authentication configuration', () => {
  const getUser = vi.fn();
  const request = (authorization = 'Bearer test-session', contentType = 'application/json') => new Request('https://example.test/api/ai-image-gateway', {
    method: 'POST', headers: { Authorization: authorization, 'Content-Type': contentType },
    body: JSON.stringify({ prompt: 'Render with reference' }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    for (const name of ['VITE_SUPABASE_URL', 'SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY']) {
      vi.stubEnv(name, '');
    }
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid session' } });
    vi.mocked(createClient).mockReturnValue({ auth: { getUser } } as unknown as ReturnType<typeof createClient>);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'])('accepts server URL and %s while validating the Bearer session', async (keyName) => {
    vi.stubEnv('SUPABASE_URL', 'https://server.example.test');
    vi.stubEnv(keyName, 'test-public-key');
    const response = await POST(request());
    expect(createClient).toHaveBeenCalledWith('https://server.example.test', 'test-public-key', { auth: { persistSession: false } });
    expect(getUser).toHaveBeenCalledWith('test-session');
    expect(response.status).toBe(401);
    expect(console.info).toHaveBeenCalledWith('[AI_IMAGE_AUTH_CONFIG]', { urlConfigured: true, publicKeyConfigured: true });
  });

  it('preserves the existing Vite configuration precedence', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vite.example.test');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-vite-public-key');
    vi.stubEnv('SUPABASE_URL', 'https://server.example.test');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-server-public-key');
    await POST(request());
    expect(createClient).toHaveBeenCalledWith('https://vite.example.test', 'test-vite-public-key', { auth: { persistSession: false } });
  });

  it('prefers the server publishable key over the legacy anon key', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://server.example.test');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
    vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon-key');
    await POST(request());
    expect(createClient).toHaveBeenCalledWith('https://server.example.test', 'test-publishable-key', { auth: { persistSession: false } });
  });

  it('returns a terminal configuration error without calling auth when config is absent', async () => {
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('supabase_auth_config_missing');
    expect(createClient).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith('[AI_IMAGE_AUTH_CONFIG]', { urlConfigured: false, publicKeyConfigured: false });
  });

  it.each(['', 'Bearer ', 'Basic test-session'])('rejects missing or invalid Bearer authorization (%s)', async (authorization) => {
    expect((await POST(request(authorization))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('requires JSON content type', async () => {
    expect((await POST(request('Bearer test-session', 'text/plain'))).status).toBe(415);
    expect(createClient).not.toHaveBeenCalled();
  });
});
