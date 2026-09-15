import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAgent } from './registry';

const callAIText = vi.fn<(prompt: string, images?: { mimeType: string; data: string }[], jsonMode?: boolean) => Promise<string>>(async () => JSON.stringify({
  summary: 'Ambiente identificado.',
  findings: { walls: [{ reference: 'parede da direita' }] },
  confidence: 0.9,
  warnings: [],
  assumptions: [],
  evidence: [{ source: 'vision', value: 'parede da direita' }],
}));

vi.mock('@/services/ai', () => ({ callAIText }));

describe('agentes espaciais model-backed', () => {
  beforeEach(() => callAIText.mockClear());

  it('executa visão pelo registry e envia imagem separadamente do prompt', async () => {
    const result = await getAgent('vision').handle({
      id: 'vision-test',
      type: 'vision.environment.analyze',
      correlationId: 'corr-test',
      input: {
        prompt: 'Coloque o móvel na parede do lado direito.',
        projectId: 'project-1',
        images: [{ mimeType: 'image/jpeg', data: 'base64-image' }],
      },
    });

    expect(result.status).toBe('completed');
    expect(result.data?.modelBacked).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(callAIText).toHaveBeenCalledTimes(1);
    const [prompt, images, jsonMode] = callAIText.mock.calls[0];
    expect(prompt).toContain('parede da direita');
    expect(prompt).toContain('Não exija que o usuário pense em norte, sul, leste ou oeste.');
    expect(prompt).not.toContain('base64-image');
    expect(images).toEqual([{ mimeType: 'image/jpeg', data: 'base64-image' }]);
    expect(jsonMode).toBe(true);
  });

  it('bloqueia visão sem referência visual', async () => {
    const result = await getAgent('vision').handle({
      id: 'vision-test-2',
      type: 'vision.environment.analyze',
      correlationId: 'corr-test',
      input: { prompt: 'Analise a cozinha.' },
    });

    expect(result.status).toBe('needs_input');
    expect(callAIText).not.toHaveBeenCalled();
  });
});
