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

function toMillimeters(value: string, unit: string | undefined): number {
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

function findDimensionsByOrder(text: string): Partial<Record<ProjectDimensionKey, number>> {
  const matches = [...text.matchAll(/(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)\\b/gi)];
  if (matches.length < 2) return {};
  const values = matches.map(match => toMillimeters(match[1], match[2]));
  return {
    ...(values[0] ? { width: values[0] } : {}),
    ...(values[1] ? { height: values[1] } : {}),
    ...(values[2] ? { depth: values[2] } : {}),
  };
}

function mergeDefined<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  return Object.keys(patch).reduce((result, key) => {
    const value = patch[key];
    if (value !== undefined) (result as Record<string, unknown>)[key] = value;
    return result;
  }, { ...base });
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
  return /\\b(?:crie|criar|cria|quero|monte|montar|faca|faca um|faça)\\b/i.test(normalize(text));
}

/**
 * Converts a natural-language turn into a small, deterministic state patch.
 * This is intentionally not an LLM parser: it is the cheap memory layer that
 * preserves facts between turns and never invents missing dimensions.
 */
export function extractProjectStatePatch(text: string): ProjectStatePatch {
  const normalized = normalize(text);
  const named = findNamedDimensions(normalized);
  const ordered = Object.keys(named).some(key => named[key as ProjectDimensionKey] !== undefined)
    ? named
    : findDimensionsByOrder(normalized);
  const type = inferType(normalized);
  const projectDimensions = normalized.includes('bancada') && normalized.includes('armario superior')
    ? findDimensionsByOrder(normalized)
    : ordered;

  return {
    ...(hasCreateIntent(normalized) ? { intent: 'create_project' } : {}),
    project: {
      ...(type ? { type } : {}),
      dimensions: projectDimensions,
    },
  };
}

export function applyProjectStatePatch(state: ProjectState, patch: ProjectStatePatch): ProjectState {
  const project = patch.project
    ? {
        ...state.project,
        ...patch.project,
        dimensions: mergeDefined(state.project.dimensions, patch.project.dimensions ?? {}),
      }
    : state.project;

  const components = patch.components?.length
    ? [...state.components, ...patch.components.filter(component => !state.components.some(existing => existing.id === component.id))]
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
