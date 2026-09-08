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

  test('should pass accessibility audit and visual regression for Sidebar and BottomNav', async ({ page, isMobile }) => {
    const moduleIds = isMobile 
      ? ['chat', 'dashboard', 'clientes', 'diario', 'studio']
      : ['chat', 'dashboard', 'studio', 'orcamento'];
    
    for (const id of moduleIds) {
      const selector = isMobile ? `#mobile-nav-${id}` : `#nav-${id}`;
      const btn = page.locator(selector).first();
      
      // State: Default
      await expect(btn).toHaveAttribute('aria-label', /.+/);
      let results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-default.png`);

      // State: Hover
      await btn.hover();
      results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-hover.png`);
      
      // State: Focus
      await btn.focus();
      results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-focus.png`);
      
      // State: Selected
      await btn.click();
      await expect(btn).toHaveAttribute('aria-current', 'page');
      results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations).toEqual([]);
      await expect(btn).toHaveScreenshot(`${isMobile ? 'mobile' : 'desktop'}-nav-${id}-active.png`);
    }
  });

  test('navigation tab order and sync (Desktop & Mobile)', async ({ page, isMobile }) => {
    const moduleIds = isMobile 
      ? ['chat', 'dashboard', 'clientes', 'diario', 'studio']
      : ['chat', 'dashboard', 'clientes', 'diario', 'studio', 'elevator', 'orcamento', 'corte', 'contrato'];
    
    const prefix = isMobile ? '#mobile-nav-' : '#nav-';
    
    // Start from top
    await page.keyboard.press('Home');
    
    for (const id of moduleIds) {
      // Find the button to get its label for title verification
      const btn = page.locator(`${prefix}${id}`);
      const label = await btn.getAttribute('aria-label');
      
      await page.keyboard.press('Tab');
      await expect(btn).toBeFocused();
      
      // Press Enter to navigate
      await page.keyboard.press('Enter');
      
      // Verify full synchronization
      await expect(page).toHaveURL(new RegExp(`module=${id}`));
      await expect(page).toHaveTitle(new RegExp(label || id, 'i'));
      await expect(btn).toHaveAttribute('aria-current', 'page');
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
      
      // Click interaction
      await btn.click();
      await expect(page).toHaveURL(new RegExp(`module=${mod.id}`));
      await expect(page).toHaveTitle(new RegExp(mod.label, 'i'));
      await expect(btn).toHaveAttribute('aria-current', 'page');
      
      // Keyboard interaction (Enter)
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
    
    const viewports = [320, 375, 768];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      const bottomNav = page.locator('nav.md\\:hidden');
      await expect(bottomNav).toBeVisible();
      
      // Ensure items are not overlapping/broken
      const rects = await page.evaluate(() => {
        const nav = document.querySelector('nav.md\\:hidden');
        if (!nav) return null;
        return Array.from(nav.children).map(c => c.getBoundingClientRect().width);
      });
      expect(rects?.[0]).toBeGreaterThan(40); // Minimal button width

      await expect(bottomNav).toHaveScreenshot(`bottom-nav-res-${width}.png`);
    }
  });

  test('screen reader accessibility and ARIA labels', async ({ page, isMobile }) => {
    const mod = { id: 'chat', label: 'IARA Chat' };
    const selector = isMobile ? `#mobile-nav-${mod.id}` : `#nav-${mod.id}`;
    const btn = page.locator(selector).first();

    await btn.focus();
    // Verify that the element has the correct accessible name
    await expect(btn).toHaveAttribute('aria-label', mod.label);
    
    await page.keyboard.press('Enter');
    // Verify ARIA state after activation
    await expect(btn).toHaveAttribute('aria-current', 'page');
    
    // Verify that screen reader would announce the correct label and state
    const accessibilitySnapshot = await page.accessibility.snapshot({ root: await btn.elementHandle() });
    expect(accessibilitySnapshot?.name).toBe(mod.label);
    if (!isMobile) {
      // On desktop, check if the current page indicator is detected
      expect(accessibilitySnapshot?.current).toBe('page');
    }
  });

  test('should navigate using Enter and Space keys with URL and Title verification', async ({ page, isMobile }) => {
    const navModules = [
      { id: 'dashboard', label: 'Início' },
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

  test('mobile bottom nav keyboard navigation and tab order', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile test only');
    
    const mobileModuleIds = ['chat', 'dashboard', 'clientes', 'diario', 'studio']; 
    await page.waitForSelector(`#mobile-nav-${mobileModuleIds[0]}`);
    
    const firstBtn = page.locator(`#mobile-nav-${mobileModuleIds[0]}`);
    const lastBtn = page.locator(`#mobile-nav-${mobileModuleIds[mobileModuleIds.length - 1]}`);

    // Arrow navigation wrap sequence
    await firstBtn.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(`#mobile-nav-${mobileModuleIds[1]}`)).toBeFocused();
    
    await page.keyboard.press('ArrowLeft');
    await expect(firstBtn).toBeFocused();
    
    await page.keyboard.press('ArrowLeft'); // Wrap to end
    await expect(lastBtn).toBeFocused();
    
    await page.keyboard.press('ArrowRight'); // Wrap back to start
    await expect(firstBtn).toBeFocused();

    // Tab order verification
    await page.keyboard.press('Home'); // Ensure starting point
    await page.keyboard.press('Tab'); // First nav item
    
    for (const id of mobileModuleIds) {
      const currentBtn = page.locator(`#mobile-nav-${id}`);
      await expect(currentBtn).toBeFocused();
      await page.keyboard.press('Tab');
    }

    // Verify no tab trap
    const focusedAfterNav = await page.evaluate(() => !document.activeElement?.closest('nav'));
    expect(focusedAfterNav).toBe(true);

    // Home/End navigation verification
    await lastBtn.focus();
    await page.keyboard.press('Home');
    await expect(firstBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/module=chat/);
  });

  test('should synchronize state with browser history (back/forward) and refresh', async ({ page }) => {
    // Navigate to a few modules
    const modules = [
      { id: 'dashboard', label: 'Início' },
      { id: 'studio', label: 'Studio 3D' }
    ];

    for (const mod of modules) {
      await page.locator(`#nav-${mod.id}`).click();
      await expect(page).toHaveURL(new RegExp(`module=${mod.id}`));
      await expect(page).toHaveTitle(new RegExp(mod.label, 'i'));
    }

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/module=dashboard/);
    await expect(page).toHaveTitle(/Início/i);
    await expect(page.locator('#nav-dashboard')).toHaveAttribute('aria-current', 'page');

    // Refresh
    await page.reload();
    await expect(page).toHaveURL(/module=dashboard/);
    await expect(page).toHaveTitle(/Início/i);
    await expect(page.locator('#nav-dashboard')).toHaveAttribute('aria-current', 'page');
    
    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/module=studio/);
    await expect(page).toHaveTitle(/Studio 3D/i);
    await expect(page.locator('#nav-studio')).toHaveAttribute('aria-current', 'page');
  });

  test('IARA orchestrator cancelation and persistence', async ({ page, isMobile }) => {
    await page.locator(isMobile ? '#mobile-nav-chat' : '#nav-chat').click();
    
    const textarea = page.locator('textarea');
    await textarea.fill('renderize algo para cancelar');
    await page.keyboard.press('Enter');
    
    // Check status
    const statusCard = page.locator('text=Na Fila do Estúdio');
    await expect(statusCard).toBeVisible();
    
    // Click Cancel (assuming XCircle button with title "Cancelar")
    const cancelBtn = page.locator('button[title="Cancelar"]');
    await cancelBtn.click();
    
    // Verify status changes to Canceled
    await expect(page.locator('text=Comando Cancelado')).toBeVisible();
    
    // Verify no render message appears even after wait
    await page.waitForTimeout(2000);
    await expect(page.locator('text=concluída com sucesso no Estúdio')).toHaveCount(0);
  });

  test('IARA orchestrator persistence and reload', async ({ page, isMobile }) => {
    await page.locator(isMobile ? '#mobile-nav-chat' : '#nav-chat').click();
    
    const textarea = page.locator('textarea');
    await textarea.fill('renderize uma cozinha luxo persistente');
    await page.keyboard.press('Enter');
    
    // Check status
    await expect(page.locator('text=Na Fila do Estúdio')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Status should persist from localStorage
    await expect(page.locator('text=Na Fila do Estúdio')).toBeVisible();
  });

});
