export type ProjectDimensionKey = 'width' | 'height' | 'depth';

export type ProjectComponentState = {
  id: string;
  type: string;
  name?: string;
  parentId?: string;
  dimensions: Partial<Record<ProjectDimensionKey, number>>;
  properties: Record<string, unknown>;
};

export type ProjectState = {
  intent: string | null;
  project: {
    name?: string;
    type?: string;
    dimensions: Partial<Record<ProjectDimensionKey, number>>;
  };
  components: ProjectComponentState[];
  pending: string[];
  selectedComponentId: string | null;
  sourceTurns: number;
};

export type ProjectStatePatch = {
  intent?: string;
  project?: Partial<ProjectState['project']>;
  components?: ProjectComponentState[];
  pending?: string[];
  selectedComponentId?: string | null;
};

export const emptyProjectState: ProjectState = {
  intent: null,
  project: { dimensions: {} },
  components: [],
  pending: [],
  selectedComponentId: null,
  sourceTurns: 0,
};

function normalize(value: string): string {
  return value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toMillimeters(value: string, unit?: string): number {
  const n = Number(value.replace(',', '.'));
  if (unit === 'm') return n * 1000;
  if (unit === 'cm') return n * 10;
  return n;
}

function findDimension(text: string, labels: string[]): number | undefined {
  const label = labels.join('|');
  const match = text.match(new RegExp(`(?:${label})\\s*(?:de|:|=)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)?\\b`, 'i'));
  return match ? toMillimeters(match[1], match[2]) : undefined;
}

function findNamedDimensions(text: string): Partial<Record<ProjectDimensionKey, number>> {
  return {
    width: findDimension(text, ['largura', 'largo']),
    height: findDimension(text, ['altura', 'alto']),
    depth: findDimension(text, ['profundidade', 'profundo']),
  };
}

function findDimensionsByOrder(text: string): number[] {
  return [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\b/gi)].map(match => toMillimeters(match[1], match[2]));
}

function inferType(text: string): string | undefined {
  const normalized = normalize(text);
  const candidates = [
    ['armario superior', 'armario_superior'],
    ['armario', 'armario'],
    ['bancada', 'bancada'],
    ['cozinha', 'cozinha'],
    ['balcao', 'balcao'],
    ['gaveteiro', 'gaveteiro'],
    ['painel', 'painel'],
  ] as const;
  return candidates.find(([label]) => normalized.includes(label))?.[1];
}

function hasCreateIntent(text: string): boolean {
  return /\b(?:crie|criar|cria|quero|monte|montar|faca)\b/i.test(normalize(text));
}

function componentFromSegment(segment: string, type: string, id: string): ProjectComponentState | null {
  const dimensions = findNamedDimensions(normalize(segment));
  const ordered = findDimensionsByOrder(normalize(segment));
  const merged = {
    ...dimensions,
    ...(dimensions.width === undefined && ordered[0] !== undefined ? { width: ordered[0] } : {}),
    ...(dimensions.height === undefined && ordered[1] !== undefined ? { height: ordered[1] } : {}),
    ...(dimensions.depth === undefined && ordered[2] !== undefined ? { depth: ordered[2] } : {}),
  };
  if (Object.keys(merged).length === 0) return null;
  return { id, type, dimensions: merged, properties: {} };
}

function extractComponents(text: string): ProjectComponentState[] {
  const normalized = normalize(text);
  const components: ProjectComponentState[] = [];
  const upperMatch = normalized.match(/(?:no|no\s+|na|na\s+)?armario\s+superior(?:,|\s+)([^.]*?)(?=$|\b(?:e\s+)?(?:agora|depois)\b)/i);
  const upperSegment = upperMatch?.[1] ?? '';
  const upper = componentFromSegment(upperSegment, 'armario_superior', 'component-armario-superior-01');
  if (upper) components.push(upper);

  const benchMatch = normalized.match(/(?:essa|esta|a)\s+bancada(?:,|\s+)([^.]*?)(?=$|\b(?:no|na)\s+armario\b)/i);
  const benchSegment = benchMatch?.[1] ?? '';
  const bench = componentFromSegment(benchSegment, 'bancada', 'component-bancada-01');
  if (bench) components.push(bench);

  return components;
}

/**
 * Cheap deterministic memory layer for IARA.
 * It extracts facts without inventing missing values and can be replayed over
 * multiple turns, which is suitable for text today and voice transcripts later.
 */
export function extractProjectStatePatch(text: string): ProjectStatePatch {
  const normalized = normalize(text);
  const named = findNamedDimensions(normalized);
  const ordered = findDimensionsByOrder(normalized);
  // Keep both strategies: ordered values fill missing axes and named values win for their axis.
  const dimensions: Partial<Record<ProjectDimensionKey, number>> = {
    ...(ordered[0] !== undefined ? { width: ordered[0] } : {}),
    ...(ordered[1] !== undefined ? { height: ordered[1] } : {}),
    ...(ordered[2] !== undefined ? { depth: ordered[2] } : {}),
    ...Object.fromEntries(Object.entries(named).filter(([, value]) => value !== undefined)),
  };
  const type = inferType(normalized);
  const components = extractComponents(normalized);

  return {
    ...(hasCreateIntent(normalized) ? { intent: 'create_project' } : {}),
    project: {
      ...(type ? { type } : {}),
      dimensions,
    },
    ...(components.length ? { components } : {}),
  };
}

export function applyProjectStatePatch(state: ProjectState, patch: ProjectStatePatch): ProjectState {
  const project = patch.project
    ? {
        ...state.project,
        ...patch.project,
        dimensions: { ...state.project.dimensions, ...(patch.project.dimensions ?? {}) },
      }
    : state.project;

  const components = patch.components?.length
    ? patch.components.reduce((result, component) => {
        const index = result.findIndex(existing => existing.id === component.id);
        if (index === -1) return [...result, component];
        const next = [...result];
        next[index] = {
          ...next[index],
          ...component,
          dimensions: { ...next[index].dimensions, ...component.dimensions },
          properties: { ...next[index].properties, ...component.properties },
        };
        return next;
      }, [...state.components])
    : state.components;

  return {
    ...state,
    ...(patch.intent ? { intent: patch.intent } : {}),
    project,
    components,
    ...(patch.pending ? { pending: patch.pending } : {}),
    ...(patch.selectedComponentId !== undefined ? { selectedComponentId: patch.selectedComponentId } : {}),
    sourceTurns: state.sourceTurns + 1,
  };
}

export function createProjectStateFromConversation(turns: string[], initial: ProjectState = emptyProjectState): ProjectState {
  return turns.filter(turn => turn.trim()).reduce((state, turn) => applyProjectStatePatch(state, extractProjectStatePatch(turn)), initial);
}

export function projectStateSummary(state: ProjectState): string {
  const { dimensions } = state.project;
  const parts = [
    dimensions.width ? `largura ${dimensions.width} mm` : null,
    dimensions.height ? `altura ${dimensions.height} mm` : null,
    dimensions.depth ? `profundidade ${dimensions.depth} mm` : null,
  ].filter(Boolean);
  return [state.project.type ? `tipo ${state.project.type}` : null, ...parts].filter(Boolean).join(', ');
}