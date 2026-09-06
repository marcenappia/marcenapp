/** Memória operacional da IARA por projeto.
 * Guarda evidências técnicas, origem, mudanças e conflitos sem transformar
 * estimativas em fatos confirmados.
 */
export type IaraMemoryStatus = 'CONFIRMADO' | 'ESTIMADO' | 'PRECISA_CONFERIR';
export type IaraMemorySource = 'usuario' | 'studio' | 'diario' | 'orcamento' | 'producao' | 'iara' | 'sistema';

export interface IaraMemoryFact {
  key: string;
  label: string;
  value: string | number | boolean;
  status: IaraMemoryStatus;
  source: IaraMemorySource;
  updatedAt: string;
  confirmedAt?: string;
  previousValue?: string | number | boolean;
}

export interface IaraMemoryConflict {
  id: string;
  key: string;
  label: string;
  confirmedValue: string | number | boolean;
  newValue: string | number | boolean;
  detectedAt: string;
  resolved: boolean;
}

export interface IaraMemory {
  version: 1;
  updatedAt: string;
  facts: IaraMemoryFact[];
  conflicts: IaraMemoryConflict[];
  lastEvent?: { type: string; text: string; at: string };
}

export interface RememberFactInput {
  key: string;
  label: string;
  value: string | number | boolean;
  status: IaraMemoryStatus;
  source: IaraMemorySource;
  now?: string;
}

export const createIaraMemory = (): IaraMemory => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  facts: [],
  conflicts: [],
});

export const normalizeIaraMemory = (raw: unknown): IaraMemory => {
  if (!raw || typeof raw !== 'object') return createIaraMemory();
  const value = raw as Partial<IaraMemory>;
  return {
    version: 1,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString(),
    facts: Array.isArray(value.facts) ? value.facts.filter(Boolean) as IaraMemoryFact[] : [],
    conflicts: Array.isArray(value.conflicts) ? value.conflicts.filter(Boolean) as IaraMemoryConflict[] : [],
    lastEvent: value.lastEvent,
  };
};

export function rememberFact(memory: IaraMemory, input: RememberFactInput): IaraMemory {
  const now = input.now ?? new Date().toISOString();
  const current = memory.facts.find(fact => fact.key === input.key);
  const conflicts = [...memory.conflicts];
  const valueChanged = current && String(current.value) !== String(input.value);
  if (valueChanged && current.status === 'CONFIRMADO' && input.status === 'CONFIRMADO') {
    conflicts.unshift({
      id: `conflict-${input.key}-${Date.now()}`,
      key: input.key,
      label: input.label,
      confirmedValue: current.value,
      newValue: input.value,
      detectedAt: now,
      resolved: false,
    });
  }
  const nextFact: IaraMemoryFact = {
    key: input.key,
    label: input.label,
    value: input.value,
    status: input.status,
    source: input.source,
    updatedAt: now,
    confirmedAt: input.status === 'CONFIRMADO' ? (current?.confirmedAt ?? now) : current?.confirmedAt,
    previousValue: valueChanged ? current?.value : current?.previousValue,
  };
  return {
    ...memory,
    updatedAt: now,
    facts: [nextFact, ...memory.facts.filter(fact => fact.key !== input.key)].slice(0, 100),
    conflicts: conflicts.slice(0, 50),
  };
}

export function rememberMeasurements(
  memory: IaraMemory,
  measurements: { width?: number; height?: number; depth?: number },
  status: IaraMemoryStatus,
  source: IaraMemorySource,
  now?: string,
): IaraMemory {
  let next = memory;
  const entries = [
    ['width', 'Largura', measurements.width],
    ['height', 'Altura', measurements.height],
    ['depth', 'Profundidade', measurements.depth],
  ] as const;
  for (const [key, label, value] of entries) {
    if (Number.isFinite(value) && Number(value) > 0) {
      next = rememberFact(next, { key, label, value: Number(value), status, source, now });
    }
  }
  return next;
}

export function getMeasurementEvidence(memory: IaraMemory): 'confirmed' | 'estimated' | 'unknown' {
  const facts = ['width', 'height', 'depth'].map(key => memory.facts.find(fact => fact.key === key));
  if (facts.every(fact => fact?.status === 'CONFIRMADO')) return 'confirmed';
  if (facts.some(fact => fact?.status === 'ESTIMADO')) return 'estimated';
  return 'unknown';
}

export function getConfirmedMeasurements(memory: IaraMemory) {
  const read = (key: string) => memory.facts.find(fact => fact.key === key && fact.status === 'CONFIRMADO')?.value;
  return {
    width: typeof read('width') === 'number' ? read('width') as number : undefined,
    height: typeof read('height') === 'number' ? read('height') as number : undefined,
    depth: typeof read('depth') === 'number' ? read('depth') as number : undefined,
  };
}

export function rememberEvent(memory: IaraMemory, type: string, text: string, now = new Date().toISOString()): IaraMemory {
  return { ...memory, updatedAt: now, lastEvent: { type, text, at: now } };
}
