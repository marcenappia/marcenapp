import { test, expect } from './fixtures/authenticated';

test.describe('YARA → AI → provider', () => {
  test('uses a real Supabase session, provider and conversation context @yara', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.locator('#nav-studio').click();
    const input = page.getByRole('textbox', { name: 'Mensagem para a IARA' });
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
      expect((body.summary ?? '').trim().length).toBeGreaterThan(0);
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

  test('executes a real IARA photorealistic render and surfaces the generated image @yara @render', async ({ authenticatedPage: page }) => {
    test.setTimeout(150_000);
    await page.goto('/?module=studio');
    const input = page.getByRole('textbox', { name: 'Mensagem para a IARA' });
    await expect(input).toBeVisible();

    const requestPromise = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().includes('/functions/v1/ai-image'),
    );
    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/functions/v1/ai-image'),
    );

    const prompt = 'Gere um render fotorrealista de uma cozinha planejada contemporânea, com marcenaria sob medida, iluminação natural e acabamento realista.';
    await input.fill(prompt);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();

    const request = await requestPromise;
    expect(request.headers().authorization).toMatch(/^Bearer\s+\S+$/);

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const body = await response.json() as { imageUrl?: string; provider?: string; model?: string; operationType?: string };
    expect(body.operationType).toBe('gerarRender');
    expect(body.imageUrl).toMatch(/^data:image\//);
    expect(body.provider).toMatch(/^(lovable|gemini)$/);

    const generatedImage = page.locator('img[src^="data:image/"]');
    await expect(generatedImage.first()).toBeVisible({ timeout: 120_000 });
  });

});
