import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const gatewayPath = fileURLToPath(new URL('./ai-image-gateway.ts', import.meta.url));

describe('Vercel image gateway contract', () => {
  it('keeps image provider ownership in the Vercel image adapter without a hidden Gemini fallback', async () => {
    const source = await readFile(gatewayPath, 'utf8');
    expect(source).toContain("import { generateImage } from 'ai';");
    expect(source).not.toContain("generateText");
    expect(source).not.toContain("google/gemini-3-pro-image");
    expect(source).toContain("model: MODEL");
  });

  it('keeps the gateway source syntactically valid around the text/responses body contract', async () => {
    const source = await readFile(gatewayPath, 'utf8');
    expect(source).toContain("response_format?: unknown;");
    expect(source).toContain("input?: unknown;");
    expect(source).not.toContain("\\n      input?: unknown;");
  });
});
