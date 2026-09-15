import { describe, expect, it } from 'vitest';
import { optimizeCutList } from './maxRects';

describe('optimizeCutList', () => {
  it('places multiple parts on the same sheet when they fit', () => {
    const result = optimizeCutList([
      { id: 'side-a', width: 500, height: 700, material: 'MDF 18', grainSensitive: true },
      { id: 'side-b', width: 500, height: 700, material: 'MDF 18', grainSensitive: true },
      { id: 'shelf', width: 400, height: 500, material: 'MDF 18' },
    ], [{ id: 'sheet-1', width: 2440, height: 1220, material: 'MDF 18' }], 3);

    expect(result.unplaced).toHaveLength(0);
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placements).toHaveLength(3);
    expect(result.utilizationPct).toBeGreaterThan(0);
  });

  it('does not rotate grain-sensitive parts', () => {
    const result = optimizeCutList([
      { id: 'grain', width: 900, height: 500, material: 'MDF 18', grainSensitive: true },
    ], [{ id: 'sheet-1', width: 500, height: 900, material: 'MDF 18' }], 0);

    expect(result.unplaced).toHaveLength(1);
  });

  it('can rotate ordinary parts', () => {
    const result = optimizeCutList([
      { id: 'part', width: 900, height: 500, material: 'MDF 18' },
    ], [{ id: 'sheet-1', width: 500, height: 900, material: 'MDF 18' }], 0);

    expect(result.unplaced).toHaveLength(0);
    expect(result.sheets[0].placements[0].rotated).toBe(true);
  });

  it('reports missing material templates instead of inventing a sheet', () => {
    const result = optimizeCutList([
      { id: 'part', width: 300, height: 300, material: 'MDF 18' },
    ], [{ id: 'sheet-1', width: 2440, height: 1220, material: 'MDP 15' }], 3);

    expect(result.unplaced[0]?.material).toBe('MDF 18');
    expect(result.sheets).toHaveLength(0);
  });

  it('counts only placed quantities in the utilization totals', () => {
    const result = optimizeCutList([
      { id: 'panel', width: 400, height: 400, quantity: 2, material: 'MDF 18', grainSensitive: true },
    ], [{ id: 'sheet-1', width: 500, height: 500, material: 'MDF 18' }], 0);

    expect(result.sheets[0].placements).toHaveLength(1);
    expect(result.unplaced).toHaveLength(1);
    expect(result.totalPartArea).toBe(160_000);
    expect(result.totalSheetArea).toBe(250_000);
    expect(result.utilizationPct).toBeCloseTo(64);
  });
});
