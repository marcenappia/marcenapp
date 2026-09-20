import { test, expect } from '@playwright/test';

test.describe('Marcenapp production smoke', () => {
  test('production serves the current version manifest and landing page', async ({ page, request }) => {
    const versionResponse = await request.get('/version.json');
    expect(versionResponse.ok()).toBe(true);
    const manifest = await versionResponse.json() as { commit?: string; shortCommit?: string; environment?: string };
    expect(manifest.commit).toMatch(/^[a-f0-9]{40}$/i);
    expect(manifest.shortCommit).toMatch(/^[a-f0-9]{8}$/i);
    expect(manifest.environment).toBe(process.env.PLAYWRIGHT_BASE_URL ? 'production' : 'local');

    const pageResponse = await page.goto('/');
    expect(pageResponse?.status()).toBe(200);
    await expect(page).toHaveTitle(/Marcenapp/i);
    await expect(page.getByRole('heading', { name: /Sua marcenaria trabalha\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /A IARA acelera\./i })).toBeVisible();
  });
});
