import { test as base, expect, type Page } from '@playwright/test';

type AuthenticatedFixtures = {
  authenticatedPage: Page;
};

const SUPABASE_AUTH_STORAGE_KEY = 'sb-uzhqhieqlcyncelltfjw-auth-token';

export const test = base.extend<AuthenticatedFixtures>({
  authenticatedPage: async ({ browser, baseURL }, fixtureUse) => {
    const encodedSession = process.env.E2E_SESSION_B64;
    if (!encodedSession) {
      throw new Error('E2E authenticated gate did not receive the ephemeral CI session.');
    }

    const session = JSON.parse(Buffer.from(encodedSession, 'base64').toString('utf8'));
    if (!session?.access_token || !session?.refresh_token || !session?.user?.id) {
      throw new Error('E2E bootstrap returned an invalid Supabase session.');
    }

    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.goto('/auth');
    await page.evaluate(
      ({ storageKey, value }) => {
        window.localStorage.setItem(storageKey, value);
      },
      {
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        value: JSON.stringify(session),
      },
    );
    await page.reload();
    await expect(page).toHaveURL(/\/$/);

    await fixtureUse(page);
    await context.close();
  },
});

export { expect };
