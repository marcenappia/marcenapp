export type SpatialEvidence = 'measured' | 'estimated' | 'unknown';

export type HumanWallReference =
  | 'direita'
  | 'esquerda'
  | 'frente'
  | 'tras'
  | 'fundo'
  | 'adjacente'
  | 'oposta'
  | 'nao_determinada';

export interface PlanPoint {
  x: number;
  y: number;
}

export interface PlanSegment {
  start: PlanPoint;
  end: PlanPoint;
  length: number | null;
  evidence: SpatialEvidence;
  humanReference: HumanWallReference;
}

export interface PlanOpening {
  id: string;
  type: 'door' | 'window' | 'opening' | 'unknown';
  wallIndex: number | null;
  position: number | null;
  width: number | null;
  height: number | null;
  evidence: SpatialEvidence;
  wallReference: HumanWallReference;
}

export interface FloorPlanEnvironment {
  id: string;
  name: string;
  type: string | null;
  confidence: number | null;
}

export interface FloorPlanGeometry {
  version: 1;
  units: 'm' | 'cm' | 'unknown';
  scale: number | null;
  scaleEvidence: SpatialEvidence;
  environments: FloorPlanEnvironment[];
  walls: PlanSegment[];
  openings: PlanOpening[];
  bounds: { width: number | null; depth: number | null };
  assumptions: string[];
  warnings: string[];
}

const HUMAN_REFERENCES: Record<string, HumanWallReference> = {
  direita: 'direita',
  direita_: 'direita',
  esquerda: 'esquerda',
  frente: 'frente',
  tras: 'tras',
  'trás': 'tras',
  fundo: 'fundo',
  adjacente: 'adjacente',
  oposta: 'oposta',
};

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function point(value: unknown): PlanPoint | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = finite(value[0]);
  const y = finite(value[1]);
  return x === null || y === null ? null : { x, y };
}

function humanReference(value: unknown): HumanWallReference {
  const normalized = String(value ?? '').trim().toLowerCase();
  return HUMAN_REFERENCES[normalized] ?? 'nao_determinada';
}

function evidenceForLength(length: number | null): SpatialEvidence {
  return length === null || length <= 0 ? 'unknown' : 'estimated';
}

export interface FloorPlanAnalysisInput {
  dimensions?: { width?: number; depth?: number; ceilingHeight?: number };
  environments?: Array<{ name?: string; type?: string; confidence?: number }>;
  walls?: Array<{ start?: [number, number]; end?: [number, number]; length?: number; humanReference?: string }>;
  openings?: Array<{ type?: string; position?: string | number; width?: number; height?: number; wallReference?: string }>;
  notes?: string[];
}

/**
 * Converts the structured result of IARA's floor-plan analysis into an
 * explicit, render-ready spatial model. It deliberately keeps unknown values
 * unknown instead of manufacturing dimensions or topology.
 */
export function buildFloorPlanGeometry(input: FloorPlanAnalysisInput): FloorPlanGeometry {
  const warnings: string[] = [];
  const assumptions: string[] = [];

  const walls: PlanSegment[] = (input.walls ?? []).flatMap((wall) => {
    const start = point(wall.start);
    const end = point(wall.end);
    if (!start || !end) {
      warnings.push('Uma parede foi descartada porque seus pontos não puderam ser determinados.');
      return [];
    }

    const explicitLength = finite(wall.length);
    const geometricLength = Math.hypot(end.x - start.x, end.y - start.y);
    const length = explicitLength !== null && explicitLength > 0
      ? explicitLength
      : geometricLength > 0 ? geometricLength : null;

    return [{
      start,
      end,
      length,
      evidence: explicitLength !== null ? 'measured' : evidenceForLength(length),
      humanReference: humanReference(wall.humanReference),
    }];
  });

  const openings: PlanOpening[] = (input.openings ?? []).map((opening, index) => {
    const rawType = String(opening.type ?? '').toLowerCase();
    const type: PlanOpening['type'] = rawType.includes('door') || rawType.includes('porta')
      ? 'door'
      : rawType.includes('window') || rawType.includes('janela')
        ? 'window'
        : rawType.includes('opening') || rawType.includes('abertura')
          ? 'opening'
          : 'unknown';
    const width = finite(opening.width);
    const height = finite(opening.height);
    const position = typeof opening.position === 'number' ? opening.position : null;
    const wallRef = humanReference(opening.wallReference);
    const wallIndex = wallRef === 'nao_determinada'
      ? null
      : walls.findIndex((wall) => wall.humanReference === wallRef);

    if (wallIndex === null || wallIndex < 0) {
      warnings.push(`A abertura ${index + 1} não pôde ser vinculada com segurança a uma parede.`);
    }
    if (width === null) assumptions.push(`Largura da abertura ${index + 1} permanece desconhecida.`);
    if (height === null) assumptions.push(`Altura da abertura ${index + 1} permanece desconhecida.`);

    return {
      id: `opening-${index + 1}`,
      type,
      wallIndex: wallIndex >= 0 ? wallIndex : null,
      position,
      width,
      height,
      evidence: width !== null && height !== null ? 'measured' : 'unknown',
      wallReference: wallRef,
    };
  });

  if (!walls.length) warnings.push('Nenhuma parede foi determinada pela análise da planta.');
  if (!input.dimensions?.width || !input.dimensions?.depth) {
    assumptions.push('Dimensões gerais da planta permanecem parcialmente desconhecidas.');
  }

  return {
    version: 1,
    units: 'unknown',
    scale: null,
    scaleEvidence: 'unknown',
    environments: (input.environments ?? []).map((environment, index) => ({
      id: `environment-${index + 1}`,
      name: String(environment.name || `Ambiente ${index + 1}`),
      type: environment.type ? String(environment.type) : null,
      confidence: finite(environment.confidence),
    })),
    walls,
    openings,
    bounds: {
      width: finite(input.dimensions?.width),
      depth: finite(input.dimensions?.depth),
    },
    assumptions: [...assumptions, ...(input.notes ?? [])],
    warnings,
  };
}
