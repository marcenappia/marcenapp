import { callAIImage } from '@/services/ai';
import { ImageData } from '@/store/useStudioStore';
import type { TechnicalRenderPackage } from '@/lib/agents/renderContract';

interface ImagePayload { mimeType: string; data: string; }

function normalizeImages(images?: ImageData[]): ImagePayload[] | undefined {
  if (!images || images.length === 0) return undefined;
  return images.map(img => {
    if (typeof img === 'object' && img !== null && 'mimeType' in img) return { mimeType: img.mimeType, data: img.data };
    if (typeof img === 'string') { const raw = img.includes(',') ? img.split(',')[1] : img; return { mimeType: 'image/png', data: raw }; }
    if (typeof img === 'object' && img !== null) { const raw = (img as Record<string, unknown>).baseRaw as string || (img as Record<string, unknown>).data as string || ''; const mime = (img as Record<string, unknown>).mimeType as string || (img as Record<string, unknown>).mime as string || 'image/png'; if (!raw) return null as unknown as ImagePayload; return { mimeType: mime, data: raw }; }
    return null as unknown as ImagePayload;
  }).filter(Boolean) as ImagePayload[];
}

function technicalPackagePrompt(packageValue?: TechnicalRenderPackage): string {
  if (!packageValue) return '';
  const compact = JSON.stringify({
    version: packageValue.version,
    projectId: packageValue.projectId,
    geometry: packageValue.geometry,
    parts: packageValue.parts,
    materials: packageValue.materials,
    camera: packageValue.camera,
    context: packageValue.context,
  });
  return `\nTECHNICAL SOURCE OF TRUTH (must be respected): ${compact}\nThe attached technical reference images are authoritative visual references. Preserve the supplied geometry, proportions, furniture composition, materials and camera/context; do not invent or simplify structural elements.`;
}

export const studioService = {
  generateVisual: async (
    prompt: string,
    images?: ImageData[],
    stylePrompt?: string,
    decorPrompt?: string,
    idempotencyKey?: string,
    technicalPackage?: TechnicalRenderPackage,
  ): Promise<string | null> => {
    const finalPrompt = `ACT AS AN EXPERT ARCHITECTURAL VISUALIZER.\n      Style: ${stylePrompt || 'Photorealistic'}.\n      Decor: ${decorPrompt || 'Modern'}.\n      Instructions: ${prompt}.${technicalPackagePrompt(technicalPackage)}\n      Maximum realism, 8k.`;
    return await callAIImage(finalPrompt, normalizeImages(images), idempotencyKey);
  },

  refineVisual: async (originalImage: string, instructions: string): Promise<string | null> => {
    const base64 = originalImage.split(',')[1];
    const finalPrompt = `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${instructions}". Keep everything else the same.`;
    return await callAIImage(finalPrompt, [{ mimeType: 'image/png', data: base64 }]);
  }
};
