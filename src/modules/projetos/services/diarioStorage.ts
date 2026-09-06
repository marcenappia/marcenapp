export type DiarioTipo = 'nota' | 'foto' | 'audio';
export type DiarioOrigem = 'manual' | 'sistema';

export interface DiarioEntrada {
  id: string;
  projectId: string;
  createdAt: string;
  tipo: DiarioTipo;
  texto: string;
  fotoDataUrl?: string;
  audioDataUrl?: string;
  importante?: boolean;
  origem?: DiarioOrigem;
  evento?: string;
  modulo?: 'estudio' | 'iara' | 'orcamento' | 'producao' | 'corte' | 'sistema';
}

const key = (projectId: string) => `marcenapp_diario_v1:${projectId}`;

export function carregarDiario(projectId: string): DiarioEntrada[] {
  try {
    const raw = localStorage.getItem(key(projectId));
    return raw ? (JSON.parse(raw) as DiarioEntrada[]) : [];
  } catch { return []; }
}

export function salvarDiario(projectId: string, entradas: DiarioEntrada[]) {
  try { localStorage.setItem(key(projectId), JSON.stringify(entradas)); } catch { /* quota local cheia */ }
}

export function adicionarEntrada(projectId: string, entrada: Omit<DiarioEntrada, 'id' | 'projectId' | 'createdAt'>) {
  const atual = carregarDiario(projectId);
  const nova: DiarioEntrada = { ...entrada, origem: entrada.origem || 'manual', id: crypto.randomUUID(), projectId, createdAt: new Date().toISOString() };
  const proximo = [nova, ...atual].slice(0, 100);
  salvarDiario(projectId, proximo);
  return proximo;
}

export function registrarEventoSistema(
  projectId: string,
  evento: string,
  texto: string,
  modulo: DiarioEntrada['modulo'] = 'sistema',
  createdAt?: string,
) {
  const atual = carregarDiario(projectId);
  if (atual.some(item => item.origem === 'sistema' && item.evento === evento)) return atual;
  const nova: DiarioEntrada = {
    id: `evento-${evento}`,
    projectId,
    createdAt: createdAt || new Date().toISOString(),
    tipo: 'nota',
    texto,
    importante: true,
    origem: 'sistema',
    evento,
    modulo,
  };
  const proximo = [nova, ...atual].slice(0, 100);
  salvarDiario(projectId, proximo);
  return proximo;
}

export function sincronizarLinhaDoTempoProjeto(projectId: string, project: any) {
  let entradas = carregarDiario(projectId);
  const jornada = project?.jornada || {};

  if (jornada.statusAprovacao === 'aprovado' || jornada.orcamentoAprovado === true) {
    const valor = Number(jornada.valorAprovado || 0);
    entradas = registrarEventoSistema(
      projectId,
      'orcamento-aprovado',
      valor > 0 ? `Orçamento aprovado pelo cliente — ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` : 'Orçamento aprovado pelo cliente.',
      'orcamento',
      jornada.orcamentoAprovadoEm,
    );
  }

  if (jornada.production?.status === 'liberada') {
    entradas = registrarEventoSistema(
      projectId,
      'producao-liberada',
      'Produção liberada a partir do orçamento aprovado. Lista de peças preparada para produção e corte.',
      'producao',
      jornada.production.generatedAt || jornada.production.updatedAt,
    );
  }

  if (Array.isArray(jornada.production?.parts) && jornada.production.parts.length > 0) {
    entradas = registrarEventoSistema(
      projectId,
      'lista-pecas-gerada',
      `Lista de produção atualizada com ${jornada.production.parts.length} item(ns) derivados do orçamento aprovado.`,
      'producao',
      jornada.production.generatedAt || jornada.production.updatedAt,
    );
  }

  return entradas;
}
