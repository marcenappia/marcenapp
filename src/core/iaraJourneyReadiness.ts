/**
 * Portas de prontidão da jornada do marceneiro.
 * A IARA só libera uma etapa operacional quando os fatos necessários
 * estão confirmados na memória do projeto.
 */
import type { IaraMemory } from './iaraMemory';
import { getConfirmedMeasurements } from './iaraMemory';

export type IaraJourneyTarget = 'orcamento' | 'producao' | 'corte';

export interface IaraJourneyReadiness {
  target: IaraJourneyTarget;
  ready: boolean;
  blockers: string[];
  checks: {
    measurementsConfirmed: boolean;
    materialsConfirmed: boolean;
    budgetApproved: boolean;
    productionReleased: boolean;
    productionParts: number;
    conflictsResolved: boolean;
  };
}

const hasConfirmedFact = (memory: IaraMemory, key: string) =>
  memory.facts.some(fact => fact.key === key && fact.status === 'CONFIRMADO');

const hasNoOpenConflicts = (memory: IaraMemory) =>
  memory.conflicts.every(conflict => conflict.resolved);

const hasBudgetApproval = (memory: IaraMemory) =>
  hasConfirmedFact(memory, 'orcamento-aprovado') || memory.lastEvent?.type === 'orcamento-aprovado';

const getProductionParts = (memory: IaraMemory) => {
  const fact = memory.facts.find(item => item.key === 'producao-itens' && item.status === 'CONFIRMADO');
  return typeof fact?.value === 'number' ? fact.value : 0;
};

const hasProductionReleased = (memory: IaraMemory) =>
  memory.facts.some(item => item.key === 'producao-status' && item.status === 'CONFIRMADO' && item.value === 'liberada') ||
  memory.lastEvent?.type === 'producao-liberada';

export function assessIaraJourneyReadiness(
  target: IaraJourneyTarget,
  memory: IaraMemory,
): IaraJourneyReadiness {
  const measurements = getConfirmedMeasurements(memory);
  const measurementsConfirmed = Boolean(measurements.width && measurements.height && measurements.depth);
  const materialsConfirmed = ['material-interno', 'material-externo', 'material-fundo']
    .every(key => hasConfirmedFact(memory, key));
  const budgetApproved = hasBudgetApproval(memory);
  const productionReleased = hasProductionReleased(memory);
  const productionParts = getProductionParts(memory);
  const conflictsResolved = hasNoOpenConflicts(memory);
  const blockers: string[] = [];

  if (!conflictsResolved) blockers.push('Há conflitos na memória da IARA que precisam ser resolvidos.');

  if (target === 'orcamento') {
    if (!measurementsConfirmed) blockers.push('Confirme largura, altura e profundidade antes de fechar o orçamento.');
    if (!materialsConfirmed) blockers.push('Confirme os materiais interno, externo e de fundo antes de fechar o orçamento.');
  }

  if (target === 'producao') {
    if (!budgetApproved) blockers.push('O orçamento precisa estar aprovado pelo cliente antes de liberar a produção.');
  }

  if (target === 'corte') {
    if (!productionReleased) blockers.push('A produção precisa estar liberada antes de gerar o corte.');
    if (productionParts <= 0) blockers.push('A lista de produção precisa ter pelo menos uma peça antes de gerar o corte.');
  }

  return {
    target,
    ready: blockers.length === 0,
    blockers,
    checks: {
      measurementsConfirmed,
      materialsConfirmed,
      budgetApproved,
      productionReleased,
      productionParts,
      conflictsResolved,
    },
  };
}
