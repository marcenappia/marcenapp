import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit & Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const skipButton = page.getByRole('button', { name: /pular/i });
    if (await skipButton.isVisible()) await skipButton.click();
    await page.waitForTimeout(500);
  });

  test('should pass accessibility audit and visual regression for Sidebar and BottomNav', async ({ page, isMobile }) => {
    const moduleIds = isMobile
      ? ['dashboard', 'novo', 'studio', 'orcamento', 'diario', 'corte']
      : ['dashboard', 'clientes', 'studio', 'orcamento'];

    for (const id of moduleIds) {
      const selector = isMobile ? `#mobile-nav-${id}` : `#nav-${id}`;
      const btn = page.locator(selector).first();
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute('aria-label', /.+/);
      let results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-default.png`);
      await btn.hover();
      results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-hover.png`);
      await btn.focus();
      results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-focus.png`);
      await btn.click();
      await expect(btn).toHaveAttribute('aria-current', 'page');
      results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-active.png`);
    }
  });

  test('navigation tab order and sync (Desktop & Mobile)', async ({ page, isMobile }) => {
    const moduleIds = isMobile
      ? ['dashboard', 'novo', 'studio', 'orcamento', 'diario', 'corte']
      : ['dashboard', 'clientes', 'diario', 'studio', 'elevator', 'orcamento', 'corte', 'contrato'];
    const prefix = isMobile ? '#mobile-nav-' : '#nav-';
    const buttons = moduleIds.map(id => page.locator(`${prefix}${id}`));
    for (const btn of buttons) await expect(btn).toBeVisible();
    await buttons[0].focus();
    for (let i = 0; i < moduleIds.length; i++) {
      const id = moduleIds[i];
      const btn = buttons[i];
      const label = await btn.getAttribute('aria-label');
      await expect(btn).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`module=${id}`));
      await expect(page).toHaveTitle(new RegExp(label || id, 'i'));
      await expect(btn).toHaveAttribute('aria-current', 'page');
      if (i < moduleIds.length - 1) await buttons[i + 1].focus();
    }
  });

  test('should synchronize URL, title and ARIA in Sidebar (Desktop)', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop sidebar test');
    const sidebarModules = [
      { id: 'clientes', label: 'Clientes' },
      { id: 'orcamento', label: 'Estela Financeiro' }
    ];
    for (const mod of sidebarModules) {
      const btn = page.locator(`#nav-${mod.id}`);
      await btn.click();
      await expect(page).toHaveURL(new RegExp(`module=${mod.id}`));
      await expect(page).toHaveTitle(new RegExp(mod.label, 'i'));
      await expect(btn).toHaveAttribute('aria-current', 'page');
      const otherMod = sidebarModules.find(m => m.id !== mod.id)!;
      const otherBtn = page.locator(`#nav-${otherMod.id}`);
      await otherBtn.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`module=${otherMod.id}`));
      await expect(otherBtn).toHaveAttribute('aria-current', 'page');
    }
  });

  test('should verify responsive layouts and visual states for BottomNav', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile responsiveness test');
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      const bottomNav = page.locator('nav.md\\:hidden');
      await expect(bottomNav).toBeVisible();
      const rects = await page.evaluate(() => {
        const nav = document.querySelector('nav.md\\:hidden');
        if (!nav) return null;
        return Array.from(nav.children).map(c => c.getBoundingClientRect().width);
      });
      expect(rects?.[0]).toBeGreaterThan(40);
      await expect(bottomNav).toHaveScreenshot(`bottom-nav-res-${width}.png`);
    }
  });

  test('screen reader accessibility and ARIA labels', async ({ page, isMobile }) => {
    const mod = { id: 'studio', label: 'Estúdio + IARA' };
    const selector = isMobile ? `#mobile-nav-${mod.id}` : `#nav-${mod.id}`;
    const btn = page.locator(selector).first();
    await expect(btn).toBeVisible();
    await btn.focus();
    await expect(btn).toHaveAttribute('aria-label', mod.label);
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-current', 'page');
  });

  test('should navigate using Enter and Space keys with URL and Title verification', async ({ page, isMobile }) => {
    const navModules = [
      { id: 'dashboard', label: 'Início' },
      { id: 'clientes', label: 'Clientes' },
      { id: 'studio', label: 'Estúdio + IARA' }
    ];
    for (const mod of navModules) {
      const selector = isMobile ? `#mobile-nav-${mod.id}` : `#nav-${mod.id}`;
      const btn = page.locator(selector).first();
      await btn.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: new RegExp(mod.label, 'i') })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(mod.label, 'i'));
      await expect(page).toHaveURL(new RegExp(`module=${mod.id}`));
      await expect(btn).toHaveAttribute('aria-current', 'page');
      const otherMod = navModules.find(m => m.id !== mod.id)!;
      const otherSelector = isMobile ? `#mobile-nav-${otherMod.id}` : `#nav-${otherMod.id}`;
      const otherBtn = page.locator(otherSelector).first();
      await otherBtn.focus();
      await page.keyboard.press('Space');
      await expect(page.getByRole('heading', { name: new RegExp(otherMod.label, 'i') })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(otherMod.label, 'i'));
      await expect(page).toHaveURL(new RegExp(`module=${otherMod.id}`));
    }
  });

  test('sidebar keyboard navigation wrap-around (ArrowUp/ArrowDown)', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop sidebar test only');
    const moduleIds = ['dashboard', 'clientes', 'diario', 'studio', 'elevator', 'orcamento', 'corte', 'contrato'];
    const firstBtn = page.locator(`#nav-${moduleIds[0]}`);
    const lastBtn = page.locator(`#nav-${moduleIds[moduleIds.length - 1]}`);
    await firstBtn.focus();
    await page.keyboard.press('ArrowUp');
    await expect(lastBtn).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(firstBtn).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(`#nav-${moduleIds[2]}`)).toBeFocused();
    await page.keyboard.press('End');
    await expect(lastBtn).toBeFocused();
    await page.keyboard.press('Home');
    await expect(firstBtn).toBeFocused();
  });

  test('mobile bottom nav keyboard navigation and tab order', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile test only');
    const mobileModuleIds = ['dashboard', 'novo', 'studio', 'orcamento', 'diario', 'corte'];
    const firstBtn = page.locator(`#mobile-nav-${mobileModuleIds[0]}`);
    const lastBtn = page.locator(`#mobile-nav-${mobileModuleIds[mobileModuleIds.length - 1]}`);
    await firstBtn.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(`#mobile-nav-${mobileModuleIds[1]}`)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(firstBtn).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(lastBtn).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(firstBtn).toBeFocused();
    await page.keyboard.press('Home');
    await expect(firstBtn).toBeFocused();
    for (let i = 1; i < mobileModuleIds.length; i++) {
      await page.keyboard.press('ArrowRight');
      await expect(page.locator(`#mobile-nav-${mobileModuleIds[i]}`)).toBeFocused();
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`module=${mobileModuleIds[mobileModuleIds.length - 1]}`));
  });

  test('should synchronize state with browser history (back/forward) and refresh', async ({ page }) => {
    await page.locator('#nav-dashboard').click();
    await page.locator('#nav-studio').click();
    await page.goBack();
    await expect(page).toHaveURL(/module=dashboard/);
    await expect(page).toHaveTitle(/Início/i);
    await expect(page.locator('#nav-dashboard')).toHaveAttribute('aria-current', 'page');
    await page.reload();
    await expect(page).toHaveURL(/module=dashboard/);
    await expect(page).toHaveTitle(/Início/i);
    await expect(page.locator('#nav-dashboard')).toHaveAttribute('aria-current', 'page');
    await page.goForward();
    await expect(page).toHaveURL(/module=studio/);
    await expect(page).toHaveTitle(/Estúdio \+ IARA/i);
    await expect(page.locator('#nav-studio')).toHaveAttribute('aria-current', 'page');
  });

  test('IARA orchestrator cancelation and persistence', async ({ page, isMobile }) => {
    test.skip(!process.env.E2E_AI, 'AI integration test; enable E2E_AI for authenticated integration runs');
    await page.locator(isMobile ? '#mobile-nav-studio' : '#nav-studio').click();
    const textarea = page.locator('textarea');
    await textarea.fill('renderize algo para cancelar');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Na Fila do Estúdio')).toBeVisible();
    await page.locator('button[title="Cancelar"]').click();
    await expect(page.locator('text=Comando Cancelado')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=concluída com sucesso no Estúdio')).toHaveCount(0);
  });

  test('IARA orchestrator persistence and reload', async ({ page, isMobile }) => {
    test.skip(!process.env.E2E_AI, 'AI integration test; enable E2E_AI for authenticated integration runs');
    await page.locator(isMobile ? '#mobile-nav-studio' : '#nav-studio').click();
    const textarea = page.locator('textarea');
    await textarea.fill('renderize uma cozinha luxo persistente');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Na Fila do Estúdio')).toBeVisible();
    await page.reload();
    await expect(page.locator('text=Na Fila do Estúdio')).toBeVisible();
  });
});
