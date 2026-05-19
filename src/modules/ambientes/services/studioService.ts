import { callAIImage } from '@/services/ai';
import { ImageData } from '@/store/useStudioStore';

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
      
    return await callAIImage(finalPrompt, images);
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
