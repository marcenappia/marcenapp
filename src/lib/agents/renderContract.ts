export type TechnicalRenderReferenceImage = {
  mimeType: 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/webp';
  data: string;
  role: 'technical_2d' | 'scene' | 'environment' | 'material_reference';
};

export type TechnicalRenderPackage = {
  version: 1;
  projectId?: string;
  geometry: Record<string, unknown>;
  parts: Array<Record<string, unknown>>;
  materials: Array<Record<string, unknown>>;
  camera?: Record<string, unknown>;
  context?: Record<string, unknown>;
  referenceImages?: TechnicalRenderReferenceImage[];
};

export function isTechnicalRenderPackage(value: unknown): value is TechnicalRenderPackage {
  if (!value || typeof value !== 'object') return false;
  const packageValue = value as Record<string, unknown>;
  return packageValue.version === 1
    && !!packageValue.geometry
    && typeof packageValue.geometry === 'object'
    && Array.isArray(packageValue.parts)
    && Array.isArray(packageValue.materials)
    && (!packageValue.referenceImages || Array.isArray(packageValue.referenceImages));
}

export function buildTechnicalRenderPackage(input: Record<string, unknown>, dependencyResults: Array<{ agentId: string; data?: Record<string, unknown> }> = []): TechnicalRenderPackage | null {
  const supplied = input.technicalPackage;
  if (isTechnicalRenderPackage(supplied)) return supplied;

  const geometry = (input.scene ?? input.geometry) as Record<string, unknown> | undefined;
  const parts = Array.isArray(input.parts) ? input.parts as Array<Record<string, unknown>> : [];
  const materials = Array.isArray(input.materials) ? input.materials as Array<Record<string, unknown>> : [];
  const camera = input.camera as Record<string, unknown> | undefined;
  const context = input.context as Record<string, unknown> | undefined;
  const referenceImages = Array.isArray(input.referenceImages)
    ? input.referenceImages as TechnicalRenderReferenceImage[]
    : [];

  const engineering = dependencyResults.find(result => result.agentId === 'furniture_engineering')?.data;
  const materialResult = dependencyResults.find(result => result.agentId === 'materials')?.data;

  if (!geometry && parts.length === 0) return null;

  return {
    version: 1,
    projectId: typeof input.projectId === 'string' ? input.projectId : undefined,
    geometry: geometry ?? { dimensions: { width: input.width, height: input.height, depth: input.depth } },
    parts,
    materials: materials.length ? materials : (materialResult?.materials as Array<Record<string, unknown>> | undefined) ?? [],
    camera,
    context: {
      ...(context ?? {}),
      engineering: engineering ?? null,
    },
    referenceImages,
  };
}
