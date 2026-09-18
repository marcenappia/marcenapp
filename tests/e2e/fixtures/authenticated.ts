import { test as base, expect, type Page } from '@playwright/test';

type AuthenticatedFixtures = {
  authenticatedPage: Page;
};

type TestFixtures = {
  e2eSession: BootstrapResponse;
};

type BootstrapResponse = {
  user_id: string;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
    token_type?: string;
    user: Record<string, unknown>;
  };
};

const SUPABASE_URL = 'https://uzhqhieqlcyncelltfjw.supabase.co';
const E2E_BOOTSTRAP_URL = `${SUPABASE_URL}/functions/v1/e2e-bootstrap`;
const AUTH_STORAGE_KEY = 'sb-uzhqhieqlcyncelltfjw-auth-token';
const OIDC_AUDIENCE = 'marcenapp-e2e';

async function getGitHubOidcToken(): Promise<string> {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) {
    throw new Error('E2E CI authentication requires GitHub Actions OIDC permissions.');
  }

  const separator = requestUrl.includes('?') ? '&' : '?';
  const response = await fetch(
    `${requestUrl}${separator}audience=${encodeURIComponent(OIDC_AUDIENCE)}`,
    { headers: { Authorization: `Bearer ${requestToken}`, Accept: 'application/json' } },
  );
  if (!response.ok) {
    throw new Error(`E2E GitHub OIDC token request failed: status=${response.status}`);
  }

  const body = (await response.json()) as { value?: unknown };
  if (typeof body.value !== 'string' || body.value.length < 20) {
    throw new Error('E2E GitHub OIDC token response was invalid.');
  }
  return body.value;
}

async function bootstrapSession(): Promise<BootstrapResponse> {
  const oidcToken = await getGitHubOidcToken();
  const response = await fetch(E2E_BOOTSTRAP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${oidcToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'create' }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: unknown };
    const message = typeof body.error === 'string' ? body.error : 'unknown error';
    throw new Error(`E2E Supabase bootstrap failed: status=${response.status} ${message}`);
  }

  return (await response.json()) as BootstrapResponse;
}

async function cleanupSession(userId: string): Promise<void> {
  try {
    const oidcToken = await getGitHubOidcToken();
    await fetch(E2E_BOOTSTRAP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${oidcToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'delete', user_id: userId }),
    });
  } catch {
    // Cleanup is best-effort; the bootstrap function never exposes credentials.
  }
}

export const test = base.extend<AuthenticatedFixtures, TestFixtures>({
  e2eSession: async (_fixtures, fixtureUse) => {
    const bootstrap = await bootstrapSession();
    try {
      await fixtureUse(bootstrap);
    } finally {
      await cleanupSession(bootstrap.user_id);
    }
  },

  authenticatedPage: async ({ browser, baseURL, e2eSession }, fixtureUse) => {
    const context = await browser.newContext({ baseURL });

    await context.addInitScript(
      ({ storageKey, session }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
      },
      { storageKey: AUTH_STORAGE_KEY, session: e2eSession.session },
    );

    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    try {
      await fixtureUse(page);
    } finally {
      await context.close();
    }
  },
});

export { expect };
