import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FORBIDDEN_LEGACY_HOSTS = /(^|\.)lovable\.app$|(^|\.)lovableproject\.com$|(^|\.)lovable\.dev$/i;

const assertNoLovableNavigation = (page: import('@playwright/test').Page) => {
  const seen: string[] = [];
  const check = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      if (FORBIDDEN_LEGACY_HOSTS.test(hostname)) seen.push(url);
    } catch { return; }
  };
  page.on('request', request => check(request.url()));
  page.on('framenavigated', frame => check(frame.url()));
  page.on('response', response => check(response.url()));
  return () => expect(seen, `Legacy Lovable navigation detected: ${seen.join(', ')}`).toEqual([]);
};

test.describe('Marcenapp public acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Marcenapp/i);
  });

  test('public landing page renders the current product and conversion flow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Sua marcenaria trabalha\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /A IARA acelera\./i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Começar agora' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver como funciona' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Você não precisa recomeçar o projeto/i })).toBeVisible();
  });

  test('serves a version manifest for production verification', async ({ request }) => {
    const response = await request.get('/version.json');
    expect(response.ok()).toBe(true);
    const manifest = await response.json() as { commit?: string; shortCommit?: string; environment?: string };
    expect(manifest.commit).toMatch(/^[a-f0-9]{40}$/i);
    expect(manifest.shortCommit).toMatch(/^[a-f0-9]{8}$/i);
    expect(manifest.environment).toBeTruthy();
  });

  test('serves an installable PWA manifest and icons', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
    const manifest = await manifestResponse.json() as {
      name?: string;
      display?: string;
      start_url?: string;
      icons?: Array<{ src?: string; sizes?: string; type?: string }>;
    };
    expect(manifest.name).toMatch(/Marcenapp/i);
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }),
    ]));

    for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png']) {
      const response = await request.get(icon);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/png');
    }
  });

  test('serves the PWA Service Worker', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('javascript');
    expect(await response.text()).toContain('marcenapp-static-v1');
  });

  test('public landing page passes an axe accessibility audit', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('auth entry renders the official email/password flow', async ({ page }) => {
    const assertClean = assertNoLovableNavigation(page);
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: /MARCENAPP/i })).toBeVisible();
    await expect(page.getByPlaceholder('E-mail')).toBeVisible();
    await expect(page.getByPlaceholder('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar com Google/i })).toBeVisible();
    assertClean();
  });

  test('auth navigation exposes recovery and registration states', async ({ page }) => {
    const assertClean = assertNoLovableNavigation(page);
    await page.goto('/auth');
    await page.getByRole('button', { name: /Esqueceu a senha/i }).click();
    await expect(page.getByRole('button', { name: /Enviar Recuperação/i })).toBeVisible();
    await page.getByRole('button', { name: /Voltar para o login/i }).click();
    await page.getByRole('button', { name: /Cadastre-se/i }).click();
    await expect(page.getByPlaceholder('Nome completo')).toBeVisible();
    await expect(page.getByRole('button', { name: /Criar conta/i })).toBeVisible();
    assertClean();
  });

  test('public navigation anchors work', async ({ page }) => {
    await page.getByRole('link', { name: 'Como funciona' }).click();
    await expect(page).toHaveURL(/#fluxo$/);
    await expect(page.locator('#fluxo')).toBeVisible();
    await page.getByRole('link', { name: 'Recursos' }).click();
    await expect(page).toHaveURL(/#recursos$/);
    await expect(page.locator('#recursos')).toBeVisible();
    await page.getByRole('link', { name: 'Valores' }).click();
    await expect(page).toHaveURL(/#valores$/);
    await expect(page.locator('#valores')).toBeVisible();
  });

  test('mobile landing page remains usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('button', { name: 'Começar agora' }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Produto' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Recursos' })).toBeVisible();
  });

  test('public purchase flow preserves the selected product', async ({ page }) => {
    const buy = page.getByRole('button', { name: 'Comprar' }).first();
    await expect(buy).toBeVisible();
    await buy.click();
    await expect(page).toHaveURL(/\/auth\?purchase=[^&]+/);
  });

  test('unknown routes resolve to the application fallback instead of a server error', async ({ page }) => {
    const response = await page.goto('/rota-que-nao-existe');
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/Página não encontrada/i)).toBeVisible();
  });
});
