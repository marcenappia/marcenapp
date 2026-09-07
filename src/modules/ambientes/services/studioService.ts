import { callAIImage, callAIText } from '@/services/ai';
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

  /**
   * Eleva uma planta baixa em duas etapas: primeiro interpreta a topologia,
   * depois gera somente a casca arquitetônica. Isso evita que o modelo de
   * imagem trate a planta como inspiração livre e invente outro ambiente.
   */
  elevateFloorPlan: async (
    floorPlan: ImageData,
    projectRequest: string,
    dimensions?: { width?: number; height?: number; depth?: number }
  ): Promise<string | null> => {
    const dimensionContext = dimensions?.width && dimensions?.height && dimensions?.depth
      ? `REFERENCE DIMENSIONS: width ${dimensions.width} m, height ${dimensions.height} m, depth ${dimensions.depth} m.`
      : 'NO COMPLETE CONFIRMED DIMENSIONS WERE PROVIDED. Treat proportions as reference only.';

    const analysisPrompt = `You are a strict architectural floor-plan interpreter. Analyze the supplied floor plan image as the PRIMARY SOURCE OF TRUTH. Do not design furniture and do not imagine a different apartment. Return compact JSON only with: room_count, rooms (name, approximate shape, relative position), exterior_walls (ordered description of sides and proportions), interior_walls, doors (room/side, approximate position, swing if visible), windows (room/side, approximate position, width relative to wall), circulation, fixed_elements, and uncertainty. Preserve topology and relative proportions. If something is not visible, say unknown. ${dimensionContext}`;

    let topology = '';
    try {
      topology = await callAIText(analysisPrompt, [floorPlan], true);
    } catch {
      topology = 'Floor-plan topology analysis unavailable. Use the supplied floor plan image itself as the only geometry authority.';
    }

    const prompt = `ACT AS A PROFESSIONAL ARCHITECTURAL 3D RECONSTRUCTION ASSISTANT. THIS IS NOT A FREEFORM DESIGN TASK.

PRIMARY SOURCE OF TRUTH: the supplied FLOOR PLAN IMAGE. The generated perspective must depict the SAME FLOOR PLAN, not a similar room, not a generic apartment, and not a newly invented kitchen or furniture layout.

STRICT RULES:
1. First reconstruct the exact spatial topology visible in the floor plan: room count, adjacency, perimeter shape, walls, corridors and fixed elements.
2. Keep doors and windows in the same walls and approximately the same relative positions shown in the plan. Do not mirror, rotate, simplify or relocate the plan.
3. Preserve relative room proportions and circulation. Do not turn a floor plan into a single-room showroom.
4. Do NOT add cabinetry, kitchen units, furniture, appliances, decoration or invented architecture. The output is ONLY the neutral architectural shell of the plan: floor, walls, ceiling, doors and windows/openings that are clearly represented.
5. Do not invent missing rooms or openings. If a feature is uncertain, keep it neutral and explicitly preserve the visible plan topology rather than guessing.
6. Camera perspective is secondary. Fidelity to the plan is primary. A simple cutaway/axonometric or neutral interior perspective is preferable to a beautiful but incorrect room.
7. Never claim fabrication-grade dimensions. This is a visual reconstruction only.

FLOOR-PLAN INTERPRETATION FROM A SEPARATE ANALYSIS PASS:
${topology}

${dimensionContext}
PROJECT CONTEXT (does not override the plan): ${projectRequest || 'Prepare the same environment as a neutral base for a future custom cabinetry project.'}

OUTPUT: one neutral architectural perspective/axonometric reconstruction of the SAME FLOOR PLAN, with no cabinetry or decorative redesign. The result will be used as the base environment for a later Studio design step.`;

    return await callAIImage(prompt, [floorPlan]);
  },

  refineVisual: async (originalImage: string, instructions: string): Promise<string | null> => {
    const base64 = originalImage.split(',')[1];
    const finalPrompt = `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${instructions}". Keep everything else the same.`;
    return await callAIImage(finalPrompt, [{ mimeType: 'image/png', data: base64 }]);
  }
};
