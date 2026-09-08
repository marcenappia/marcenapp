/** Sincroniza fatos operacionais já explícitos no projeto sem inferir dados técnicos. */
import { IaraMemory, rememberEvent, rememberFact } from './iaraMemory';

export function syncIaraOperationalMemory(memory: IaraMemory, project: any, diaryEntries: Array<{ texto?: string; importante?: boolean; origem?: string }> = []): IaraMemory {
  if (!project) return memory;
  let next = memory;
  const jornada = project.jornada ?? {};
  const now = new Date().toISOString();

  const materials: Array<[string, string, unknown]> = [
    ['material-interno', 'Material interno', project.internalMaterial],
    ['material-externo', 'Material externo', project.externalMaterial],
    ['material-fundo', 'Material de fundo', project.backMaterial],
  ];
  for (const [key, label, value] of materials) {
    if (typeof value === 'string' && value.trim()) {
      next = rememberFact(next, { key, label, value, status: 'CONFIRMADO', source: 'orcamento', now });
    }
  }

  if (jornada.statusAprovacao === 'aprovado' || jornada.orcamentoAprovado === true) {
    const value = Number(jornada.valorAprovado || 0);
    if (value > 0) {
      next = rememberFact(next, { key: 'orcamento-aprovado', label: 'Valor do orçamento aprovado', value, status: 'CONFIRMADO', source: 'orcamento', now: jornada.orcamentoAprovadoEm || now });
    }
    next = rememberEvent(next, 'orcamento-aprovado', 'Orçamento aprovado pelo cliente.', jornada.orcamentoAprovadoEm || now);
  }

  const production = jornada.production;
  if (production?.status === 'liberada') {
    next = rememberFact(next, { key: 'producao-status', label: 'Status da produção', value: 'liberada', status: 'CONFIRMADO', source: 'producao', now: production.generatedAt || now });
    if (Array.isArray(production.parts)) {
      next = rememberFact(next, { key: 'producao-itens', label: 'Itens na lista de produção', value: production.parts.length, status: 'CONFIRMADO', source: 'producao', now: production.generatedAt || now });
    }
    next = rememberEvent(next, 'producao-liberada', 'Produção liberada a partir do orçamento aprovado.', production.generatedAt || now);
  }

  const importantDiary = diaryEntries.find(entry => entry.importante && entry.texto?.trim());
  if (importantDiary) {
    next = rememberEvent(next, 'diario-importante', importantDiary.texto!.trim().slice(0, 240));
  }

  return next;
}
