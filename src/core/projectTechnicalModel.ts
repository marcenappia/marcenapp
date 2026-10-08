import type { ProjectData } from '@/modules/projetos/types';

export type TechnicalFactStatus = 'confirmed' | 'inferred' | 'estimate';
export type TechnicalComponentKind = 'cabinet' | 'lateral' | 'divider' | 'shelf' | 'door' | 'drawer' | 'back' | 'special';

export interface TechnicalComponent {
  id: string;
  kind: TechnicalComponentKind;
  name: string;
  quantity: number;
  status: TechnicalFactStatus;
  source: string;
  details?: string;
}

export interface TechnicalMaterialBinding {
  role: 'external' | 'internal' | 'back';
  materialId: string;
  name: string;
  thicknessMm: number | null;
  sheetWidthMm: number | null;
  sheetHeightMm: number | null;
  grainSensitive: boolean;
  supplierId: string | null;
  supplierName: string | null;
  status: TechnicalFactStatus;
  source: string;
}

export interface TechnicalHardwareRequirement {
  hardwareId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: TechnicalFactStatus;
  source: string;
}

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
  components: TechnicalComponent[];
  parts: TechnicalPart[];
  hardwareRequirements: TechnicalHardwareRequirement[];
  materialBindings: TechnicalMaterialBinding[];
  assumptions: string[];
  missingInformation: string[];
}

const positiveInt = (value: number, fallback = 0) =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;

export function buildTechnicalStructure(project: ProjectData): TechnicalStructure {
  // ProjectData stores furniture dimensions in millimetres. Do not convert here:
  // YARA/createProjeto already normalizes natural-language dimensions to mm.
  const width = positiveInt(project.width);
  const height = positiveInt(project.height);
  const depth = positiveInt(project.depth);
  const doors = Math.max(0, Math.floor(project.doors || 0));

  const parts: TechnicalPart[] = [];
  const components: TechnicalComponent[] = [{ id: 'estrutura', kind: 'cabinet', name: 'Estrutura do móvel', quantity: 1, status: 'inferred', source: 'dimensions' }];
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
  const hardwareRequirements: TechnicalHardwareRequirement[] = [];
  const materialBindings: TechnicalMaterialBinding[] = [];

  if (width && height && depth) {
    components.push(
      { id: 'laterais', kind: 'lateral', name: 'Laterais', quantity: 2, status: 'inferred', source: 'dimensions' },
      { id: 'base', kind: 'special', name: 'Base', quantity: 1, status: 'inferred', source: 'dimensions' },
      { id: 'topo', kind: 'special', name: 'Topo', quantity: 1, status: 'inferred', source: 'dimensions' },
    );
    if (doors > 0) components.push({ id: 'portas', kind: 'door', name: 'Portas', quantity: doors, status: 'inferred', source: 'dimensions' });
    if (project.drawers > 0) components.push({ id: 'gavetas', kind: 'drawer', name: 'Gavetas', quantity: project.drawers, status: 'inferred', source: 'project' });
    if (project.modules > 1) components.push({ id: 'divisorias', kind: 'divider', name: 'Divisórias verticais', quantity: project.modules - 1, status: 'inferred', source: 'modules' });
    if (project.backMaterial?.trim()) components.push({ id: 'fundo', kind: 'back', name: 'Fundo', quantity: 1, status: 'inferred', source: 'backMaterial', details: project.backMaterial });
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

  if (project.drawers > 0) missingInformation.push('construção e dimensões internas das gavetas');
  if (project.modules > 1) missingInformation.push('distribuição interna de divisórias e prateleiras');
  if (!project.backMaterial?.trim()) missingInformation.push('material do fundo');

  return {
    version: 1,
    status: 'needs_confirmation',
    source: 'project_dimensions',
    dimensionsMm: { width, height, depth },
    components,
    parts,
    hardwareRequirements,
    materialBindings,
    assumptions,
    missingInformation,
  };
}
