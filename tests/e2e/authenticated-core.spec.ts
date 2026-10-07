import { test, expect } from './fixtures/authenticated';

test.describe('Marcenapp authenticated core', () => {
  test('dashboard opens as the professional workspace', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Seu espaço de trabalho/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Desenvolver projeto/i })).toBeVisible();
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

  test('IARA workspace mounts without runtime errors and exposes the build version', async ({ authenticatedPage: page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('/?module=studio');
    await expect(page.getByRole('heading', { name: 'IARA', exact: true })).toBeVisible();
    await expect(page.getByLabel('Mensagem para a IARA')).toBeVisible();
    await expect(page.getByTestId('build-version')).toHaveText(/Build (dev|[a-f0-9]{8})/i);
    expect(pageErrors, `IARA runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('IARA remains available after switching away and back', async ({ authenticatedPage: page }) => {
    await page.goto('/?module=studio');
    await expect(page.getByLabel('Mensagem para a IARA')).toBeVisible();
    await page.goto('/?module=clientes');
    await expect(page.locator('main')).toBeVisible();
    await page.goto('/?module=studio');
    await expect(page.getByText('IARA', { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel('Mensagem para a IARA')).toBeVisible();
  });

  test('authenticated mobile navigation exposes the primary work areas', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('[id^="mobile-nav-"]')).toHaveCount(3);
  });

  test('IARA executes a real photo-to-render production flow', async ({ authenticatedPage: page }) => {
    test.setTimeout(12 * 60 * 1000);
    await page.goto('/?module=studio');
    await expect(page.getByRole('heading', { name: 'IARA', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar foto, referência ou planta' }).click();
    await page.getByRole('button', { name: /Foto do ambiente/ }).click();
    const environmentInput = page.locator('input[type="file"]').first();
    await environmentInput.setInputFiles({
      name: 'e2e-environment.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeUlEQVR42u3YoRGAMAwF0I6YwRiCIdBoNLrDgMe0XBsB79+XufSeTEvtSUTUCXmuPZpTAAAAAABSAZOSB9jPOrwAAAAAAAAAAAAAAAAAvzgp/UoAAAAAAAAAfAmwrUt775e65hPWAgAAAAAAAAAAAAAAAAAAAAC86gVEZyvu4LqXwgAAAABJRU5ErkJggg==', 'base64'),
    });

    await expect(page.getByRole('region', { name: 'Escolher destino da foto' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar cliente e obra' }).click();
    await page.getByRole('textbox', { name: 'Nome do cliente' }).fill('E2E Cliente');
    await page.getByRole('textbox', { name: 'Nome da obra' }).fill('E2E Render');
    await page.getByRole('button', { name: 'Salvar foto' }).click();

    await expect(page).toHaveURL(/\/\?module=studio(?:&|$)/, { timeout: 30_000 });
    await expect(page.getByRole('img', { name: 'Imagem de referência' }).first()).toBeVisible({ timeout: 30_000 });
    const composer = page.getByLabel('Descreva o que você quer fazer');
    await expect(composer).toBeVisible({ timeout: 30_000 });
    await composer.fill('Gere um render fotorealista do ambiente atual, preservando a referência visual e o layout da foto.');
    await expect(composer).toHaveValue(/Gere um render fotorealista/);
    await composer.press('Enter');

    await expect(page.getByText('IARA está trabalhando… preparando o render')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('img', { name: 'Render do projeto' })).toBeVisible({ timeout: 8 * 60 * 1000 });
    await expect(page.getByText('O render está pronto.')).toBeVisible({ timeout: 30_000 });
  });
});
