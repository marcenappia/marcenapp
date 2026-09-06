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
    expect(deep.grossTotal).toBe(deep.subtotal + deep.profit);
    expect(deep.total).toBe(deep.grossTotal);
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

  it('applies reserved remnant savings to sheet cost and downstream totals', () => {
    const baseline = calculateBudget(project, DEFAULT_PRICES);
    const saved = calculateBudget(project, DEFAULT_PRICES, {
      internal: 1,
      external: 1,
      back: 1,
      total: 3,
    });

    expect(saved.sheetSavings).toBeGreaterThan(0);
    expect(saved.materialCost).toBeLessThan(baseline.materialCost);
    expect(saved.total).toBeLessThan(baseline.total);
    expect(saved.laborCost).toBeLessThanOrEqual(baseline.laborCost);
    expect(saved.installationCost).toBeLessThanOrEqual(baseline.installationCost);
    expect(saved.profit).toBeLessThanOrEqual(baseline.profit);
  });

  it('caps savings at the number of calculated sheets', () => {
    const baseline = calculateBudget(project, DEFAULT_PRICES);
    const excessive = calculateBudget(project, DEFAULT_PRICES, {
      internal: 999,
      external: 999,
      back: 999,
      total: 2997,
    });

    expect(excessive.sheetSavings).toBeLessThanOrEqual(baseline.materialCost);
    expect(excessive.materialCost).toBeGreaterThanOrEqual(0);
  });

  it('applies discount only after the complete sale price is calculated', () => {
    const baseline = calculateBudget(project);
    const discounted = calculateBudget({ ...project, discountPercent: 10 });

    expect(discounted.grossTotal).toBe(baseline.grossTotal);
    expect(discounted.discount).toBeCloseTo(baseline.grossTotal * 0.1);
    expect(discounted.total).toBeCloseTo(baseline.grossTotal * 0.9);
    expect(discounted.total).toBeLessThan(baseline.total);
  });

  it('clamps invalid discount percentages to the safe range', () => {
    const baseline = calculateBudget(project);
    const full = calculateBudget({ ...project, discountPercent: 150 });
    const negative = calculateBudget({ ...project, discountPercent: -20 });

    expect(full.discount).toBe(baseline.grossTotal);
    expect(full.total).toBe(0);
    expect(negative.discount).toBe(0);
    expect(negative.total).toBe(baseline.grossTotal);
  });
});
