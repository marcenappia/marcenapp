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
    console.info('[AI_IMAGE_START]', JSON.stringify({ status: 'started', referenceCount: processedImages?.length ?? 0, renderId: normalizedKey ?? 'generated' }));
    return await callAIImage(finalPrompt, processedImages, normalizedKey, persistence);
  },

  refineVisual: async (originalImage: string, instructions: string, persistence?: AIImagePersistence): Promise<string | null> => {
    let mimeType = 'image/png';
    let base64 = originalImage;
    if (originalImage.startsWith('data:image/')) {
      const comma = originalImage.indexOf(',');
      if (comma < 0) throw new Error('A imagem de referência está em formato inválido.');
      mimeType = /^data:([^;]+);base64,/i.exec(originalImage)?.[1] ?? mimeType;
      base64 = originalImage.slice(comma + 1);
    } else if (/^https:\/\//i.test(originalImage)) {
      const response = await fetch(originalImage);
      if (!response.ok) throw new Error('Não foi possível recuperar a imagem anterior para aplicar o ajuste.');
      const blob = await response.blob();
      mimeType = blob.type || mimeType;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Falha ao ler a imagem anterior.'));
        reader.onerror = () => reject(new Error('Falha ao ler a imagem anterior.'));
        reader.readAsDataURL(blob);
      });
      base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    }
    if (!base64) throw new Error('A imagem de referência está vazia.');
    const finalPrompt = 'ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "' + instructions + '". Keep everything else the same.';
    return await callAIImage(finalPrompt, [{ mimeType, data: base64 }], undefined, persistence);
  }
};
