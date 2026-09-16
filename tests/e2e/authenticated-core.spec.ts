import { test, expect } from './fixtures/authenticated';

test.describe('Marcenapp authenticated core', () => {
  test('dashboard opens as the professional workspace', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Seu espaço de trabalho/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Falar com a IARA/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Registrar no Diário/i })).toBeVisible();
  });

  test('professional navigation reaches billing without exposing admin navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/?module=billing');
    await expect(page.getByRole('heading', { name: /Planos e Central de Uso/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Créditos avulsos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comprar' }).first()).toBeVisible();
    await expect(page.locator('#nav-admin-billing')).toHaveCount(0);
  });

  test('professional navigation reaches IARA and client area', async ({ authenticatedPage: page }) => {
    await page.goto('/?module=studio');
    await expect(page.getByText('IARA', { exact: true }).first()).toBeVisible();

    await page.goto('/?module=clientes');
    await expect(page.locator('main')).toBeVisible();
  });

  test('authenticated mobile navigation exposes the primary work areas', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('[id^="mobile-nav-"]')).toHaveCount(3);
  });
});
