import { describe, expect, it } from 'vitest';
import { planCutting } from './cutPlanning';

const part = (id: number, name: string, w: number, h: number, qtd: number, grain: 'vertical' | 'horizontal' | 'none' = 'none') => ({
  id, name, w, h, qtd, mat: 'white' as const, thickness: 15, grain,
});

describe('cut planning', () => {
  it('separates materials and thicknesses into different sheets', () => {
    const sheets = planCutting([
      part(1, 'Lateral', 600, 2400, 2, 'vertical'),
      { ...part(2, 'Fundo', 600, 2400, 1, 'vertical'), thickness: 6 },
    ]);
    expect(sheets).toHaveLength(2);
    expect(new Set(sheets.map(s => s.thickness))).toEqual(new Set([15, 6]));
  });

  it('rotates a part when allowed and grain is not restricted', () => {
    const sheets = planCutting([part(1, 'Prateleira', 1700, 900, 1, 'none')], {
      sheetWidth: 1800,
      sheetHeight: 1000,
      kerf: 3,
      allowRotation: true,
    });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].items[0].rotated).toBe(false);
  });

  it('does not rotate a part with a defined grain direction', () => {
    const sheets = planCutting([part(1, 'Porta', 1700, 900, 1, 'vertical')], {
      sheetWidth: 1000,
      sheetHeight: 1800,
      kerf: 3,
      allowRotation: true,
    });
    expect(sheets).toHaveLength(0);
  });
});
