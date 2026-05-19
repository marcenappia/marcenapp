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

  test('should not have any detectable accessibility violations on desktop', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop only audit');
    
    // Test multiple states for focus and hover
    const chatBtn = page.locator('#nav-chat');
    await chatBtn.hover();
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Check for contrast specifically in multiple states
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should navigate using Enter and Space keys', async ({ page, isMobile }) => {
    const dashboardId = isMobile ? 'button[aria-label="Visão Geral"]' : '#nav-dashboard';
    const dashboardBtn = page.locator(dashboardId).first();
    
    // Tab to it or focus directly
    await dashboardBtn.focus();
    
    // Test Enter
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Visão Geral/i })).toBeVisible();
    await expect(dashboardBtn).toHaveAttribute('aria-current', 'page');

    // Go back to chat using Space
    const chatId = isMobile ? 'button[aria-label="IARA Chat"]' : '#nav-chat';
    const chatBtn = page.locator(chatId).first();
    await chatBtn.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('heading', { name: /IARA Chat/i })).toBeVisible();
    await expect(chatBtn).toHaveAttribute('aria-current', 'page');
  });

  test('should have visible focus indicators and pass contrast on focused elements', async ({ page }) => {
    const firstBtn = page.locator('button[aria-label]').first();
    await firstBtn.focus();
    
    // Axe scan specifically for focused element contrast
    const results = await new AxeBuilder({ page })
      .include('button:focus')
      .withTags(['wcag2aa'])
      .analyze();
      
    expect(results.violations).toEqual([]);
    await expect(firstBtn).toHaveClass(/focus-visible:ring-2/);
  });

  test('should follow correct tab order in desktop sidebar', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Sidebar tab order test for desktop only');
    
    await page.keyboard.press('Tab');
    const moduleIds = ['chat', 'dashboard', 'studio', 'elevator', 'orcamento', 'corte', 'contrato'];
    
    for (const id of moduleIds) {
      let currentId = await page.evaluate(() => document.activeElement?.id);
      while (!currentId?.startsWith('nav-')) {
        await page.keyboard.press('Tab');
        currentId = await page.evaluate(() => document.activeElement?.id);
      }
      expect(currentId).toBe(`nav-${id}`);
      await page.keyboard.press('Tab');
    }
  });

  test('mobile bottom nav should follow correct tab order and cycle', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile bottom nav test only');

    // On mobile, bottom nav buttons don't have IDs but have aria-labels in order
    const labels = ['IARA Chat', 'Visão Geral', 'Studio 3D', 'Elevador Planta', 'Orçamento', 'Plano de Corte', 'Contrato'];
    
    // Focus first element
    await page.keyboard.press('Tab');
    
    for (const label of labels) {
      let currentLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      
      // Skip irrelevant elements (like user menu button if any) until we hit nav
      while (!labels.includes(currentLabel || '')) {
        await page.keyboard.press('Tab');
        currentLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      }
      
      expect(currentLabel).toBe(label);
      await page.keyboard.press('Tab');
    }
  });

});
