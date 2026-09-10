import { callAIImage } from '@/services/ai';
import { ImageData } from '@/store/useStudioStore';

interface ImagePayload {
  mimeType: string;
  data: string;
}

function normalizeImages(images?: ImageData[]): ImagePayload[] | undefined {
  if (!images || images.length === 0) return undefined;
  return images.map(img => {
    // Se já vier como objeto com mimeType/data (formato correto), repassa
    if (typeof img === 'object' && img !== null && 'mimeType' in img) {
      return { mimeType: img.mimeType, data: img.data };
    }
    // Se vier como string base64 (formato legado ou raw), converte
    if (typeof img === 'string') {
      const raw = img.includes(',') ? img.split(',')[1] : img;
      return { mimeType: 'image/png', data: raw };
    }
    // Se vier como { base64, baseRaw, ... } — extrai baseRaw
    if (typeof img === 'object' && img !== null) {
      const anyImg = img as Record<string, unknown>;
      const raw = (anyImg.baseRaw as string) || (anyImg.data as string) || '';
      const mime = (anyImg.mimeType as string) || (anyImg.mime as string) || 'image/png';
      if (!raw) return null as unknown as ImagePayload;
      return { mimeType: mime, data: raw };
    }
    return null as unknown as ImagePayload;
  }).filter(Boolean) as ImagePayload[];
}

export const studioService = {
  /**
   * Executa a geração de imagem (renderização)
   */
  generateVisual: async (
    prompt: string, 
    images?: ImageData[], 
    stylePrompt?: string, 
    decorPrompt?: string
  ): Promise<string | null> => {
    const finalPrompt = `ACT AS AN EXPERT ARCHITECTURAL VISUALIZER. 
      Style: ${stylePrompt || 'Photorealistic'}. 
      Decor: ${decorPrompt || 'Modern'}. 
      Instructions: ${prompt}. 
      Maximum realism, 8k.`;
      
    const processedImages = normalizeImages(images);
    return await callAIImage(finalPrompt, processedImages);
  },

  /**
   * Refinamento visual de uma imagem existente
   */
  refineVisual: async (originalImage: string, instructions: string): Promise<string | null> => {
    const base64 = originalImage.split(',')[1];
    const finalPrompt = `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${instructions}". Keep everything else the same.`;
    
    return await callAIImage(finalPrompt, [{ mimeType: 'image/png', data: base64 }]);
  }
};
