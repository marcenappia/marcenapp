import { test, expect } from '@playwright/test';

test.describe('Accessibility and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and bypass onboarding if needed
    await page.goto('/');
    // Check if onboarding is visible and skip it for menu tests
    const skipButton = page.getByRole('button', { name: /pular|skip|fechar/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });

  test('should have visible focus indicators on desktop sidebar', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Sidebar is hidden on mobile');

    const firstNavButton = page.locator('#nav-chat');
    await page.keyboard.press('Tab');
    
    // Continue tabbing until we hit a nav button if there are header links
    let currentFocus = await page.evaluate(() => document.activeElement?.id);
    while (currentFocus !== 'nav-chat' && currentFocus !== 'nav-dashboard') {
       await page.keyboard.press('Tab');
       currentFocus = await page.evaluate(() => document.activeElement?.id);
    }

    await expect(page.locator(':focus')).toBeVisible();
    
    // Check for focus ring class (which provides visible focus)
    const classList = await page.locator(':focus').evaluate((el) => Array.from(el.classList));
    expect(classList).toContain('focus-visible:ring-2');
  });

  test('should have ARIA labels for all menu items', async ({ page }) => {
    const navButtons = await page.getByRole('button').all();
    for (const button of navButtons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.innerText();
      // On mobile, text might be short, but label should be descriptive
      if (text.length > 0 && text.length < 5) {
         expect(ariaLabel).toBeTruthy();
      }
    }
  });

  test('should navigate using keyboard in sidebar', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Sidebar navigation test for desktop only');
    
    await page.keyboard.press('Tab');
    // Find dashboard link (Visão Geral)
    const dashboardBtn = page.locator('#nav-dashboard');
    
    // Tab until dashboard is focused
    let isFocused = false;
    for (let i = 0; i < 15; i++) {
      const focused = await dashboardBtn.evaluate((el) => document.activeElement === el);
      if (focused) {
        isFocused = true;
        break;
      }
      await page.keyboard.press('Tab');
    }
    
    expect(isFocused).toBe(true);
    await page.keyboard.press('Enter');
    
    // Check header updates
    await expect(page.getByRole('heading', { name: /Visão Geral/i })).toBeVisible();
  });

  test('should show correct labels on mobile resolutions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile bottom nav test only');
    
    // Bottom nav should be visible
    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeVisible();
    
    // Check specifically for one module's mobile label
    await expect(page.getByText('Planta')).toBeVisible();
    await expect(page.getByText('Custo')).toBeVisible();
  });
});
