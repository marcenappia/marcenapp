export type DiarioTipo = 'nota' | 'foto' | 'audio';

export interface DiarioEntrada {
  id: string;
  projectId: string;
  createdAt: string;
  tipo: DiarioTipo;
  texto: string;
  fotoDataUrl?: string;
  audioDataUrl?: string;
  importante?: boolean;
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
  const nova: DiarioEntrada = { ...entrada, id: crypto.randomUUID(), projectId, createdAt: new Date().toISOString() };
  const proximo = [nova, ...atual].slice(0, 100);
  salvarDiario(projectId, proximo);
  return proximo;
}
