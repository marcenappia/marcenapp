import { test as base, expect, type Page } from '@playwright/test';

type AuthenticatedFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthenticatedFixtures>({
  authenticatedPage: async ({ browser, baseURL }, fixtureUse) => {
    const email = process.env.E2E_EMAIL?.trim();
    const password = process.env.E2E_PASSWORD;
    if (!email || !password) {
      throw new Error('E2E authenticated gate requires E2E_EMAIL and E2E_PASSWORD GitHub Actions secrets.');
    }

    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    const authResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/auth/v1/token'),
      { timeout: 30_000 },
    );

    await page.goto('/auth');
    await page.getByPlaceholder('E-mail').fill(email);
    await page.getByPlaceholder('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    const authResponse = await authResponsePromise;
    if (!authResponse.ok()) {
      let details = `status=${authResponse.status()}`;
      try {
        const body = (await authResponse.json()) as {
          error?: unknown;
          error_code?: unknown;
          msg?: unknown;
        };
        const safe = {
          error: typeof body.error === 'string' ? body.error : undefined,
          error_code: typeof body.error_code === 'string' ? body.error_code : undefined,
          msg: typeof body.msg === 'string' ? body.msg : undefined,
        };
        details += ` ${JSON.stringify(safe)}`;
      } catch {
        // Keep diagnostics free of response bodies when the error payload is unexpected.
      }
      throw new Error(`E2E Supabase authentication failed: ${details}`);
    }

    await expect(page).toHaveURL(/\/$/);

    await fixtureUse(page);
    await context.close();
  },
});

export { expect };
