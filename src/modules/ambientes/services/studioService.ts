import { callAIImage, type AIImagePersistence } from '@/services/ai';
import { ImageData } from '@/store/useStudioStore';

interface ImagePayload {
  mimeType: string;
  data: string;
}

function normalizeImages(images?: ImageData[]): ImagePayload[] | undefined {
  if (!images || images.length === 0) return undefined;
  return images.map(img => ({ mimeType: img.mimeType, data: img.data }));
}

function normalizeIdempotencyKey(key?: string): string | undefined {
  if (!key) return undefined;
  const normalized = key.trim();
  return normalized.length >= 8 && normalized.length <= 200 ? normalized : undefined;
}

export const studioService = {
  generateVisual: async (
    prompt: string,
    images?: ImageData[],
    stylePrompt?: string,
    decorPrompt?: string,
    idempotencyKey?: string,
    persistence?: AIImagePersistence,
  ): Promise<string | null> => {
    const finalPrompt = `ACT AS AN EXPERT ARCHITECTURAL VISUALIZER.\n      Style: ${stylePrompt || 'Photorealistic'}.\n      Decor: ${decorPrompt || 'Modern'}.\n      Instructions: ${prompt}.\n      Maximum realism, 8k.`;
    const processedImages = normalizeImages(images);
    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    console.info('[STUDIO_SERVICE]', JSON.stringify({ status: 'started', requestId: normalizedKey ?? null, referenceImages: processedImages?.length ?? 0 }));
    return await callAIImage(finalPrompt, processedImages, normalizedKey as Parameters<typeof callAIImage>[2], persistence);
  },

  refineVisual: async (originalImage: string, instructions: string): Promise<string | null> => {
    const base64 = originalImage.includes(',') ? originalImage.split(',')[1] : originalImage;
    const finalPrompt = `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${instructions}". Keep everything else the same.`;
    return await callAIImage(finalPrompt, [{ mimeType: 'image/png', data: base64 }]);
  }
};
