import { describe, expect, it } from 'vitest';
import { optimizeGuillotine, type CutPart } from './guillotine';

const p = (id:number,name:string,w:number,h:number,qtd:number,grain:'any'|'lengthwise'|'crosswise'='any'):CutPart => ({id,name,w,h,qtd,mat:'white',grain});

describe('optimizeGuillotine', () => {
  const options = { sheetWidth: 2750, sheetHeight: 1850, kerf: 3, trim: 0, allowRotation: true, sheetGrain: 'any' as const };

  it('places all parts and never exceeds sheet bounds', () => {
    const plan = optimizeGuillotine([
      p(1,'Lateral',600,1800,2),
      p(2,'Base',700,500,2),
      p(3,'Porta',450,1700,4),
      p(4,'Prateleira',500,350,4),
    ], options);

    expect(plan.invalid).toHaveLength(0);
    expect(plan.sheets.length).toBeGreaterThan(0);
    for (const sheet of plan.sheets) {
      for (const item of sheet.items) {
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.x + item.cutW).toBeLessThanOrEqual(sheet.width + 0.001);
        expect(item.y + item.cutH).toBeLessThanOrEqual(sheet.height + 0.001);
      }
    }
  });

  it('rejects a part larger than the stock sheet', () => {
    const plan = optimizeGuillotine([p(1,'Grande demais',3000,1900,1)], options);
    expect(plan.invalid).toHaveLength(1);
  });

  it('honors a no-rotation grain constraint', () => {
    const plan = optimizeGuillotine([
      p(1,'Veio',1700,500,1,'lengthwise')
    ], { ...options, allowRotation: true, sheetGrain: 'lengthwise' });
    expect(plan.invalid).toHaveLength(0);
    expect(plan.sheets[0].items[0].rotated).toBe(false);
  });

  it('is deterministic for the same input', () => {
    const parts = [p(1,'A',900,400,3), p(2,'B',700,500,4), p(3,'C',300,250,6)];
    const a = optimizeGuillotine(parts, options);
    const b = optimizeGuillotine(parts, options);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
