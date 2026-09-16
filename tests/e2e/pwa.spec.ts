import { test, expect } from '@playwright/test';

test('PWA manifest and service worker are published', async ({ page, request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const manifestBody = await manifest.json();

  expect(manifestBody.name).toBe('Marcenapp');
  expect(manifestBody.display).toBe('standalone');
  expect(manifestBody.start_url).toBe('/');
  expect(manifestBody.scope).toBe('/');
  expect(manifestBody.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', src: '/pwa-icon.svg' }),
    expect.objectContaining({ sizes: '512x512', src: '/pwa-icon.svg' }),
  ]));

  const worker = await request.get('/sw.js');
  expect(worker.ok()).toBeTruthy();
  expect(await worker.text()).toContain("marcenapp-shell-v1");

  await page.goto('/');
  await expect(page).toHaveTitle(/Marcenapp/);
  await expect.poll(async () => page.evaluate(() => 'serviceWorker' in navigator)).toBeTruthy();
});
