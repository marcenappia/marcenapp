import { test, expect, type Page, type Browser } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uzhqhieqlcyncelltfjw.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_o9A9xyvRYXt-Rl9MZfdArA_SdYOAySX';

type Session = { accessToken: string; userId: string };

async function getSession(page: Page): Promise<Session> {
  return page.evaluate(() => {
    for (const value of Object.values(localStorage)) {
      try {
        const parsed = JSON.parse(value);
        const session = parsed?.access_token ? parsed : parsed?.currentSession;
        if (session?.access_token) {
          const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          return { accessToken: session.access_token, userId: payload.sub };
        }
      } catch { /* unrelated storage */ }
    }
    throw new Error('Supabase session not found in browser storage');
  });
}

async function api(page: Page, session: Session, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ url, key, token, path, init }) => {
    const headers = new Headers(init.headers);
    headers.set('apikey', key);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${url}${path}`, { ...init, headers });
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, ok: response.ok, body };
  }, { url: SUPABASE_URL, key: SUPABASE_KEY, token: session.accessToken, path, init });
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.getByPlaceholder('E-mail').fill(email);
  await page.getByPlaceholder('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function newAuthenticatedPage(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email, password);
  return { context, page, session: await getSession(page) };
}

test.describe('security hardening boundaries', () => {
  test('authenticated user cannot inject or read another user project', async ({ page, browser }) => {
    const firstEmail = process.env.E2E_EMAIL?.trim();
    const firstPassword = process.env.E2E_PASSWORD;
    const secondEmail = process.env.E2E_SECOND_EMAIL?.trim();
    const secondPassword = process.env.E2E_SECOND_PASSWORD;
    test.skip(!firstEmail || !firstPassword || !secondEmail || !secondPassword, 'Two authenticated tenant credentials are required for the cross-tenant boundary test.');

    await login(page, firstEmail!, firstPassword!);
    const ownerA = await getSession(page);
    const ownerB = await newAuthenticatedPage(browser, secondEmail!, secondPassword!);
    let projectId = '';

    try {
      const project = await api(ownerB.page, ownerB.session, '/rest/v1/projects', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: ownerB.session.userId, name: `__SECURITY_B_${Date.now()}__` }),
      });
      expect(project.status).toBe(201);
      projectId = (project.body as Array<{ id: string }>)[0].id;

      const readForeign = await api(page, ownerA, `/rest/v1/projects?id=eq.${projectId}`);
      expect(readForeign.status).toBe(200);
      expect(readForeign.body).toEqual([]);

      const injectSale = await api(page, ownerA, '/rest/v1/project_sales', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: ownerA.userId, project_id: projectId, sale_price: 1000 }),
      });
      expect([401, 403]).toContain(injectSale.status);

      const injectIara = await api(page, ownerA, '/rest/v1/project_iara_contexts', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: ownerA.userId, project_id: projectId, summary: 'cross-tenant' }),
      });
      expect([401, 403]).toContain(injectIara.status);

      const injectShare = await api(page, ownerA, '/rest/v1/project_share_links', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: ownerA.userId,
          project_id: projectId,
          project_version_id: '11111111-1111-4111-8111-111111111111',
          token_hash: `security-${Date.now()}`,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
        }),
      });
      expect([401, 403]).toContain(injectShare.status);

      const adminProbe = await api(page, ownerA, '/rest/v1/rpc/is_admin_user', {
        method: 'POST',
        body: JSON.stringify({ p_user_id: ownerB.session.userId }),
      });
      expect(adminProbe.status).toBe(200);
      expect(adminProbe.body).toBe(false);
    } finally {
      if (projectId) await api(ownerB.page, ownerB.session, `/rest/v1/projects?id=eq.${projectId}`, { method: 'DELETE' });
      await ownerB.context.close();
    }
  });

  test('anonymous callers cannot invoke internal IARA scope RPCs', async ({ request }) => {
    const response = await request.post(`${SUPABASE_URL}/rest/v1/rpc/merge_iara_project_context`, {
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      data: {
        p_user_id: '11111111-1111-4111-8111-111111111111',
        p_project_id: '11111111-1111-4111-8111-111111111111',
        p_summary: 'anonymous',
        p_decisions: [],
        p_artifacts: [],
        p_last_correlation_id: 'security-test',
      },
    });
    expect([400, 401, 403, 404]).toContain(response.status());
  });
});
