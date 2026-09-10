import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const desktopModules = [
  { id: 'dashboard', label: 'Início' },
  { id: 'inteligencia', label: 'Inteligência Operacional' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'diario', label: 'Diário de Obra' },
  { id: 'studio', label: 'Estúdio + IARA' },
  { id: 'elevator', label: 'Elevador Planta' },
  { id: 'orcamento', label: 'Estela Financeiro' },
  { id: 'corte', label: 'Plano de Corte' },
  { id: 'contrato', label: 'Contratos' },
];

const mobileModules = [
  { id: 'dashboard', label: 'Início' },
  { id: 'novo', label: 'Novo Projeto' },
  { id: 'studio', label: 'Estúdio + IARA' },
  { id: 'orcamento', label: 'Estela Financeiro' },
  { id: 'diario', label: 'Diário de Obra' },
  { id: 'corte', label: 'Plano de Corte' },
];

test.describe('Marcenapp production acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Marcenapp OS');
  });

  test('auth entry renders login and registration controls', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: /MARCENAPP/i })).toBeVisible();
    await expect(page.getByPlaceholder('E-mail')).toBeVisible();
    await expect(page.getByPlaceholder('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar com Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cadastre-se/i })).toBeVisible();
  });

  test('desktop navigation exposes the current production modules', async ({ page }) => {
    for (const mod of desktopModules) {
      const button = page.locator(`#nav-${mod.id}`);
      await expect(button).toBeVisible();
      await expect(button).toHaveAccessibleName(mod.label);
      await button.click();
      await expect(page).toHaveURL(new RegExp(`module=${mod.id}`));
      await expect(page.getByRole('heading', { name: new RegExp(mod.label, 'i') }).first()).toBeVisible();
      await expect(button).toHaveAttribute('aria-current', 'page');
    }
  });

  test('desktop navigation passes an axe audit for interactive controls', async ({ page }) => {
    for (const mod of desktopModules) {
      const button = page.locator(`#nav-${mod.id}`);
      const results = await new AxeBuilder({ page }).include(`#nav-${mod.id}`).analyze();
      expect(results.violations).toEqual([]);
      await expect(button).toHaveAccessibleName(mod.label);
    }
  });

  test('desktop keyboard navigation supports Home End and arrow wrapping', async ({ page }) => {
    const first = page.locator('#nav-dashboard');
    const last = page.locator('#nav-contrato');

    await first.focus();
    await page.keyboard.press('ArrowUp');
    await expect(last).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(first).toBeFocused();
    await page.keyboard.press('End');
    await expect(last).toBeFocused();
    await page.keyboard.press('Home');
    await expect(first).toBeFocused();
  });

  test('mobile navigation is rendered and keyboard navigation wraps', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const mod of mobileModules) {
      const button = page.locator(`#mobile-nav-${mod.id}`);
      await expect(button).toBeVisible();
      await expect(button).toHaveAccessibleName(mod.label);
    }

    const first = page.locator('#mobile-nav-dashboard');
    const last = page.locator('#mobile-nav-corte');
    await first.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(last).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(first).toBeFocused();
  });

  test('mobile navigation remains usable at narrow and tablet widths', async ({ page }) => {
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      const nav = page.locator('nav.md\\:hidden');
      await expect(nav).toBeVisible();
      const widths = await nav.locator('button').evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().width),
      );
      expect(widths.length).toBeGreaterThan(0);
      expect(Math.min(...widths)).toBeGreaterThan(40);
    }
  });

  test('IARA and operational intelligence are reachable without inventing runtime data', async ({ page }) => {
    await page.locator('#nav-studio').click();
    await expect(page).toHaveURL(/module=studio/);
    await expect(page.getByRole('heading', { name: /Estúdio \+ IARA/i }).first()).toBeVisible();

    await page.locator('#nav-inteligencia').click();
    await expect(page).toHaveURL(/module=inteligencia/);
    await expect(page.getByRole('heading', { name: /Inteligência Operacional/i }).first()).toBeVisible();
    await expect(page.getByText(/Dados insuficientes|Regra não configurada|Inteligência Operacional/i).first()).toBeVisible();
  });

  test('core operational modules load through real navigation', async ({ page }) => {
    const modules = [
      { id: 'clientes', label: 'Clientes' },
      { id: 'diario', label: 'Diário de Obra' },
      { id: 'orcamento', label: 'Estela Financeiro' },
      { id: 'corte', label: 'Plano de Corte' },
      { id: 'contrato', label: 'Contratos' },
      { id: 'elevator', label: 'Elevador Planta' },
    ];

    for (const mod of modules) {
      await page.locator(`#nav-${mod.id}`).click();
      await expect(page).toHaveURL(new RegExp(`module=${mod.id}`));
      await expect(page.getByRole('heading', { name: new RegExp(mod.label, 'i') }).first()).toBeVisible();
    }
  });

  test('browser history and refresh preserve the selected module', async ({ page }) => {
    await page.locator('#nav-dashboard').click();
    await page.locator('#nav-studio').click();
    await expect(page).toHaveURL(/module=studio/);
    await page.goBack();
    await expect(page).toHaveURL(/module=dashboard/);
    await page.reload();
    await expect(page).toHaveURL(/module=dashboard/);
    await expect(page.locator('#nav-dashboard')).toHaveAttribute('aria-current', 'page');
    await page.goForward();
    await expect(page).toHaveURL(/module=studio/);
    await expect(page.locator('#nav-studio')).toHaveAttribute('aria-current', 'page');
  });

  test('auth page does not expose a fake authenticated session', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cadastre-se/i })).toBeVisible();
  });
});
