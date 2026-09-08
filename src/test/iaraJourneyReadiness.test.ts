import { describe, expect, it } from 'vitest';
import { assessIaraJourneyReadiness } from '@/core/iaraJourneyReadiness';
import { createIaraMemory, rememberFact, rememberMeasurements } from '@/core/iaraMemory';

const memoriaOrcamentoPronta = () => {
  let memory = createIaraMemory();
  memory = rememberMeasurements(memory, { width: 2.4, height: 2.6, depth: 0.6 }, 'CONFIRMADO', 'usuario');
  memory = rememberFact(memory, { key: 'material-interno', label: 'Material interno', value: 'MDF 15', status: 'CONFIRMADO', source: 'usuario' });
  memory = rememberFact(memory, { key: 'material-externo', label: 'Material externo', value: 'MDF 18', status: 'CONFIRMADO', source: 'usuario' });
  memory = rememberFact(memory, { key: 'material-fundo', label: 'Material de fundo', value: 'MDF 6', status: 'CONFIRMADO', source: 'usuario' });
  return memory;
};

describe('IARA journey readiness', () => {
  it('bloqueia orçamento sem medidas e materiais confirmados', () => {
    const result = assessIaraJourneyReadiness('orcamento', createIaraMemory());
    expect(result.ready).toBe(false);
    expect(result.blockers.length).toBeGreaterThanOrEqual(2);
  });

  it('libera orçamento quando medidas e materiais estão confirmados', () => {
    const result = assessIaraJourneyReadiness('orcamento', memoriaOrcamentoPronta());
    expect(result.ready).toBe(true);
  });

  it('bloqueia corte sem produção liberada e peças', () => {
    const result = assessIaraJourneyReadiness('corte', memoriaOrcamentoPronta());
    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.includes('produção precisa estar liberada'))).toBe(true);
    expect(result.blockers.some((item) => item.includes('lista de produção'))).toBe(true);
  });
});
