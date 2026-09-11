import { test, expect } from './fixtures/authenticated';

test.describe('YARA → AI → provider', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'The authenticated proof runs once in Chromium.');

  test('uses a real Supabase session and ai-orchestrator provider', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'Estúdio' }).click();
    const input = page.getByPlaceholder('Descreva seu móvel...');
    await expect(input).toBeVisible();

    const requestPromise = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().includes('/functions/v1/ai-orchestrator'),
    );
    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/functions/v1/ai-orchestrator'),
    );

    const prompt = 'Quero conversar com a IARA sobre meu projeto de marcenaria.';
    await input.fill(prompt);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();

    const request = await requestPromise;
    expect(request.headers().authorization).toMatch(/^Bearer\s+\S+/);

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const body = await response.json() as {
      provider?: string;
      summary?: string;
      plan?: unknown[];
      error?: string;
      code?: string;
    };

    expect(body.provider).toMatch(/^(lovable|gemini)$/);
    expect(body).not.toHaveProperty('apiKey');
    expect(body).not.toHaveProperty('access_token');
    expect(body).not.toHaveProperty('secret');
    expect(body).not.toHaveProperty('token');

    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    if (body.summary?.trim()) {
      await expect(page.getByText(body.summary.trim(), { exact: false })).toBeVisible();
    } else {
      await expect(page.getByText(/Pode detalhar melhor|[✅❌]/)).toBeVisible();
    }
  });
});
