import { describe, expect, it } from 'vitest';
import { buildCutList, calculateBudget, DEFAULT_PRICES } from './pricing';

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

  it('uses depth, waste, edge tape, hardware, labor, installation and profit', () => {
    const shallow = calculateBudget({ ...project, depth: 0.4 });
    const deep = calculateBudget({ ...project, depth: 0.8 });
    expect(deep.total).toBeGreaterThanOrEqual(shallow.total);
    expect(deep.edgeCost).toBeGreaterThan(0);
    expect(deep.hardwareCost).toBeGreaterThan(0);
    expect(deep.installationCost).toBeGreaterThan(0);
    expect(deep.profit).toBeGreaterThan(0);
    expect(deep.total).toBe(deep.subtotal + deep.profit);
  });

  it('respects editable prices and the selected back material', () => {
    const catalog = structuredClone(DEFAULT_PRICES);
    catalog.mdf15_white.sheet = 500;
    catalog.mdf6_white.sheet = 200;
    const result = calculateBudget(project, catalog);
    expect(result.internalSheets).toBeGreaterThan(0);
    expect(result.backSheets).toBeGreaterThan(0);
    expect(result.materialCost).toBeGreaterThan(0);

    const baseline = calculateBudget(project, DEFAULT_PRICES);
    expect(result.materialCost).toBeGreaterThan(baseline.materialCost);
  });
});
