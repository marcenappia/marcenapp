import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'npm:jose@6';

const GITHUB_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_AUDIENCE = 'marcenapp-e2e';
const EXPECTED_REPOSITORY = 'marcenappia/marcenapp';
const EXPECTED_REF = 'refs/heads/main';
const EXPECTED_WORKFLOWS = new Set(['Vercel Production Smoke', 'Playwright Tests']);
const githubJwks = createRemoteJWKSet(
  new URL('https://token.actions.githubusercontent.com/.well-known/jwks'),
);

type GitHubClaims = JWTPayload & {
  repository?: string;
  ref?: string;
  workflow?: string;
  event_name?: string;
  run_id?: string;
};

type BootstrapRequest = {
  action?: 'create' | 'delete';
  user_id?: string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

const getSecretKey = () => {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
  return keys.default;
};

const getPublishableKey = () => {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>;
  return keys.default;
};

async function verifyGitHubActionsToken(request: Request): Promise<GitHubClaims> {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('missing_bearer_token');

  const { payload } = await jwtVerify(match[1], githubJwks, {
    issuer: GITHUB_ISSUER,
    audience: GITHUB_AUDIENCE,
  });
  const claims = payload as GitHubClaims;

  if (claims.repository !== EXPECTED_REPOSITORY) throw new Error('invalid_repository');
  if (claims.ref !== EXPECTED_REF) throw new Error('invalid_ref');
  if (claims.workflow && !EXPECTED_WORKFLOWS.has(claims.workflow)) throw new Error('invalid_workflow');
  if (claims.event_name && !['deployment_status', 'workflow_dispatch'].includes(claims.event_name)) {
    throw new Error('invalid_event');
  }
  return claims;
}

function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = getSecretKey();
  if (!url || !serviceRoleKey) throw new Error('supabase_admin_configuration_missing');
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function createAuthClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = getPublishableKey();
  if (!url || !publishableKey) throw new Error('supabase_publishable_configuration_missing');
  return createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function randomPassword() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}!aA9`;
}

async function createEphemeralSession() {
  const admin = createAdminClient();
  const auth = createAuthClient();
  const runId = crypto.randomUUID();
  const email = `e2e-${runId}@marcenapp.invalid`;
  const password = randomPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'e2e', source: 'github-actions', run_id: runId },
  });
  if (createError || !created.user) throw new Error(`create_user_failed:${createError?.message ?? 'missing_user'}`);

  const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(`sign_in_failed:${signInError?.message ?? 'missing_session'}`);
  }

  return {
    user_id: created.user.id,
    session: signedIn.session,
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const claims = await verifyGitHubActionsToken(request);
    const body = await request.json() as BootstrapRequest;
    const admin = createAdminClient();

    console.log('e2e bootstrap authorized', {
      repository: claims.repository,
      ref: claims.ref,
      workflow: claims.workflow,
      event_name: claims.event_name,
      run_id: claims.run_id,
      action: body.action,
    });

    if (body.action === 'delete') {
      if (!body.user_id || !/^[0-9a-f-]{36}$/i.test(body.user_id)) return json({ error: 'invalid_user_id' }, 400);
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      if (error) return json({ error: 'delete_user_failed' }, 500);
      return json({ deleted: true });
    }

    if (body.action !== 'create') return json({ error: 'invalid_action' }, 400);
    return json(await createEphemeralSession());
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown_error';
    console.warn('e2e bootstrap rejected', { reason });
    const status = reason.startsWith('missing_') || reason.startsWith('invalid_')
      ? 401
      : 500;
    return json({ error: 'unauthorized' }, status);
  }
});
