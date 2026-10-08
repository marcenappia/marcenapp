import type { ProjectData } from '@/modules/projetos/types';

export type TechnicalFactStatus = 'confirmed' | 'inferred' | 'estimate';

export interface TechnicalPart {
  id: string;
  name: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number | null;
  material: string | null;
  materialId: string | null;
  grainSensitive: boolean;
  allowRotation: boolean;
  edgeBanding: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  status: TechnicalFactStatus;
  source: string;
}

export interface TechnicalStructure {
  version: 1;
  status: 'needs_confirmation' | 'confirmed';
  source: 'project_dimensions' | 'technical_import' | 'iara';
  dimensionsMm: { width: number; height: number; depth: number };
  parts: TechnicalPart[];
  assumptions: string[];
  missingInformation: string[];
}

const positiveInt = (value: number, fallback = 0) =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;

export function buildTechnicalStructure(project: ProjectData): TechnicalStructure {
  const width = positiveInt(project.width * 1000);
  const height = positiveInt(project.height * 1000);
  const depth = positiveInt(project.depth * 1000);
  const doors = Math.max(0, Math.floor(project.doors || 0));

  const parts: TechnicalPart[] = [];
  const assumptions: string[] = [
    'Estrutura inicial derivada apenas das dimensões e quantidades do projeto.',
    'Espessura, folgas construtivas, sentido de veio e fita de borda devem ser confirmados antes da produção.',
  ];
  const missingInformation: string[] = [
    'espessura e material definitivos da estrutura',
    'folgas e sistema construtivo',
    'sentido de veio e orientação de corte',
    'fita de borda por aresta',
  ];

  if (width && height && depth) {
    parts.push(
      { id: 'lateral-esq', name: 'Lateral esquerda', quantity: 1, widthMm: depth, heightMm: height, thicknessMm: null, material: project.externalMaterial || null, materialId: null, grainSensitive: false, allowRotation: true, edgeBanding: { top: false, right: false, bottom: false, left: false }, status: 'inferred', source: 'dimensions' },
      { id: 'lateral-dir', name: 'Lateral direita', quantity: 1, widthMm: depth, heightMm: height, thicknessMm: null, material: project.externalMaterial || null, materialId: null, grainSensitive: false, allowRotation: true, edgeBanding: { top: false, right: false, bottom: false, left: false }, status: 'inferred', source: 'dimensions' },
      { id: 'base', name: 'Base', quantity: 1, widthMm: Math.max(1, width), heightMm: depth, thicknessMm: null, material: project.internalMaterial || project.externalMaterial || null, materialId: null, grainSensitive: false, allowRotation: true, edgeBanding: { top: false, right: false, bottom: false, left: false }, status: 'inferred', source: 'dimensions' },
      { id: 'topo', name: 'Topo', quantity: 1, widthMm: Math.max(1, width), heightMm: depth, thicknessMm: null, material: project.internalMaterial || project.externalMaterial || null, materialId: null, grainSensitive: false, allowRotation: true, edgeBanding: { top: false, right: false, bottom: false, left: false }, status: 'inferred', source: 'dimensions' },
    );
  }

  if (doors > 0 && width && height) {
    const doorWidth = Math.max(1, Math.floor(width / doors));
    parts.push({
      id: 'porta',
      name: 'Porta',
      quantity: doors,
      widthMm: doorWidth,
      heightMm: height,
      thicknessMm: null,
      material: project.externalMaterial || null,
      materialId: null,
      grainSensitive: Boolean(project.externalMaterial),
      allowRotation: false,
      edgeBanding: { top: true, right: true, bottom: true, left: true },
      status: 'inferred',
      source: 'dimensions',
    });
  }

  return {
    version: 1,
    status: 'needs_confirmation',
    source: 'project_dimensions',
    dimensionsMm: { width, height, depth },
    parts,
    assumptions,
    missingInformation,
  };
}
