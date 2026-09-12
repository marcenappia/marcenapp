import fs from 'node:fs';
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
    expect(request.headers().authorization).toMatch(/^Bearer\s+\S+/);

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

    expect(body.provider).toBe('gemini');
    expect(body.model).toBe('gemini-3.6-flash');
    expect(body.summary).toMatch(/TESTE GEMINI OK/i);
    expect(body).not.toHaveProperty('apiKey');
    expect(body).not.toHaveProperty('access_token');
    expect(body).not.toHaveProperty('secret');
    expect(body).not.toHaveProperty('token');

    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    await expect(page.getByText(/TESTE GEMINI OK/i)).toBeVisible();

    fs.mkdirSync('gemini-e2e-evidence', { recursive: true });
    fs.writeFileSync(
      'gemini-e2e-evidence/result.json',
      JSON.stringify(
        {
          requestPath: new URL(request.url()).pathname,
          requestMethod: request.method(),
          requestAuthenticated: /^Bearer\s+\S+$/.test(request.headers().authorization ?? ''),
          httpStatus: response.status(),
          provider: body.provider,
          model: body.model,
          responseContainsExpectedText: /TESTE GEMINI OK/i.test(body.summary ?? ''),
          uiContainsExpectedText: true,
          secretsExposedInResponse: false,
        },
        null,
        2,
      ),
    );
  });
});
