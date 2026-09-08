import { describe, expect, it, beforeEach } from 'vitest';
import { adicionarEntrada, carregarDiario } from './diarioStorage';

describe('diarioStorage', () => {
  beforeEach(() => localStorage.clear());

  it('persiste notas por projeto e mantém a mais recente primeiro', () => {
    adicionarEntrada('p1', { tipo: 'nota', texto: 'Medir janela' });
    adicionarEntrada('p1', { tipo: 'nota', texto: 'Tomada a 35 cm' });
    adicionarEntrada('p2', { tipo: 'nota', texto: 'Outro projeto' });

    expect(carregarDiario('p1').map(item => item.texto)).toEqual(['Tomada a 35 cm', 'Medir janela']);
    expect(carregarDiario('p2')).toHaveLength(1);
  });

  it('limita o histórico local a 100 entradas', () => {
    for (let i = 0; i < 105; i += 1) adicionarEntrada('p1', { tipo: 'nota', texto: String(i) });
    expect(carregarDiario('p1')).toHaveLength(100);
    expect(carregarDiario('p1')[0].texto).toBe('104');
  });
});
