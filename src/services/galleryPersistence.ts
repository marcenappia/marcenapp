import { supabase } from '@/integrations/supabase/client';

export interface PersistGalleryImageInput {
  userId: string;
  projectId?: string | null;
  environmentId?: string | null;
  storagePath: string;
  imageUrl: string;
  prompt: string;
  versionId?: string | null;
  correlationId?: string | null;
  generation?: number | null;
}

/**
 * Único ponto de escrita do cliente em gallery_images.
 * Impede gravar data/blob URLs e exige o caminho real do objeto no Storage.
 */
export async function persistGalleryImage(input: PersistGalleryImageInput): Promise<void> {
  const storagePath = input.storagePath.trim();
  const imageUrl = input.imageUrl.trim();

  if (!storagePath || storagePath.startsWith('/') || storagePath.includes('..')) {
    throw new Error('Caminho inválido para persistência da imagem na galeria.');
  }
  if (!/^https:\/\/.+/i.test(imageUrl)) {
    throw new Error('A galeria exige uma URL HTTPS de uma imagem já persistida no Storage.');
  }

  const { error } = await supabase.from('gallery_images').insert({
    user_id: input.userId,
    project_id: input.projectId ?? null,
    environment_id: input.environmentId ?? null,
    version_id: input.versionId ?? null,
    correlation_id: input.correlationId ?? null,
    execution_generation: input.generation ?? null,
    storage_path: storagePath,
    image_url: imageUrl,
    prompt: input.prompt,
  });
  if (error) throw error;
}
