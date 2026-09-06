import { callAIImage } from '@/services/ai';
import { ImageData } from '@/store/useStudioStore';

export type StudioGenerationMode = 'render' | 'environment-project' | 'planned-environment';

export const studioService = {
  generateVisual: async (
    prompt: string,
    images?: ImageData[],
    stylePrompt?: string,
    decorPrompt?: string,
    mode: StudioGenerationMode = 'render'
  ): Promise<string | null> => {
    const finalPrompt = mode === 'environment-project'
      ? `ACT AS A PROFESSIONAL CUSTOM-CABINETRY 3D VISUALIZER. PRIMARY TASK: design the requested built-in cabinetry INSIDE THE REAL ROOM SHOWN IN THE REFERENCE PHOTO. Preserve visible walls, floor, ceiling, doors, windows, openings, perspective and camera point of view. PLACE THE JOINERY ON THE ACTUAL WALLS OF THIS ROOM. Do not create a generic showroom. Create a clean architectural 3D concept / design visualization. Show layout, divisions, doors, drawers, niches and finishes clearly. Never present generated proportions as manufacturing dimensions; confirmed measurements remain the source of truth. Design direction: ${stylePrompt || 'clean contemporary custom cabinetry'}. Decor direction: ${decorPrompt || 'minimal, functional, carpentry-focused'}. USER REQUEST: ${prompt}. OUTPUT: one clear perspective visualization of the proposed cabinetry installed in the photographed environment.`
      : mode === 'planned-environment'
      ? `ACT AS A PROFESSIONAL CUSTOM-CABINETRY 3D CONCEPT DESIGNER. PRIMARY TASK: create a proposed cabinetry project for an environment that is NOT YET READY, based on the client's description and any supplied sketch, floor plan, construction photo or reference image. Do NOT invent an existing finished environment and do NOT claim dimensional accuracy. Treat explicit dimensions as design constraints. If a sketch or plan is supplied, use it as spatial reference and preserve openings, walls and proportions as far as the visual model allows. This helps the carpenter SELL the project before the environment is finished. Exact production dimensions must later be confirmed in the real environment before budget finalization, production or cutting. Design direction: ${stylePrompt || 'clean contemporary custom cabinetry'}. Decor direction: ${decorPrompt || 'minimal, functional, carpentry-focused'}. USER REQUEST: ${prompt}. OUTPUT: one clear client-facing architectural visualization of the planned cabinetry.`
      : `ACT AS AN EXPERT ARCHITECTURAL VISUALIZER. Style: ${stylePrompt || 'Photorealistic'}. Decor: ${decorPrompt || 'Modern'}. Instructions: ${prompt}. Maximum realism, 8k.`;
    return await callAIImage(finalPrompt, images);
  },

  /** Eleva uma planta baixa para uma visualização espacial conceitual. */
  elevateFloorPlan: async (
    floorPlan: ImageData,
    projectRequest: string,
    dimensions?: { width?: number; height?: number; depth?: number }
  ): Promise<string | null> => {
    const dimensionContext = dimensions?.width && dimensions?.height && dimensions?.depth
      ? `REFERENCE DIMENSIONS: width ${dimensions.width} m, height ${dimensions.height} m, depth ${dimensions.depth} m.`
      : 'NO COMPLETE CONFIRMED DIMENSIONS WERE PROVIDED. Treat proportions as reference only.';
    const prompt = `ACT AS AN ARCHITECTURAL 3D MODELING ASSISTANT FOR CUSTOM CABINETRY. PRIMARY TASK: interpret the supplied FLOOR PLAN and create a clear client-facing perspective visualization of the SAME SPACE. Reconstruct the room volume from the plan as far as the drawing allows: raise perimeter walls, preserve room proportions, and interpret doors, windows and other clearly marked openings in their correct locations. Do not arbitrarily move walls, doors or windows. Do not add structural openings not represented. If a height or vertical detail cannot be known from the floor plan, use a neutral architectural assumption and keep it conceptual. The goal is to avoid manually rebuilding the apartment shell before designing cabinetry. The result must look like the intended apartment environment ready to receive custom cabinetry, not a generic room. ${dimensionContext} PROJECT REQUEST: ${projectRequest || 'Prepare the environment as a clean base for a custom cabinetry project.'} IMPORTANT: this is an ELEVATED VISUAL RECONSTRUCTION, not a technical BIM/CAD model. Never claim generated wall heights or dimensions are fabrication-grade. OUTPUT: one clean architectural perspective of the elevated environment, with walls, floor, ceiling, doors and windows represented according to the supplied plan.`;
    return await callAIImage(prompt, [floorPlan]);
  },

  refineVisual: async (originalImage: string, instructions: string): Promise<string | null> => {
    const base64 = originalImage.split(',')[1];
    const finalPrompt = `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${instructions}". Keep everything else the same.`;
    return await callAIImage(finalPrompt, [{ mimeType: 'image/png', data: base64 }]);
  }
};
