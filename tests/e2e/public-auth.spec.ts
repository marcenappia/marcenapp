import { test, expect } from '@playwright/test';

test.describe('Landing, acesso e rotas públicas', () => {
  test('landing carrega sem erros de console e CTA leva ao acesso', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Do rascunho ao/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Criar meu primeiro projeto/i })).toBeVisible();
    await page.getByRole('button', { name: /Criar meu primeiro projeto/i }).click();
    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
    expect(consoleErrors).toEqual([]);
  });

  test('acesso expõe login, recuperação e cadastro', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: /Continuar com Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar no MARCENAPP/i })).toBeVisible();
    await page.getByRole('button', { name: /Esqueceu a senha/i }).click();
    await expect(page.getByRole('button', { name: /Enviar Recuperação/i })).toBeVisible();
    await page.getByRole('button', { name: /Voltar para o login/i }).click();
    await page.getByRole('button', { name: /Cadastre-se/i }).click();
    await expect(page.getByPlaceholder('Nome completo')).toBeVisible();
    await expect(page.getByRole('button', { name: /Criar conta e testar grátis/i })).toBeVisible();
  });

  test('rotas públicas sobrevivem a refresh direto', async ({ page }) => {
    for (const path of ['/loja', '/marcena', '/software-para-marceneiro']) {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
