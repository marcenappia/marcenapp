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
  primeira: 1,
  primeiro: 1,
  segunda: 2,
  segundo: 2,
  terceira: 3,
  terceiro: 3,
  quarta: 4,
  quarto: 4,
  quinta: 5,
  quinto: 5,
  sexta: 6,
  sexto: 6,
  sétima: 7,
  sétimo: 7,
  oitava: 8,
  oitavo: 8,
  nona: 9,
  nono: 9,
  décima: 10,
  décimo: 10,
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function detectType(input: string): PrecisionTargetType {
  const normalized = normalize(input);
  for (const [type, pattern] of TYPE_PATTERNS) {
    if (pattern.test(normalized)) return type;
  }
  return 'unknown';
}

function detectOrdinal(input: string): number | undefined {
  const normalized = normalize(input);
  const word = Object.keys(ORDINALS).find((candidate) => normalized.includes(normalize(candidate)));
  if (word) return ORDINALS[word];
  const numeric = normalized.match(/\b(\d{1,2})[ªº]?\s*(?:porta|gaveta|prateleira|painel|modulo)\b/i);
  return numeric ? Number(numeric[1]) : undefined;
}

function detectSide(input: string): 'left' | 'right' | 'center' | undefined {
  const normalized = normalize(input);
  if (/\b(?:a|da|do)\s+direita\b/.test(normalized) || /\bdireita\b/.test(normalized)) return 'right';
  if (/\b(?:a|da|do)\s+esquerda\b/.test(normalized) || /\besquerda\b/.test(normalized)) return 'left';
  return undefined;
}

function detectOperation(input: string): PrecisionOperation {
  const normalized = normalize(input);
  if (/\b(?:aumente|aumentar|aumenta|acrescente|acrescentar)\b/.test(normalized)) return 'increase';
  if (/\b(?:diminua|diminuir|diminui|reduza|reduzir)\b/.test(normalized)) return 'decrease';
  if (/\b(?:troque|trocar|substitua|substituir)\b/.test(normalized)) return 'replace';
  return 'set';
}

function detectProperty(input: string, targetType: PrecisionTargetType): string {
  const normalized = normalize(input);
  if (targetType === 'handle') return 'handle';
  if (/\b(?:puxador|puxadores)\b/.test(normalized)) return 'handle';
  if (/\b(?:cor|color)\b/.test(normalized)) return 'color';
  if (/\b(?:vidro|espelho|madeira|mdf|material|acabamento)\b/.test(normalized)) return 'material';
  if (/\b(?:largura|wide|width)\b/.test(normalized)) return 'width';
  if (/\b(?:altura|height)\b/.test(normalized)) return 'height';
  if (/\b(?:profundidade|depth)\b/.test(normalized)) return 'depth';
  if (/\b(?:posição|posicao)\b/.test(normalized)) return 'position';
  return 'value';
}

function detectValue(input: string, property: string): unknown {
  const normalized = normalize(input);
  if (property === 'color') {
    const colors = ['preto', 'branco', 'cinza', 'grafite', 'amadeirado', 'carvalho', 'nogueira'];
    return colors.find((color) => normalized.includes(color));
  }
  if (property === 'material') {
    const materials = ['vidro', 'espelho', 'madeira', 'mdf'];
    return materials.find((material) => normalized.includes(material));
  }
  const dimension = normalized.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\b/);
  if (dimension) {
    const number = Number(dimension[1].replace(',', '.'));
    const unit = dimension[2];
    return unit === 'm' ? number * 1000 : unit === 'cm' ? number * 10 : number;
  }
  return undefined;
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
    ...(side ? { spatialRelation: side } : {}),
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
    confidence: requiresClarification ? 0.35 : value === undefined ? 0.65 : 0.9,
    requiresClarification,
    ...(requiresClarification ? { reason: 'Alvo da alteração não foi identificado com precisão suficiente.' } : {}),
  };
}

export function isSafePrecisionEdit(contract: PrecisionEditContract): boolean {
  if (contract.scope === 'all') return false;
  if (contract.requiresClarification) return false;
  if (contract.target.type === 'unknown' && !contract.target.selectedObjectId && !contract.target.componentId) return false;
  if (!contract.property.trim()) return false;
  return contract.preserve === 'everything_else';
}
