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

  test('production serves an installable PWA manifest and Service Worker', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
    const manifest = await manifestResponse.json() as {
      display?: string;
      start_url?: string;
      icons?: Array<{ src?: string; sizes?: string; type?: string }>;
    };
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }),
    ]));

    const serviceWorkerResponse = await request.get('/sw.js');
    expect(serviceWorkerResponse.ok()).toBe(true);
    expect(serviceWorkerResponse.headers()['content-type']).toContain('javascript');
    expect(await serviceWorkerResponse.text()).toContain('marcenapp-static-v1');
  });

  test('Service Worker keeps the app shell available offline', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, serviceWorkers: 'allow' });
    const page = await context.newPage();

    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    // Recarrega uma vez online para que o Service Worker capture os bundles do app shell.
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Sua marcenaria trabalha\./i })).toBeVisible();

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Marcenapp/i);
    await expect(page.getByRole('heading', { name: /Sua marcenaria trabalha\./i })).toBeVisible();

    await context.close();
  });
});
