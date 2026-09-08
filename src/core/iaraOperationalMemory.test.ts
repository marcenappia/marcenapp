import { describe, expect, it } from 'vitest';
import { createIaraMemory, getMeasurementEvidence } from './iaraMemory';
import { syncIaraOperationalMemory } from './iaraOperationalMemory';

describe('iaraOperationalMemory', () => {
  it('aprende materiais confirmados do orçamento sem inventar medidas', () => {
    const memory = syncIaraOperationalMemory(createIaraMemory(), {
      internalMaterial: 'mdf15_white',
      externalMaterial: 'mdf18_wood',
      backMaterial: 'mdf6_white',
      jornada: {},
    });

    expect(memory.facts.find(f => f.key === 'material-interno')?.status).toBe('CONFIRMADO');
    expect(memory.facts.find(f => f.key === 'material-externo')?.value).toBe('mdf18_wood');
    expect(getMeasurementEvidence(memory)).toBe('unknown');
  });

  it('registra aprovação e produção na memória', () => {
    const memory = syncIaraOperationalMemory(createIaraMemory(), {
      jornada: {
        statusAprovacao: 'aprovado',
        valorAprovado: 12500,
        orcamentoAprovadoEm: '2026-09-06T10:00:00.000Z',
        production: {
          status: 'liberada',
          generatedAt: '2026-09-06T11:00:00.000Z',
          parts: [{ id: 1 }, { id: 2 }, { id: 3 }],
        },
      },
    });

    expect(memory.facts.find(f => f.key === 'orcamento-aprovado')?.value).toBe(12500);
    expect(memory.facts.find(f => f.key === 'producao-status')?.value).toBe('liberada');
    expect(memory.facts.find(f => f.key === 'producao-itens')?.value).toBe(3);
    expect(memory.lastEvent?.type).toBe('producao-liberada');
  });

  it('leva uma nota importante do Diário apenas como evento, sem convertê-la em medida', () => {
    const memory = syncIaraOperationalMemory(createIaraMemory(), {}, [
      { importante: true, texto: 'Cliente pediu tomada acessível atrás do móvel.', origem: 'manual' },
    ]);

    expect(memory.lastEvent?.type).toBe('diario-importante');
    expect(memory.facts.some(f => f.key === 'width' || f.key === 'height' || f.key === 'depth')).toBe(false);
  });
});
