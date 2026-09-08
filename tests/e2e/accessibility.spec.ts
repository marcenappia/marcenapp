import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const desktopModules = [
  'dashboard', 'novo', 'clientes', 'diario', 'studio', 'elevator',
  'orcamento', 'producao', 'corte', 'contrato',
];
const mobileModules = ['dashboard', 'novo', 'diario', 'studio', 'orcamento'];

test.describe('Navegação, acessibilidade e responsividade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    const skip = page.getByRole('button', { name: /pular/i }).first();
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.locator('body')).toBeVisible();
  });

  test('sidebar desktop expõe módulos válidos e passa no axe', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop only');
    for (const id of desktopModules) {
      const button = page.locator(`#nav-${id}`);
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-label', /.+/);
      await expect(button).toHaveClass(/focus-visible:ring/);
      const results = await new AxeBuilder({ page }).include(`#nav-${id}`).analyze();
      expect(results.violations).toEqual([]);
    }
  });

  test('bottom nav mobile mantém cinco ações sem overflow', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 800 });
      const nav = page.locator('nav.md\\:hidden').last();
      await expect(nav).toBeVisible();
      const navBox = await nav.boundingBox();
      expect(navBox).not.toBeNull();
      expect(navBox!.width).toBeLessThanOrEqual(width);
      for (const id of mobileModules) await expect(page.locator(`#mobile-nav-${id}`)).toBeVisible();
    }
  });

  test('módulos atualizam aria-current sem depender de URL', async ({ page, isMobile }) => {
    const modules = isMobile ? mobileModules : desktopModules;
    const prefix = isMobile ? '#mobile-nav-' : '#nav-';
    for (const id of modules) {
      const button = page.locator(`${prefix}${id}`);
      await button.click();
      await expect(button).toHaveAttribute('aria-current', 'page');
    }
  });

  test('ações de navegação são focáveis por teclado', async ({ page, isMobile }) => {
    const modules = isMobile ? mobileModules : desktopModules;
    const prefix = isMobile ? '#mobile-nav-' : '#nav-';
    for (const id of modules) {
      const button = page.locator(`${prefix}${id}`);
      await button.focus();
      await expect(button).toBeFocused();
    }
  });

  test('IARA permanece acessível pelo cabeçalho', async ({ page }) => {
    const iaraButton = page.locator('button[aria-label="Estúdio + IARA"]:visible').first();
    await expect(iaraButton).toBeVisible();
    await iaraButton.click();
    await expect(page.getByRole('dialog', { name: /IARA — Assistente técnica/i })).toBeVisible();
    await expect(page.getByText('Modo técnico seguro')).toBeVisible();
  });
});
