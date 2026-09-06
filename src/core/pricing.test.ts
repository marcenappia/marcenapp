import { describe, expect, it } from 'vitest';
import { buildCutList, calculateBudget } from './pricing';

const project = {
  width: 2.4,
  height: 2.6,
  depth: 0.6,
  modules: 3,
  drawers: 4,
  doors: 6,
  internalMaterial: 'mdf15_white',
  externalMaterial: 'mdf18_white',
  backMaterial: 'mdf6_white',
  handleType: 'external',
  laborRate: 100,
  profitMargin: 35,
};

describe('pricing engine', () => {
  it('builds a production-oriented cut list from project dimensions', () => {
    const parts = buildCutList(project);
    expect(parts.find(p => p.name === 'Lateral')?.qtd).toBe(6);
    expect(parts.find(p => p.name === 'Fundo')?.thickness).toBe(6);
    expect(parts.find(p => p.name === 'Porta')?.qtd).toBe(6);
    expect(parts.find(p => p.name === 'Frente de gaveta')?.qtd).toBe(4);
  });

  it('includes depth, waste, edge tape, hardware, labor, installation and profit', () => {
    const shallow = calculateBudget({ ...project, depth: 0.4 });
    const deep = calculateBudget({ ...project, depth: 0.8 });
    expect(deep.total).toBeGreaterThanOrEqual(shallow.total);
    expect(deep.edgeCost).toBeGreaterThan(0);
    expect(deep.hardwareCost).toBeGreaterThan(0);
    expect(deep.installationCost).toBeGreaterThan(0);
    expect(deep.profit).toBeGreaterThan(0);
    expect(deep.total).toBe(deep.subtotal + deep.profit);
  });
});
