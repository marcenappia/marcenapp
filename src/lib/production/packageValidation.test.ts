import { describe, expect, it } from 'vitest';
import { validateProductionPackage } from './packageValidation';

describe('validateProductionPackage', () => {
  const parts = [
    { id: 'armario:lateral', width: 700, height: 2400, quantity: 2, material: 'MDF' },
    { id: 'armario:porta', width: 400, height: 700, quantity: 2, material: 'MDF' },
  ];

  const cutPlan = [{
    code: 'MDF#1', width: 2750, height: 1830, material: 'MDF',
    pieces: [
      { code: 'armario:lateral#1', width: 700, height: 2400 },
      { code: 'armario:lateral#2', width: 700, height: 2400 },
      { code: 'armario:porta#1', width: 400, height: 700 },
      { code: 'armario:porta#2', width: 400, height: 700 },
    ],
  }];

  it('accepts matching engineering, cut plan and BOM', () => {
    const result = validateProductionPackage(parts, cutPlan, [
      { code: 'armario:lateral', category: 'panel', quantity: 2 },
      { code: 'armario:porta', category: 'panel', quantity: 2 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('blocks when a piece is missing from the cut plan', () => {
    const result = validateProductionPackage(parts, [{ ...cutPlan[0], pieces: cutPlan[0].pieces.slice(0, 3) }]);
    expect(result.valid).toBe(false);
    expect(result.blockers.some((item) => item.includes('armario:porta'))).toBe(true);
  });

  it('blocks when BOM panel quantity differs from engineering', () => {
    const result = validateProductionPackage(parts, cutPlan, [
      { code: 'armario:lateral', category: 'panel', quantity: 1 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.blockers.some((item) => item.includes('BOM inconsistente'))).toBe(true);
  });
});
