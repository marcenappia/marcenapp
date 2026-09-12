import { test, expect } from './fixtures/authenticated';

test.describe('IARA → Gemini real provider', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'The real-provider proof runs once in Chromium.');

  test('sends a deterministic prompt through the real IARA path and receives Gemini output', async ({ authenticatedPage: page }) => {
    await page.goto('/?module=studio');
    const input = page.getByPlaceholder('Descreva seu móvel...');
    await expect(input).toBeVisible();

    const prompt = 'Olá IARA. Responda apenas: TESTE GEMINI OK.';
    const requestPromise = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().includes('/functions/v1/ai-orchestrator'),
    );
    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/functions/v1/ai-orchestrator'),
    );

    await input.fill(prompt);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();

    const request = await requestPromise;
    expect(request.headers().authorization).toMatch(/^Bearer\\s+\\S+/);

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const body = await response.json() as {
      provider?: string;
      model?: string;
      summary?: string;
      plan?: unknown[];
      apiKey?: unknown;
      access_token?: unknown;
      secret?: unknown;
      token?: unknown;
    };

    // This proof is intentionally strict: a fallback to another provider is not a Gemini pass.
    expect(body.provider).toBe('gemini');
    expect(body.model).toBe('gemini-3.6-flash');
    expect(body.summary).toMatch(/TESTE GEMINI OK/i);
    expect(body).not.toHaveProperty('apiKey');
    expect(body).not.toHaveProperty('access_token');
    expect(body).not.toHaveProperty('secret');
    expect(body).not.toHaveProperty('token');

    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    await expect(page.getByText(/TESTE GEMINI OK/i)).toBeVisible();
  });
});
