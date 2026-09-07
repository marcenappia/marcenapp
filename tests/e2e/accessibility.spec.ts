import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const desktopModules = [
  'dashboard',
  'novo',
  'clientes',
  'diario',
  'studio',
  'elevator',
  'orcamento',
  'producao',
  'corte',
  'contrato',
];

const mobileModules = ['dashboard', 'novo', 'diario', 'studio', 'orcamento'];

test.describe('Navegação, acessibilidade e responsividade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

      for (const id of mobileModules) {
        await expect(page.locator(`#mobile-nav-${id}`)).toBeVisible();
      }
    }
  });

  test('cada módulo sincroniza URL, título e aria-current', async ({ page, isMobile }) => {
    const modules = isMobile ? mobileModules : desktopModules;
    const prefix = isMobile ? '#mobile-nav-' : '#nav-';

    for (const id of modules) {
      const button = page.locator(`${prefix}${id}`);
      await button.click();
      await expect(page).toHaveURL(new RegExp(`module=${id}`));
      await expect(button).toHaveAttribute('aria-current', 'page');
      await expect(page).toHaveTitle(/.+\| MARCENAPP/i);
    }
  });

  test('navegação por teclado funciona sem depender de módulos removidos', async ({ page, isMobile }) => {
    const modules = isMobile ? mobileModules : desktopModules;
    const prefix = isMobile ? '#mobile-nav-' : '#nav-';
    const first = page.locator(`${prefix}${modules[0]}`);
    const last = page.locator(`${prefix}${modules[modules.length - 1]}`);

    await first.focus();
    await expect(first).toBeFocused();

    if (isMobile) {
      await page.keyboard.press('ArrowLeft');
      await expect(last).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(first).toBeFocused();
    } else {
      await page.keyboard.press('ArrowUp');
      await expect(last).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(first).toBeFocused();
      await page.keyboard.press('End');
      await expect(last).toBeFocused();
      await page.keyboard.press('Home');
      await expect(first).toBeFocused();
    }
  });

  test('IARA permanece acessível pelo cabeçalho', async ({ page }) => {
    const iaraButton = page.getByRole('button', { name: 'Estúdio + IARA' }).first();
    await expect(iaraButton).toBeVisible();
    await iaraButton.click();
    await expect(page.getByRole('dialog', { name: /IARA — Assistente técnica/i })).toBeVisible();
    await expect(page.getByText('Modo técnico seguro')).toBeVisible();
  });
});
