import { describe, expect, it } from 'vitest';
import { engineerBasicCarcass } from './engineering';

describe('engineerBasicCarcass', () => {
  it('gera somente a caixa explicitamente definida', () => {
    const result = engineerBasicCarcass({
      id: 'armario-01',
      name: 'Armário',
      width: 800,
      height: 2400,
      depth: 600,
      carcassThickness: 18,
      shelfCount: 3,
      material: 'MDP 18mm',
    });

    expect(result.blockers).toEqual([]);
    expect(result.parts).toHaveLength(7);
    expect(result.parts.filter((part) => part.role === 'shelf')).toHaveLength(3);
    expect(result.assumptions).toContain('Fundo não foi gerado porque a espessura do fundo não foi informada.');
  });

  it('não inventa engenharia para portas e gavetas', () => {
    const result = engineerBasicCarcass({
      id: 'armario-02',
      name: 'Armário',
      width: 900,
      height: 2200,
      depth: 550,
      carcassThickness: 18,
      backThickness: 6,
      material: 'MDF 18mm',
      backMaterial: 'MDF 6mm',
      doorCount: 2,
      drawerCount: 3,
    });

    expect(result.blockers).toEqual(expect.arrayContaining([
      'Portas exigem regra explícita de folga, sobreposição e ferragens; não foram inventadas.',
      'Gavetas exigem regra explícita de caixa, corrediça e folgas; não foram inventadas.',
    ]));
    expect(result.parts.some((part) => part.role === 'back')).toBe(true);
  });

  it('bloqueia dimensões incompatíveis', () => {
    const result = engineerBasicCarcass({
      id: 'invalido',
      name: 'Móvel',
      width: 30,
      height: 30,
      depth: 500,
      carcassThickness: 18,
      material: 'MDF 18mm',
    });

    expect(result.parts).toEqual([]);
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
