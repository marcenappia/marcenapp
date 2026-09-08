import { describe, expect, it } from 'vitest';
import { createIaraMemory, rememberEvent, rememberFact, rememberMeasurements } from './iaraMemory';
import { assessIaraJourneyReadiness } from './iaraJourneyReadiness';

const completeMemory = () => {
  let memory = createIaraMemory();
  memory = rememberMeasurements(memory, { width: 2.4, height: 2.6, depth: 0.6 }, 'CONFIRMADO', 'usuario');
  memory = rememberFact(memory, { key: 'material-interno', label: 'Material interno', value: 'MDF 15', status: 'CONFIRMADO', source: 'orcamento' });
  memory = rememberFact(memory, { key: 'material-externo', label: 'Material externo', value: 'MDF 18', status: 'CONFIRMADO', source: 'orcamento' });
  memory = rememberFact(memory, { key: 'material-fundo', label: 'Material de fundo', value: 'MDF 6', status: 'CONFIRMADO', source: 'orcamento' });
  return memory;
};

describe('assessIaraJourneyReadiness', () => {
  it('blocks budget until measurements and materials are confirmed', () => {
    const result = assessIaraJourneyReadiness('orcamento', createIaraMemory());
    expect(result.ready).toBe(false);
    expect(result.checks.measurementsConfirmed).toBe(false);
    expect(result.checks.materialsConfirmed).toBe(false);
    expect(result.blockers.length).toBeGreaterThanOrEqual(2);
  });

  it('allows budget when all technical inputs are confirmed', () => {
    const result = assessIaraJourneyReadiness('orcamento', completeMemory());
    expect(result.ready).toBe(true);
  });

  it('blocks production until the budget is approved', () => {
    const result = assessIaraJourneyReadiness('producao', completeMemory());
    expect(result.ready).toBe(false);
    expect(result.checks.budgetApproved).toBe(false);
  });

  it('allows production after explicit budget approval', () => {
    let memory = completeMemory();
    memory = rememberEvent(memory, 'orcamento-aprovado', 'Orçamento aprovado pelo cliente.');
    const result = assessIaraJourneyReadiness('producao', memory);
    expect(result.ready).toBe(true);
  });

  it('blocks cut until production is released and has parts', () => {
    let memory = completeMemory();
    memory = rememberEvent(memory, 'orcamento-aprovado', 'Orçamento aprovado pelo cliente.');
    let result = assessIaraJourneyReadiness('corte', memory);
    expect(result.ready).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/produção precisa estar liberada/i);

    memory = rememberFact(memory, { key: 'producao-status', label: 'Status da produção', value: 'liberada', status: 'CONFIRMADO', source: 'producao' });
    result = assessIaraJourneyReadiness('corte', memory);
    expect(result.ready).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/lista de produção/i);

    memory = rememberFact(memory, { key: 'producao-itens', label: 'Itens na lista de produção', value: 8, status: 'CONFIRMADO', source: 'producao' });
    result = assessIaraJourneyReadiness('corte', memory);
    expect(result.ready).toBe(true);
  });

  it('blocks irreversible stages when there is an unresolved conflict', () => {
    let memory = completeMemory();
    memory = rememberMeasurements(memory, { width: 2.8 }, 'CONFIRMADO', 'usuario');
    const result = assessIaraJourneyReadiness('orcamento', memory);
    expect(result.ready).toBe(false);
    expect(result.checks.conflictsResolved).toBe(false);
  });
});
