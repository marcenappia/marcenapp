import { describe, expect, it, beforeEach } from 'vitest';
import { carregarDiario, salvarDiario, sincronizarLinhaDoTempoProjeto } from './diarioStorage';

describe('diário — linha do tempo do projeto', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registra aprovação e produção a partir do estado persistido do projeto', () => {
    const project = {
      id: 'projeto-1',
      jornada: {
        statusAprovacao: 'aprovado',
        valorAprovado: 12500,
        orcamentoAprovadoEm: '2026-09-06T10:00:00.000Z',
        production: {
          status: 'liberada',
          generatedAt: '2026-09-06T10:05:00.000Z',
          parts: [{ id: 1 }, { id: 2 }],
        },
      },
    };

    const entries = sincronizarLinhaDoTempoProjeto(project.id, project);

    expect(entries.filter(item => item.origem === 'sistema')).toHaveLength(3);
    expect(entries.some(item => item.evento === 'orcamento-aprovado')).toBe(true);
    expect(entries.some(item => item.evento === 'producao-liberada')).toBe(true);
    expect(entries.some(item => item.evento === 'lista-pecas-gerada')).toBe(true);
  });

  it('não duplica eventos quando a sincronização roda novamente', () => {
    const project = {
      id: 'projeto-2',
      jornada: { statusAprovacao: 'aprovado', valorAprovado: 5000 },
    };

    sincronizarLinhaDoTempoProjeto(project.id, project);
    const second = sincronizarLinhaDoTempoProjeto(project.id, project);

    expect(second.filter(item => item.evento === 'orcamento-aprovado')).toHaveLength(1);
    expect(carregarDiario(project.id)).toHaveLength(1);
  });

  it('preserva entradas manuais ao sincronizar eventos', () => {
    salvarDiario('projeto-3', [{
      id: 'manual-1', projectId: 'projeto-3', createdAt: '2026-09-06T09:00:00.000Z',
      tipo: 'nota', texto: 'Conferir tomada atrás do móvel', origem: 'manual', importante: false,
    }]);

    const entries = sincronizarLinhaDoTempoProjeto('projeto-3', {
      id: 'projeto-3', jornada: { statusAprovacao: 'aprovado', valorAprovado: 7000 },
    });

    expect(entries.some(item => item.id === 'manual-1')).toBe(true);
    expect(entries.some(item => item.evento === 'orcamento-aprovado')).toBe(true);
  });
});
