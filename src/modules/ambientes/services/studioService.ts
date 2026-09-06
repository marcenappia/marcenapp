import { callAIImage } from '@/services/ai';
import { ImageData } from '@/store/useStudioStore';

export type StudioGenerationMode = 'render' | 'environment-project';

export const studioService = {
  /** Geração visual do Estúdio. */
  generateVisual: async (
    prompt: string,
    images?: ImageData[],
    stylePrompt?: string,
    decorPrompt?: string,
    mode: StudioGenerationMode = 'render'
  ): Promise<string | null> => {
    const finalPrompt = mode === 'environment-project'
      ? `ACT AS A PROFESSIONAL CUSTOM-CABINETRY 3D VISUALIZER.
        PRIMARY TASK: design the requested built-in cabinetry INSIDE THE REAL ROOM SHOWN IN THE REFERENCE PHOTO.
        Treat the supplied room photo as the spatial and photographic reference: preserve the visible walls, floor, ceiling, doors, windows, openings, perspective and camera point of view.
        PLACE THE JOINERY ON THE ACTUAL WALLS OF THIS ROOM. Do not create a generic showroom and do not replace the room with a different environment.
        Create a clean architectural 3D concept / design visualization, not a photorealistic advertisement.
        Show the cabinetry clearly enough for a carpenter to discuss layout, divisions, doors, drawers, niches, finishes and composition with the client.
        Keep the result visually coherent with the real room and avoid inventing openings or structural changes.
        Never present generated proportions as manufacturing dimensions; confirmed measurements remain the source of truth.
        Design direction: ${stylePrompt || 'clean contemporary custom cabinetry'}.
        Decor direction: ${decorPrompt || 'minimal, functional, carpentry-focused'}.
        USER REQUEST: ${prompt}.
        OUTPUT: one clear perspective visualization of the proposed cabinetry installed in the photographed environment.`
      : `ACT AS AN EXPERT ARCHITECTURAL VISUALIZER.
        Style: ${stylePrompt || 'Photorealistic'}.
        Decor: ${decorPrompt || 'Modern'}.
        Instructions: ${prompt}.
        Maximum realism, 8k.`;

    return await callAIImage(finalPrompt, images);
  },

  refineVisual: async (originalImage: string, instructions: string): Promise<string | null> => {
    const base64 = originalImage.split(',')[1];
    const finalPrompt = `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${instructions}". Keep everything else the same.`;
    return await callAIImage(finalPrompt, [{ mimeType: 'image/png', data: base64 }]);
  }
};
