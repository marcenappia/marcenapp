/**
 * Jornada do marceneiro — etapas da obra em linguagem simples.
 * O progresso é salvo por projeto (localStorage) para retomar de onde parou.
 */
export const ETAPAS_OBRA = [
  { id: 1, label: 'Nome da obra' },
  { id: 2, label: 'Foto do ambiente' },
  { id: 3, label: 'O que o cliente quer' },
  { id: 4, label: 'IARA confere' },
  { id: 5, label: 'Apresentação' },
  { id: 6, label: 'Aprovação do cliente' },
  { id: 7, label: 'Orçamento' },
  { id: 8, label: 'Produção' },
] as const;

export type EtapaId = (typeof ETAPAS_OBRA)[number]['id'];
export type StatusAprovacao = 'pendente' | 'aprovado' | 'recusado';

export interface PerguntaIara {
  id: string;
  pergunta: string;
  /** dica curta em linguagem simples (ex.: "em metros") */
  dica?: string;
}

export interface AnaliseIara {
  resumo: string;
  ambiente?: string;
  medidas: { width?: number | null; height?: number | null; depth?: number | null };
  perguntas: PerguntaIara[];
}

export interface ProgressoObra {
  etapa: EtapaId;
  nome?: string;
  clienteNome?: string;
  pedido?: string;
  analise?: AnaliseIara | null;
  respostas?: Record<string, string>;
  aprovado?: boolean;
  statusAprovacao?: StatusAprovacao;
  aprovadoEm?: string;
  valorAprovado?: number | null;
  atualizadoEm: string;
}

const KEY = (projectId: string) => `marcenapp_obra_${projectId}`;

export const carregarProgresso = (projectId: string): ProgressoObra | null => {
  try {
    const raw = localStorage.getItem(KEY(projectId));
    return raw ? (JSON.parse(raw) as ProgressoObra) : null;
  } catch {
    return null;
  }
};

export const salvarProgresso = (projectId: string, patch: Partial<ProgressoObra>) => {
  const atual = carregarProgresso(projectId) ?? { etapa: 1 as EtapaId, atualizadoEm: '' };
  const novo: ProgressoObra = { ...atual, ...patch, atualizadoEm: new Date().toISOString() };
  try {
    localStorage.setItem(KEY(projectId), JSON.stringify(novo));
  } catch {
    /* quota cheia — progresso segue apenas em memória */
  }
  return novo;
};

export const registrarAprovacao = (projectId: string, valor: number) =>
  salvarProgresso(projectId, {
    aprovado: true,
    statusAprovacao: 'aprovado',
    aprovadoEm: new Date().toISOString(),
    valorAprovado: Math.max(0, Number(valor) || 0),
    etapa: 7,
  });

export const registrarRecusa = (projectId: string) =>
  salvarProgresso(projectId, {
    aprovado: false,
    statusAprovacao: 'recusado',
  });

export const percentualObra = (etapa: EtapaId) =>
  Math.round(((etapa - 1) / (ETAPAS_OBRA.length - 1)) * 100);
