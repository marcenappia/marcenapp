export type HumanWallReference = 'direita' | 'esquerda' | 'frente' | 'tras' | 'fundo' | 'adjacente' | 'oposta' | 'nao_determinada';

const WALL_PATTERNS: Array<[HumanWallReference, RegExp[]]> = [
  ['direita', [/\bparede\s+(?:do\s+)?lado\s+direito\b/i, /\bparede\s+direita\b/i, /\bparede\s+da\s+direita\b/i]],
  ['esquerda', [/\bparede\s+(?:do\s+)?lado\s+esquerdo\b/i, /\bparede\s+esquerda\b/i, /\bparede\s+da\s+esquerda\b/i]],
  ['frente', [/\bparede\s+(?:da|de|na)\s+frente\b/i, /\bparede\s+frontal\b/i, /\bparede\s+da\s+frente\b/i]],
  ['tras', [/\bparede\s+(?:de|da)\s+tr[aá]s\b/i, /\bparede\s+traseira\b/i, /\bparede\s+dos\s+fundos\b/i]],
  ['fundo', [/\bparede\s+do\s+fundo\b/i, /\bparede\s+ao\s+fundo\b/i]],
  ['adjacente', [/\bparede\s+ao\s+lado\b/i, /\bparede\s+adjacente\b/i]],
  ['oposta', [/\bparede\s+oposta\b/i, /\bparede\s+do\s+outro\s+lado\b/i]],
];

export function detectHumanWallReferences(text: string): HumanWallReference[] {
  const found = new Set<HumanWallReference>();
  for (const [reference, patterns] of WALL_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) found.add(reference);
  }
  return [...found];
}

export function humanSpatialLanguagePrompt(text: string): string {
  const detected = detectHumanWallReferences(text);
  const detectedText = detected.length ? detected.join(', ') : 'nenhuma referência lateral explícita detectada';
  return [
    'LINGUAGEM ESPACIAL DO MARCENEIRO:',
    'A IARA deve conversar e raciocinar primeiro na linguagem humana usada no dia a dia da marcenaria.',
    'Use "parede da direita", "parede do lado direito", "parede da esquerda", "parede da frente", "parede de trás", "parede do fundo", "parede ao lado" e termos equivalentes como referências naturais.',
    'NÃO obrigue o usuário a pensar em norte, sul, leste ou oeste.',
    'Coordenadas cardeais podem existir internamente para cálculo, mas nunca devem substituir a referência humana na conversa ou no resultado apresentado ao marceneiro.',
    'A palavra direita/esquerda deve ser interpretada em relação à vista/câmera de referência quando houver imagem; frente/trás deve respeitar o sentido do ambiente indicado pelo usuário.',
    'Se a referência depender da posição da câmera e não for possível determinar com segurança, pergunte ou marque como desconhecida em vez de inventar.',
    `Referências humanas detectadas no pedido: ${detectedText}.`,
    `Pedido original: ${text}`,
  ].join(' ');
}

export function humanizeWallLabel(value: unknown): string {
  const raw = String(value ?? '').toLocaleLowerCase('pt-BR');
  if (/\b(north|norte)\b/.test(raw)) return 'parede da frente';
  if (/\b(south|sul)\b/.test(raw)) return 'parede de trás';
  if (/\b(east|leste)\b/.test(raw)) return 'parede da direita';
  if (/\b(west|oeste)\b/.test(raw)) return 'parede da esquerda';
  return String(value ?? 'parede não determinada');
}
