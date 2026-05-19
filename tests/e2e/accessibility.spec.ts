import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit & Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip onboarding
    const skipButton = page.getByRole('button', { name: /pular/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
    // Wait for animation
    await page.waitForTimeout(500);
  });

  test('should pass accessibility audit in all interaction states', async ({ page }) => {
    const moduleIds = ['chat', 'dashboard', 'studio', 'elevator', 'orcamento', 'corte', 'contrato'];
    
    for (const id of moduleIds) {
      const btn = page.locator(`#nav-${id}`);
      
      // State: Default
      await expect(btn).toHaveAttribute('aria-label', /.+/);
      let results = await new AxeBuilder({ page }).include(`#nav-${id}`).analyze();
      expect(results.violations).toEqual([]);

      // State: Hover
      await btn.hover();
      results = await new AxeBuilder({ page }).include(`#nav-${id}`).analyze();
      expect(results.violations).toEqual([]);

      // State: Focus
      await btn.focus();
      results = await new AxeBuilder({ page }).include(`#nav-${id}`).analyze();
      expect(results.violations).toEqual([]);
      
      // State: Selected
      await btn.click();
      await expect(btn).toHaveAttribute('aria-current', 'page');
      results = await new AxeBuilder({ page }).include(`#nav-${id}`).analyze();
      expect(results.violations).toEqual([]);
    }
  });

  test('should not have tab traps and manage focus correctly', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop focus management test');
    
    // Start at the top of the page
    await page.keyboard.press('Home');
    
    // Tab into the sidebar
    await page.keyboard.press('Tab');
    const firstId = await page.evaluate(() => document.activeElement?.id);
    expect(firstId).toMatch(/nav-chat|marcenapp-logo/); // Adjust based on actual first focusable

    // Tab through all modules
    const moduleCount = 7;
    for (let i = 0; i < moduleCount; i++) {
      await page.keyboard.press('Tab');
    }
    
    // After tabbing through the sidebar, the focus should move out to the main content or header
    await page.keyboard.press('Tab');
    const focusedAfterSidebar = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        id: el?.id,
        tagName: el?.tagName,
        closestSidebar: !!el?.closest('aside')
      };
    });
    
    // Verification: Focus is not stuck in the sidebar
    expect(focusedAfterSidebar.closestSidebar).toBe(false);
  });

  test('should navigate using Enter and Space keys with URL and Title verification', async ({ page, isMobile }) => {
    const navModules = [
      { id: 'dashboard', label: 'Visão Geral' },
      { id: 'chat', label: 'IARA Chat' },
      { id: 'studio', label: 'Studio 3D' }
    ];

    for (const mod of navModules) {
      const selector = isMobile ? `#mobile-nav-${mod.id}` : `#nav-${mod.id}`;
      const btn = page.locator(selector).first();
      
      // Test Enter
      await btn.focus();
      await page.keyboard.press('Enter');
      
      // Verify Header
      await expect(page.getByRole('heading', { name: new RegExp(mod.label, 'i') })).toBeVisible();
      // Verify Title
      await expect(page).toHaveTitle(new RegExp(mod.label, 'i'));
      // Verify URL
      await expect(page).toHaveURL(new RegExp(`module=${mod.id}`));
      // Verify ARIA
      await expect(btn).toHaveAttribute('aria-current', 'page');

      // Test Space on a different module
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
    
    const moduleIds = ['chat', 'dashboard', 'clientes', 'diario', 'studio', 'elevator', 'orcamento', 'corte', 'contrato'];
    const firstBtn = page.locator(`#nav-${moduleIds[0]}`);
    const lastBtn = page.locator(`#nav-${moduleIds[moduleIds.length - 1]}`);

    // Start at first item
    await firstBtn.focus();
    await expect(firstBtn).toBeFocused();

    // ArrowUp should wrap to last item
    await page.keyboard.press('ArrowUp');
    await expect(lastBtn).toBeFocused();

    // ArrowDown should wrap back to first item
    await page.keyboard.press('ArrowDown');
    await expect(firstBtn).toBeFocused();

    // ArrowDown twice should go to third item
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(`#nav-${moduleIds[2]}`)).toBeFocused();
    
    // Home/End keys
    await page.keyboard.press('End');
    await expect(lastBtn).toBeFocused();
    await page.keyboard.press('Home');
    await expect(firstBtn).toBeFocused();
  });

  test('mobile bottom nav keyboard navigation (Arrow keys)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile test only');
    
    // Mobile nav only shows subset of modules (first 5 in filtered list)
    const mobileModuleIds = ['chat', 'dashboard', 'clientes', 'diario', 'studio']; 

    // Wait for the buttons to be available
    await page.waitForSelector(`#mobile-nav-${mobileModuleIds[0]}`);
    
    const firstBtn = page.locator(`#mobile-nav-${mobileModuleIds[0]}`);
    const lastBtn = page.locator(`#mobile-nav-${mobileModuleIds[mobileModuleIds.length - 1]}`);

    await firstBtn.focus();
    
    // ArrowLeft (wrap to last)
    await page.keyboard.press('ArrowLeft');
    await expect(lastBtn).toBeFocused();

    // ArrowRight (wrap to first)
    await page.keyboard.press('ArrowRight');
    await expect(firstBtn).toBeFocused();
  });


});
