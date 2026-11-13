import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callAIImage: vi.fn(),
}));

vi.mock('@/services/ai', () => ({
  callAIImage: mocks.callAIImage,
}));

import { studioService } from '@/modules/ambientes/services/studioService';

describe('studioService image persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callAIImage.mockResolvedValue('https://example.supabase.co/storage/v1/object/sign/obras/render.png?token=test');
  });

  it('passes project persistence context through to the image function', async () => {
    const persistence = { projectId: 'project-1', environmentId: 'environment-1' };
    await studioService.generateVisual(
      'Render da cozinha',
      [{ mimeType: 'image/jpeg', data: 'aGVsbG8=' }],
      'photorealistic',
      'modern',
      undefined,
      persistence,
    );

    expect(mocks.callAIImage).toHaveBeenCalledWith(
      expect.stringContaining('Render da cozinha'),
      [{ mimeType: 'image/jpeg', data: 'aGVsbG8=' }],
      undefined,
      persistence,
    );
  });

  it('downloads a signed Storage URL before sending it as an image edit reference', async () => {
    const persistence = { projectId: 'project-1' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['hello'], { type: 'image/jpeg' }),
    }));

    await studioService.refineVisual(
      'https://example.supabase.co/storage/v1/object/sign/obras/original.jpg?token=test',
      'Adicionar três gavetas',
      persistence,
    );

    const [prompt, images, idempotencyKey, passedPersistence] = mocks.callAIImage.mock.calls[0];
    expect(prompt).toContain('Adicionar três gavetas');
    expect(images).toEqual([{ mimeType: 'image/jpeg', data: 'aGVsbG8=' }]);
    expect(idempotencyKey).toBeUndefined();
    expect(passedPersistence).toEqual(persistence);
  });
});
