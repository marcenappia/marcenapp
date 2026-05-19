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

  test('should not have any detectable accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should show aria-current on active module', async ({ page }) => {
    const chatBtn = page.locator('#nav-chat');
    // On Index.tsx, chat is default
    await expect(chatBtn).toHaveAttribute('aria-current', 'page');

    const dashboardBtn = page.locator('#nav-dashboard');
    await dashboardBtn.click();
    await expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
    await expect(chatBtn).not.toHaveAttribute('aria-current');
  });

  test('should follow correct tab order in sidebar', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Sidebar tab order test for desktop only');
    
    // Focus start
    await page.keyboard.press('Tab');
    
    // We expect to cycle through all modules
    const moduleIds = ['chat', 'dashboard', 'studio', 'elevator', 'orcamento', 'corte', 'contrato'];
    
    for (const id of moduleIds) {
      // Find current focused element ID
      let currentId = await page.evaluate(() => document.activeElement?.id);
      
      // If we are not on a nav button yet (maybe on logo or header), keep tabbing
      while (!currentId?.startsWith('nav-')) {
        await page.keyboard.press('Tab');
        currentId = await page.evaluate(() => document.activeElement?.id);
      }
      
      expect(currentId).toBe(`nav-${id}`);
      await page.keyboard.press('Tab');
    }
  });

  test('mobile bottom nav should be accessible', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile test only');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('nav.md\\:hidden')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Verify aria-current on mobile
    const mobileChat = page.getByRole('button', { name: 'IARA Chat' });
    await expect(mobileChat).toHaveAttribute('aria-current', 'page');
  });
});
