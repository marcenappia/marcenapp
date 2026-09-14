import { test, expect } from './fixtures/authenticated';

test.describe('Billing P0 acceptance', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Billing proof runs once in Chromium.');

  test('authenticates, opens Billing and reaches a protected Edge Function with the JWT', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'Créditos e Planos' }).click();
    await expect(page.getByRole('heading', { name: /Planos e Central de Uso/i })).toBeVisible();
    await expect(page.getByText('MARCENAPP Essencial')).toBeVisible();
    await expect(page.getByText('MARCENAPP Profissional')).toBeVisible();
    await expect(page.getByText('MARCENAPP Empresa')).toBeVisible();
    await expect(page.getByText('MARCENAPP Pro / Factory')).toBeVisible();

    const authToken = await page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([key]) => key.includes('-auth-token'))?.[1];
      if (!entry) return null;
      try { return JSON.parse(entry).access_token ?? null; } catch { return null; }
    });
    expect(authToken).toMatch(/^ey[A-Za-z0-9_-]+\./);

    const response = await page.request.post('https://uzhqhieqlcyncelltfjw.supabase.co/functions/v1/asaas', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { action: 'get_wallet' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json() as { wallet?: unknown; error?: string };
    expect(body.error).toBeUndefined();
    expect(body.wallet).toBeDefined();
  });

  test('does not execute a real billing operation unless an explicit Sandbox harness is configured', async () => {
    test.skip(!process.env.BILLING_E2E_SANDBOX_URL, 'EXTERNAL BLOCKER — ASAAS SANDBOX CREDENTIALS UNAVAILABLE');
    expect(process.env.BILLING_E2E_SANDBOX_URL).toMatch(/^https:\/\//);
    expect(process.env.BILLING_E2E_SANDBOX_ENVIRONMENT).toBe('sandbox');
  });
});
