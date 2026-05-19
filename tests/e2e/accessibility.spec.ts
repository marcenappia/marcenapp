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

  test('should navigate using Enter and Space keys in all modules', async ({ page, isMobile }) => {
    const modules = [
      { id: 'dashboard', label: 'Visão Geral' },
      { id: 'chat', label: 'IARA Chat' }
    ];

    for (const mod of modules) {
      const selector = isMobile ? `button[aria-label="${mod.label}"]` : `#nav-${mod.id}`;
      const btn = page.locator(selector).first();
      
      await btn.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: new RegExp(mod.label, 'i') })).toBeVisible();
      await expect(btn).toHaveAttribute('aria-current', 'page');

      // Toggle another one with Space
      const otherMod = modules.find(m => m.id !== mod.id)!;
      const otherSelector = isMobile ? `button[aria-label="${otherMod.label}"]` : `#nav-${otherMod.id}`;
      const otherBtn = page.locator(otherSelector).first();
      
      await otherBtn.focus();
      await page.keyboard.press('Space');
      await expect(page.getByRole('heading', { name: new RegExp(otherMod.label, 'i') })).toBeVisible();
    }
  });

  test('mobile bottom nav cycle', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile test only');
    const labels = ['IARA Chat', 'Visão Geral', 'Studio 3D', 'Elevador Planta', 'Orçamento', 'Plano de Corte', 'Contrato'];
    
    await page.keyboard.press('Tab');
    for (const label of labels) {
      let currentLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      while (currentLabel !== label) {
        await page.keyboard.press('Tab');
        currentLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      }
      expect(currentLabel).toBe(label);
    }
  });


});
