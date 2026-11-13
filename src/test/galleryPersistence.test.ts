import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { persistGalleryImage } from '@/services/galleryPersistence';

describe('persistGalleryImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it('persists only an HTTPS URL together with the durable Storage path', async () => {
    await persistGalleryImage({
      userId: 'user-1',
      projectId: 'project-1',
      environmentId: 'environment-1',
      storagePath: 'user-1/project-1/ambientes/render.png',
      imageUrl: 'https://example.supabase.co/storage/v1/object/sign/obras/render.png?token=abc',
      prompt: 'Render da cozinha',
      versionId: 'version-1',
      correlationId: 'correlation-1',
      generation: 7,
    });

    expect(mocks.from).toHaveBeenCalledWith('gallery_images');
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      project_id: 'project-1',
      environment_id: 'environment-1',
      storage_path: 'user-1/project-1/ambientes/render.png',
      version_id: 'version-1',
      correlation_id: 'correlation-1',
      execution_generation: 7,
      image_url: expect.stringMatching(/^https:\/\//),
      prompt: 'Render da cozinha',
    }));
  });

  it('rejects data URLs before writing a gallery record', async () => {
    await expect(persistGalleryImage({
      userId: 'user-1',
      projectId: 'project-1',
      storagePath: 'user-1/project-1/render.png',
      imageUrl: 'data:image/png;base64,abc',
      prompt: 'Render',
    })).rejects.toThrow('URL HTTPS');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rejects missing or unsafe Storage paths', async () => {
    await expect(persistGalleryImage({
      userId: 'user-1',
      storagePath: '../outside/render.png',
      imageUrl: 'https://example.com/render.png',
      prompt: 'Render',
    })).rejects.toThrow('Caminho inválido');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('propagates database errors instead of reporting a false gallery success', async () => {
    mocks.insert.mockResolvedValueOnce({ error: { message: 'permission denied' } });
    await expect(persistGalleryImage({
      userId: 'user-1',
      storagePath: 'user-1/render.png',
      imageUrl: 'https://example.com/render.png',
      prompt: 'Render',
    })).rejects.toMatchObject({ message: 'permission denied' });
  });
});
