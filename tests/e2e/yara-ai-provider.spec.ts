import { test, expect } from './fixtures/authenticated';

test.describe('YARA → AI → provider', () => {
  test('uses a real Supabase session, provider and conversation context', { tag: '@yara' }, async ({ authenticatedPage: page }) {
    await page.getByRole('button', { name: 'Estúdio' }).click();
    const input = page.getByPlaceholder('Descreva seu móvel...');
    await expect(input).toBeVisible();

    const sendRealPrompt = async (prompt: string) => {
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
        summary?: string;
        plan?: unknown[];
        error?: string;
        code?: string;
        apiKey?: unknown;
        access_token?: unknown;
        secret?: unknown;
        token?: unknown;
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

      return { request, body };
    };

    const first = 'Meu projeto tem uma cozinha planejada.';
    await sendRealPrompt(first);

    const second = 'Qual projeto eu mencionei?';
    const { request: secondRequest, body: secondBody } = await sendRealPrompt(second);

    const payload = secondRequest.postDataJSON() as {
      context?: {
        conversation?: Array<{ sender?: string; text?: string }>;
      };
    };
    const conversation = payload.context?.conversation ?? [];
    expect(conversation.some((message) => message.sender === 'user' && message.text === first)).toBe(true);

    const secondSummary = secondBody.summary?.trim() ?? '';
    expect(secondSummary).toMatch(/cozinha|planejad/i);
    await expect(page.getByText(secondSummary, { exact: false })).toBeVisible();
  });
});
