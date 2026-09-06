import { callAIImage } from '@/services/ai';
import { ImageData } from '@/store/useStudioStore';

export type StudioGenerationMode = 'render' | 'environment-project' | 'planned-environment';

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
      : mode === 'planned-environment'
      ? `ACT AS A PROFESSIONAL CUSTOM-CABINETRY 3D CONCEPT DESIGNER.
        PRIMARY TASK: create a proposed cabinetry project for an environment that is NOT YET READY, based on the client's description and any supplied sketch, floor plan, construction photo or reference image.
        There may be no finished room to photograph. Do NOT invent an existing finished environment and do NOT claim that the visualization is dimensionally accurate.
        Treat explicit dimensions supplied by the user as design constraints. If dimensions are absent, create a coherent CONCEPT ONLY and make no manufacturing claims.
        If a sketch or plan is supplied, use it as the spatial reference and preserve its openings, walls and proportions as far as the visual model allows.
        The result should help the carpenter SELL the project before the environment is finished: show the intended cabinetry, composition, finishes, doors, drawers, niches and overall client-facing appearance.
        This is a conceptual visualization for presentation and refinement. Exact production dimensions must later be confirmed in the real environment before budget finalization, production or cutting.
        Design direction: ${stylePrompt || 'clean contemporary custom cabinetry'}.
        Decor direction: ${decorPrompt || 'minimal, functional, carpentry-focused'}.
        USER REQUEST: ${prompt}.
        OUTPUT: one clear client-facing architectural visualization of the planned cabinetry.`
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
