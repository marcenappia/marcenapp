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
  // Keep original text so the conjunction "e" cannot be confused with accented "é".
  const labelFirst = text.match(
    new RegExp(`(?:${label})\\s*(?:(?:é|eh|sera|vai\\s+ser|fica|ficara|deve\\s+ser)\\s*)?(?:de|:|=)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)?\\b`, 'i'),
  );
  if (labelFirst) return toMillimeters(labelFirst[1], labelFirst[2]);
  const valueFirst = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)\\s*(?:(?:de|do|da)\\s+)?(?:${label})\\b`, 'i'));
  return valueFirst ? toMillimeters(valueFirst[1], valueFirst[2]) : undefined;
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
  const dimensions = findNamedDimensions(segment);
  const ordered = findDimensionsByOrder(segment);
  const merged: Partial<Record<ProjectDimensionKey, number>> = {
    ...(dimensions.width !== undefined ? { width: dimensions.width } : {}),
    ...(dimensions.height !== undefined ? { height: dimensions.height } : {}),
    ...(dimensions.depth !== undefined ? { depth: dimensions.depth } : {}),
  };
  if (merged.width === undefined && ordered[0] !== undefined) merged.width = ordered[0];
  if (merged.height === undefined && ordered[1] !== undefined) merged.height = ordered[1];
  if (merged.depth === undefined && ordered[2] !== undefined) merged.depth = ordered[2];
  if (Object.keys(merged).length === 0) return null;
  return { id, type, dimensions: merged, properties: {} };
}

function extractComponents(text: string): ProjectComponentState[] {
  const components: ProjectComponentState[] = [];
  const upperMatch = text.match(/(?:no|na)?\s*arm[áa]rio\s+superior(?:,|\s+)([^.]*?)(?=$|\b(?:e\s+)?(?:agora|depois)\b)/i);
  const upperSegment = upperMatch?.[1] ?? '';
  const upper = componentFromSegment(upperSegment, 'armario_superior', 'component-armario-superior-01');
  if (upper) components.push(upper);

  const benchMatch = text.match(/(?:essa|esta|a)\s+bancada(?:,|\s+)([^.]*?)(?=$|\b(?:no|na)\s+arm[áa]rio\b)/i);
  const benchSegment = benchMatch?.[1] ?? '';
  const bench = componentFromSegment(benchSegment, 'bancada', 'component-bancada-01');
  if (bench) components.push(bench);

  return components;
}

function dimensionsFromMeasurements(
  text: string,
  named: Partial<Record<ProjectDimensionKey, number>>,
): Partial<Record<ProjectDimensionKey, number>> {
  const dimensions: Partial<Record<ProjectDimensionKey, number>> = { ...named };
  const remaining = findDimensionsByOrder(text);
  const namedValues = new Set(Object.values(named).filter((value): value is number => value !== undefined));
  const unmatched = remaining.map(value => {
    if (namedValues.has(value)) {
      namedValues.delete(value);
      return undefined;
    }
    return value;
  }).filter((value): value is number => value !== undefined);
  const missingKeys: ProjectDimensionKey[] = (['width', 'height', 'depth'] as const).filter(key => dimensions[key] === undefined);
  missingKeys.forEach((key, index) => {
    if (unmatched[index] !== undefined) dimensions[key] = unmatched[index];
  });
  return dimensions;
}

export function extractProjectStatePatch(text: string): ProjectStatePatch {
  const normalized = normalize(text);
  const named = findNamedDimensions(text);
  const dimensions = dimensionsFromMeasurements(text, named);
  const type = inferType(normalized);
  const components = extractComponents(text);

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