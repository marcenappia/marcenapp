import { test as base, expect, type Page } from '@playwright/test';

type AuthenticatedFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthenticatedFixtures>({
  authenticatedPage: async ({ browser, baseURL }, use) => {
    const email = process.env.E2E_EMAIL?.trim();
    const password = process.env.E2E_PASSWORD;
    if (!email || !password) {
      throw new Error('E2E authenticated gate requires E2E_EMAIL and E2E_PASSWORD.');
    }

    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.goto('/auth');
    await page.getByPlaceholder('E-mail').fill(email);
    await page.getByPlaceholder('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/$/);

    await use(page);
    await context.close();
  },
});

export { expect };
