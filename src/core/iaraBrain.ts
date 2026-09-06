/**
 * Cérebro de conferência da IARA.
 *
 * Esta camada fica antes do orquestrador: ela não tenta resolver o pedido,
 * apenas decide se há evidência suficiente para permitir uma ação que possa
 * gerar custo, desperdício ou uma decisão difícil de reverter.
 */
export type IaraEvidenceStatus = 'CONFIRMADO' | 'ESTIMADO' | 'PRECISA_CONFERIR';

export interface IaraBrainContext {
  width?: number;
  height?: number;
  depth?: number;
  hasImage?: boolean;
}

export interface IaraBrainAssessment {
  allow: boolean;
  critical: boolean;
  status: IaraEvidenceStatus;
  reason?: string;
  question?: string;
}

const IRREVERSIBLE_PATTERNS = [
  /liberar\s+(a\s+)?produ[cç][aã]o/i,
  /mandar\s+(para\s+)?cortar/i,
  /gerar\s+(o\s+)?plano\s+de\s+corte/i,
  /finalizar\s+(o\s+)?or[cç]amento/i,
  /fechar\s+(o\s+)?or[cç]amento/i,
  /aprovar\s+(o\s+)?or[cç]amento/i,
  /fazer\s+(a\s+)?compra/i,
  /comprar\s+(material|mdf|ferragem|chapas?)/i,
  /enviar\s+(para\s+)?(seccionadora|cnc|produ[cç][aã]o)/i,
  /pode\s+(mandar|liberar|enviar).*(corte|produ[cç][aã]o)/i,
];

const CRITICAL_WORDS = [
  'medida', 'dimensão', 'altura', 'largura', 'profundidade', 'folga',
  'parede', 'tomada', 'interruptor', 'elétrica', 'hidráulica', 'gás',
  'carga', 'peso', 'fixação', 'estrutura', 'esquadro', 'prumo', 'nível',
  'produção', 'corte', 'compra', 'material', 'espessura',
];

const hasAnyCriticalWord = (prompt: string) => {
  const lower = prompt.toLocaleLowerCase('pt-BR');
  return CRITICAL_WORDS.some(word => lower.includes(word));
};

const hasDimension = (value?: number) => Number.isFinite(value) && Number(value) > 0;

export function assessIaraRequest(prompt: string, context: IaraBrainContext = {}): IaraBrainAssessment {
  const normalized = prompt.trim();
  const critical = hasAnyCriticalWord(normalized) || IRREVERSIBLE_PATTERNS.some(pattern => pattern.test(normalized));
  const irreversible = IRREVERSIBLE_PATTERNS.some(pattern => pattern.test(normalized));

  if (!critical) {
    return { allow: true, critical: false, status: 'CONFIRMADO' };
  }

  // Para decisões irreversíveis, todas as três dimensões principais precisam
  // existir no contexto. A foto nunca substitui a medição conferida.
  if (irreversible) {
    const missing: string[] = [];
    if (!hasDimension(context.width)) missing.push('largura');
    if (!hasDimension(context.height)) missing.push('altura');
    if (!hasDimension(context.depth)) missing.push('profundidade');

    if (missing.length > 0) {
      return {
        allow: false,
        critical: true,
        status: 'PRECISA_CONFERIR',
        reason: 'Há uma decisão de produção/compra/corte, mas faltam medidas críticas confirmadas.',
        question: `Antes de continuar, preciso confirmar ${missing.join(', ')}. Qual é a medida conferida pelo marceneiro?`,
      };
    }
  }

  // Imagem é evidência visual, não medição. Se o pedido crítico depende dela,
  // o cérebro mantém a classificação conservadora.
  if (context.hasImage && irreversible) {
    return {
      allow: false,
      critical: true,
      status: 'PRECISA_CONFERIR',
      reason: 'A foto ajuda na análise, mas não comprova medidas para uma ação irreversível.',
      question: 'As medidas principais estão conferidas? Preciso delas antes de liberar corte, compra ou produção.',
    };
  }

  return {
    allow: true,
    critical: true,
    status: 'CONFIRMADO',
  };
}
