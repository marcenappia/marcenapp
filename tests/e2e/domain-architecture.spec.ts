import { test, expect } from './fixtures/authenticated';

const SUPABASE_URL = 'https://uzhqhieqlcyncelltfjw.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_o9A9xyvRYXt-Rl9MZfdArA_SdYOAySX';

type ApiSession = {
  accessToken: string;
  userId: string;
};

async function getSession(page: import('@playwright/test').Page): Promise<ApiSession> {
  return page.evaluate(() => {
    for (const value of Object.values(localStorage)) {
      try {
        const parsed = JSON.parse(value);
        const session = parsed?.access_token ? parsed : parsed?.currentSession;
        if (session?.access_token) {
          const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          return { accessToken: session.access_token, userId: payload.sub };
        }
      } catch {
        // Ignore unrelated localStorage entries.
      }
    }
    throw new Error('Supabase session not found in browser storage');
  });
}

async function api(page: import('@playwright/test').Page, session: ApiSession, path: string, init: RequestInit = {}) {
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

test.describe('definitive domain architecture', () => {
  test('execution scope persistence and chat hierarchy stay isolated', async ({ authenticatedPage: page }) => {
    const session = await getSession(page);
    let projectId = '';
    try {
      const project = await api(page, session, '/rest/v1/projects', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: session.userId, name: `__E2E_DOMAIN_${Date.now()}__` }),
      });
      expect(project.status).toBe(201);
      projectId = (project.body as Array<{ id: string }>)[0].id;

      const envA = await api(page, session, '/rest/v1/project_environments', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_id: projectId, name: 'Kitchen', position: 0 }),
      });
      const envB = await api(page, session, '/rest/v1/project_environments', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_id: projectId, name: 'Suite', position: 1 }),
      });
      expect(envA.status).toBe(201);
      expect(envB.status).toBe(201);
      const environmentA = (envA.body as Array<{ id: string }>)[0].id;
      const environmentB = (envB.body as Array<{ id: string }>)[0].id;

      const versionA = await api(page, session, '/rest/v1/project_versions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_id: projectId, user_id: session.userId, environment_id: environmentA, version_number: 1, snapshot: { scope: 'A' } }),
      });
      const versionB = await api(page, session, '/rest/v1/project_versions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_id: projectId, user_id: session.userId, environment_id: environmentB, version_number: 1, snapshot: { scope: 'B' } }),
      });
      expect(versionA.status).toBe(201);
      expect(versionB.status).toBe(201);
      const vA = (versionA.body as Array<{ id: string }>)[0].id;
      const vB = (versionB.body as Array<{ id: string }>)[0].id;

      const [messageA, messageB] = await Promise.all([
        api(page, session, '/rest/v1/chat_messages', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ user_id: session.userId, sender: 'user', text: 'snapshot-A', project_id: projectId, environment_id: environmentA, version_id: vA }),
        }),
        api(page, session, '/rest/v1/chat_messages', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ user_id: session.userId, sender: 'user', text: 'snapshot-B', project_id: projectId, environment_id: environmentB, version_id: vB }),
        }),
      ]);
      expect(messageA.status).toBe(201);
      expect(messageB.status).toBe(201);

      const invalidEnvironment = await api(page, session, '/rest/v1/chat_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: session.userId, sender: 'user', text: 'invalid', project_id: projectId, environment_id: environmentB, version_id: vA }),
      });
      expect([400, 409]).toContain(invalidEnvironment.status);

      const legacy = await api(page, session, '/rest/v1/chat_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: session.userId, sender: 'user', text: 'legacy-project-only', project_id: projectId }),
      });
      expect(legacy.status).toBe(201);
    } finally {
      if (projectId) await api(page, session, `/rest/v1/projects?id=eq.${projectId}`, { method: 'DELETE' });
    }
  });

  test('IARA merge is concurrent-safe and plant suggestions require confirmation', async ({ authenticatedPage: page }) => {
    const session = await getSession(page);
    let projectId = '';
    try {
      const project = await api(page, session, '/rest/v1/projects', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: session.userId, name: `__E2E_PLANT_${Date.now()}__` }),
      });
      expect(project.status).toBe(201);
      projectId = (project.body as Array<{ id: string }>)[0].id;

      const env = await api(page, session, '/rest/v1/project_environments', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_id: projectId, name: 'Base', position: 0 }),
      });
      const environmentId = (env.body as Array<{ id: string }>)[0].id;
      const version = await api(page, session, '/rest/v1/project_versions', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_id: projectId, user_id: session.userId, environment_id: environmentId, version_number: 1, snapshot: {} }),
      });
      const versionId = (version.body as Array<{ id: string }>)[0].id;

      const rpc = (summary: string, decision: string) => api(page, session, '/rest/v1/rpc/merge_iara_context', {
        method: 'POST',
        body: JSON.stringify({ p_user_id: session.userId, p_client_id: null, p_project_id: projectId, p_environment_id: environmentId, p_version_id: versionId, p_summary: summary, p_decisions: [{ id: decision }], p_artifacts: [], p_last_correlation_id: decision }),
      });
      const [mergeA, mergeB] = await Promise.all([rpc('A', 'decision-A'), rpc('B', 'decision-B')]);
      expect(mergeA.status).toBe(200);
      expect(mergeB.status).toBe(200);

      const contexts = await api(page, session, `/rest/v1/project_iara_contexts?project_id=eq.${projectId}&select=decisions,last_correlation_id`);
      expect(contexts.status).toBe(200);
      const decisions = (contexts.body as Array<{ decisions: Array<{ id: string }>; last_correlation_id: string }>)[0].decisions.map(item => item.id);
      expect(decisions).toEqual(expect.arrayContaining(['decision-A', 'decision-B']));

      const plan = await api(page, session, '/rest/v1/project_plans', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_id: projectId, name: 'Planta E2E' }),
      });
      const planId = (plan.body as Array<{ id: string }>)[0].id;
      const analysis = await api(page, session, '/rest/v1/project_plan_analyses', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_plan_id: planId, project_id: projectId, status: 'completed', result: { rooms: ['Kitchen', 'Suite'] } }),
      });
      const analysisId = (analysis.body as Array<{ id: string }>)[0].id;
      const suggestions = await api(page, session, '/rest/v1/project_plan_environment_suggestions', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify([
          { project_plan_id: planId, analysis_id: analysisId, project_id: projectId, name: 'Kitchen', type: 'kitchen', position: 1, status: 'pending' },
          { project_plan_id: planId, analysis_id: analysisId, project_id: projectId, name: 'Suite', type: 'bedroom', position: 2, status: 'pending' },
        ]),
      });
      expect(suggestions.status).toBe(201);
      const suggestionRows = suggestions.body as Array<{ id: string; name: string }>;
      const kitchenSuggestion = suggestionRows.find(row => row.name === 'Kitchen')!.id;
      const suiteSuggestion = suggestionRows.find(row => row.name === 'Suite')!.id;

      const before = await api(page, session, `/rest/v1/project_environments?project_id=eq.${projectId}&select=id,name`);
      expect((before.body as unknown[]).length).toBe(1);

      const confirm1 = await api(page, session, '/rest/v1/rpc/confirm_project_plan_environment_suggestion', {
        method: 'POST', body: JSON.stringify({ p_suggestion_id: kitchenSuggestion, p_name: 'Cozinha' }),
      });
      const confirm2 = await api(page, session, '/rest/v1/rpc/confirm_project_plan_environment_suggestion', {
        method: 'POST', body: JSON.stringify({ p_suggestion_id: kitchenSuggestion, p_name: 'Cozinha' }),
      });
      expect(confirm1.status).toBe(200);
      expect(confirm2.status).toBe(200);

      const afterConfirm = await api(page, session, `/rest/v1/project_environments?project_id=eq.${projectId}&name=eq.Cozinha&select=id,name`);
      expect(afterConfirm.status).toBe(200);
      expect((afterConfirm.body as unknown[]).length).toBe(1);

      const reject = await api(page, session, `/rest/v1/project_plan_environment_suggestions?id=eq.${suiteSuggestion}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'rejected' }),
      });
      expect(reject.status).toBe(200);

      const reprocess = await api(page, session, '/rest/v1/project_plan_analyses', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ project_plan_id: planId, project_id: projectId, status: 'completed', result: { rooms: ['Kitchen', 'Suite', 'Laundry'] } }),
      });
      expect(reprocess.status).toBe(201);
    } finally {
      if (projectId) await api(page, session, `/rest/v1/projects?id=eq.${projectId}`, { method: 'DELETE' });
    }
  });

  test('RLS rejects access to an unowned project UUID', async ({ authenticatedPage: page }) => {
    const session = await getSession(page);
    const foreignId = '11111111-1111-4111-8111-111111111111';
    const read = await api(page, session, `/rest/v1/projects?id=eq.${foreignId}`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual([]);

    const insert = await api(page, session, '/rest/v1/project_environments', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ project_id: foreignId, name: 'Should Be Blocked' }),
    });
    expect([401, 403]).toContain(insert.status);
  });
});
