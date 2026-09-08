/** Sincroniza fatos operacionais já explícitos no projeto sem inferir dados técnicos. */
import { IaraMemory, rememberEvent, rememberFact } from './iaraMemory';

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? value as Record<string, unknown> : {});
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export function syncIaraOperationalMemory(memory: IaraMemory, project: Record<string, unknown> | null | undefined, diaryEntries: Array<{ texto?: string; importante?: boolean; origem?: string }> = []): IaraMemory {
  if (!project) return memory;
  let next = memory;
  const jornada = asRecord(project.jornada);
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

  if (asString(jornada.statusAprovacao) === 'aprovado' || jornada.orcamentoAprovado === true) {
    const value = Number(jornada.valorAprovado || 0);
    if (value > 0) {
      next = rememberFact(next, { key: 'orcamento-aprovado', label: 'Valor do orçamento aprovado', value, status: 'CONFIRMADO', source: 'orcamento', now: asString(jornada.orcamentoAprovadoEm) || now });
    }
    next = rememberEvent(next, 'orcamento-aprovado', 'Orçamento aprovado pelo cliente.', asString(jornada.orcamentoAprovadoEm) || now);
  }

  const production = asRecord(jornada.production);
  if (asString(production.status) === 'liberada') {
    next = rememberFact(next, { key: 'producao-status', label: 'Status da produção', value: 'liberada', status: 'CONFIRMADO', source: 'producao', now: asString(production.generatedAt) || now });
    if (Array.isArray(production.parts)) {
      next = rememberFact(next, { key: 'producao-itens', label: 'Itens na lista de produção', value: production.parts.length, status: 'CONFIRMADO', source: 'producao', now: asString(production.generatedAt) || now });
    }
    next = rememberEvent(next, 'producao-liberada', 'Produção liberada a partir do orçamento aprovado.', asString(production.generatedAt) || now);
  }

  const importantDiary = diaryEntries.find(entry => entry.importante && entry.texto?.trim());
  if (importantDiary) {
    next = rememberEvent(next, 'diario-importante', importantDiary.texto!.trim().slice(0, 240));
  }

  return next;
}
