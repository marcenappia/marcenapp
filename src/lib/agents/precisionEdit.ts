export type PrecisionTargetType =
  | 'door'
  | 'drawer'
  | 'handle'
  | 'shelf'
  | 'panel'
  | 'module'
  | 'cabinet'
  | 'unknown';

export type PrecisionOperation = 'set' | 'replace' | 'increase' | 'decrease';
export type PrecisionScope = 'single' | 'multiple' | 'all';

export type PrecisionTarget = {
  componentId?: string;
  parentId?: string;
  selectedObjectId?: string;
  type: PrecisionTargetType;
  ordinal?: number;
  side?: 'left' | 'right' | 'center';
  spatialRelation?: 'left' | 'right' | 'above' | 'below' | 'inside' | 'next_to';
};

export type PrecisionEditContract = {
  operation: PrecisionOperation;
  target: PrecisionTarget;
  property: string;
  value: unknown;
  scope: PrecisionScope;
  preserve: 'everything_else';
  confidence: number;
  requiresClarification: boolean;
  reason?: string;
};

export type PrecisionParseContext = {
  selectedObjectId?: string;
  selectedObjectType?: PrecisionTargetType;
};

const TYPE_PATTERNS: Array<[PrecisionTargetType, RegExp]> = [
  ['door', /\bporta(?:s)?\b/i],
  ['drawer', /\bgaveta(?:s)?\b/i],
  ['handle', /\bpuxador(?:es)?\b/i],
  ['shelf', /\bprateleira(?:s)?\b/i],
  ['panel', /\bpainel(?:s)?\b/i],
  ['module', /\bm[oó]dulo(?:s)?\b/i],
  ['cabinet', /\barm[aá]rio(?:s)?\b/i],
];

const ORDINALS: Record<string, number> = {
  primeira: 1, primeiro: 1, segunda: 2, segundo: 2, terceira: 3, terceiro: 3,
  quarta: 4, quarto: 4, quinta: 5, quinto: 5, sexta: 6, sexto: 6,
  sétima: 7, sétimo: 7, oitava: 8, oitavo: 8, nona: 9, nono: 9,
  décima: 10, décimo: 10,
};

function normalize(value: string): string { return value.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim(); }

function detectType(input: string): PrecisionTargetType {
  return TYPE_PATTERNS.find(([, pattern]) => pattern.test(input))?.[0] ?? 'unknown';
}

function detectOrdinal(input: string): number | undefined {
  const normalized = normalize(input);
  const word = Object.keys(ORDINALS).find((candidate) => new RegExp(`\\b${candidate}\\b`, 'i').test(normalized));
  if (word) return ORDINALS[word];
  const numeric = normalized.match(/\b(?:porta|gaveta|prateleira|painel|módulo|modulo|armário|armario)\s*(?:n[º°.]?\s*)?(\d+)\b/i);
  return numeric ? Number(numeric[1]) : undefined;
}

function detectSide(input: string): 'left' | 'right' | 'center' | undefined {
  const normalized = normalize(input);
  if (/\b(?:esquerda|esquerdo|lado esquerdo)\b/.test(normalized)) return 'left';
  if (/\b(?:direita|direito|lado direito)\b/.test(normalized)) return 'right';
  if (/\b(?:centro|central|meio)\b/.test(normalized)) return 'center';
  return undefined;
}

function detectProperty(input: string, type: PrecisionTargetType): string {
  const normalized = normalize(input);
  if (/\bcor(?:es)?\b/.test(normalized)) return 'color';
  if (/\b(?:largura|width)\b/.test(normalized)) return 'width';
  if (/\b(?:altura|height)\b/.test(normalized)) return 'height';
  if (/\b(?:profundidade|depth)\b/.test(normalized)) return 'depth';
  if (/\b(?:material|mdf|madeira)\b/.test(normalized)) return 'material';
  if (/\b(?:acabamento|finish)\b/.test(normalized)) return 'finish';
  return type === 'handle' ? 'style' : 'value';
}

function detectValue(input: string, property: string): unknown {
  const normalized = normalize(input);
  const number = normalized.match(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\b/);
  if (number && ['width', 'height', 'depth'].includes(property)) return { value: Number(number[1].replace(',', '.')), unit: number[2] ?? 'mm' };
  const quoted = input.match(/["“](.*?)["”]/);
  if (quoted) return quoted[1].trim();
  const after = normalized.match(/\b(?:para|por|como|em)\s+(.+)$/);
  return after?.[1]?.trim() ?? '';
}

function detectOperation(input: string): PrecisionOperation {
  const normalized = normalize(input);
  if (/\b(?:troque|trocar|substitua|substituir)\b/.test(normalized)) return 'replace';
  if (/\b(?:aumente|aumentar)\b/.test(normalized)) return 'increase';
  if (/\b(?:diminua|diminuir|reduza|reduzir)\b/.test(normalized)) return 'decrease';
  return 'set';
}

/**
 * Deterministic first pass for localized IARA edits.
 * It never fabricates component IDs: unresolved targets remain unresolved.
 */
export function parsePrecisionEdit(input: string, context: PrecisionParseContext = {}): PrecisionEditContract | undefined {
  const normalized = normalize(input);
  const type = detectType(input);
  const ordinal = detectOrdinal(input);
  const side = detectSide(input);
  const selectedObjectId = context.selectedObjectId;

  const editVerb = /\b(?:mude|mudar|muda|troque|trocar|troca|coloque|colocar|aumente|aumentar|diminua|diminuir|reduza|reduzir|substitua|substituir)\b/.test(normalized);
  if (!editVerb) return undefined;

  const hasTarget = Boolean(selectedObjectId || type !== 'unknown' || ordinal || side);
  if (!hasTarget) return undefined;

  const resolvedType = type !== 'unknown' ? type : context.selectedObjectType ?? 'unknown';
  const property = detectProperty(input, resolvedType);
  const value = detectValue(input, property);
  const explicitAll = /\b(?:todas|todos|cada)\b/.test(normalized);
  const scope: PrecisionScope = explicitAll ? 'all' : 'single';

  const target: PrecisionTarget = {
    ...(selectedObjectId ? { selectedObjectId } : {}),
    type: resolvedType,
    ...(ordinal ? { ordinal } : {}),
    ...(side ? { side } : {}),
    ...(side && side !== 'center' ? { spatialRelation: side } : {}),
  };

  const requiresClarification =
    !selectedObjectId &&
    (resolvedType === 'unknown' || (ordinal === undefined && side === undefined));

  return {
    operation: detectOperation(input),
    target,
    property,
    value,
    scope,
    preserve: 'everything_else',
    confidence: selectedObjectId || type !== 'unknown' ? 0.9 : 0.7,
    requiresClarification,
  };
}
