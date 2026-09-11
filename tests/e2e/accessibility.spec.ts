import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FORBIDDEN_LEGACY_HOSTS = /(^|\.)lovable\.app$|(^|\.)lovableproject\.com$|(^|\.)lovable\.dev$/i;

const assertNoLovableNavigation = (page: import('@playwright/test').Page) => {
  const seen: string[] = [];
  const check = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      if (FORBIDDEN_LEGACY_HOSTS.test(hostname)) seen.push(url);
    } catch {
      // Ignore non-URL values.
    }
  };

  page.on('request', request => check(request.url()));
  page.on('framenavigated', frame => check(frame.url()));
  page.on('response', response => check(response.url()));

  return () => {
    expect(seen, `Legacy Lovable navigation detected: ${seen.join(', ')}`).toEqual([]);
  };
};

test.describe('Marcenapp public production acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Marcenapp/i);
  });

  test('public landing page renders its primary conversion flow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Sua marcenaria inteira, conectada/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar ou cadastrar/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Conhecer a plataforma/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Do primeiro desenho ao pós-venda/i })).toBeVisible();
  });

  test('public landing page passes an axe accessibility audit', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('auth entry renders the email/password flow without legacy Google entry point', async ({ page }) => {
    const assertClean = assertNoLovableNavigation(page);
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: /MARCENAPP/i })).toBeVisible();
    await expect(page.getByText(/Acesso seguro por e-mail/i)).toBeVisible();
    await expect(page.getByPlaceholder('E-mail')).toBeVisible();
    await expect(page.getByPlaceholder('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cadastre-se/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar com Google/i })).toHaveCount(0);
    assertClean();
  });

  test('auth navigation never reaches a Lovable legacy host', async ({ page }) => {
    const assertClean = assertNoLovableNavigation(page);
    await page.goto('/auth');
    await page.getByRole('button', { name: /Esqueceu a senha/i }).click();
    await expect(page.getByRole('button', { name: /Enviar Recuperação/i })).toBeVisible();
    await page.getByRole('button', { name: /Voltar para o login/i }).click();
    await page.getByRole('button', { name: /Cadastre-se/i }).click();
    await expect(page.getByPlaceholder('Nome completo')).toBeVisible();
    assertClean();
  });

  test('auth route exposes password recovery and registration states', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: /Esqueceu a senha/i }).click();
    await expect(page.getByRole('button', { name: /Enviar Recuperação/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Voltar para o login/i })).toBeVisible();

    await page.getByRole('button', { name: /Voltar para o login/i }).click();
    await page.getByRole('button', { name: /Cadastre-se/i }).click();
    await expect(page.getByPlaceholder('Nome completo')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cadastrar' })).toBeVisible();
  });

  test('navigation anchors work on the public landing page', async ({ page }) => {
    await page.getByRole('link', { name: 'Como funciona' }).click();
    await expect(page).toHaveURL(/#como-funciona$/);
    await expect(page.locator('#como-funciona')).toBeVisible();

    await page.getByRole('link', { name: 'Recursos' }).click();
    await expect(page).toHaveURL(/#recursos$/);
    await expect(page.locator('#recursos')).toBeVisible();
  });

  test('mobile landing page remains usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('button', { name: /Entrar ou cadastrar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Como funciona' })).toBeVisible();
  });

  test('authenticated application is not exposed without a session', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Sua marcenaria inteira, conectada/i })).toBeVisible();
    await expect(page.getByText(/Painel da marcenaria/i)).toBeVisible();
  });

  test('unknown routes resolve to the application fallback instead of a server error', async ({ page }) => {
    const response = await page.goto('/rota-que-nao-existe');
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/Página não encontrada/i)).toBeVisible();
  });
});
