import { describe, expect, it } from 'vitest';
import { buildFurniturePackage } from './package';

describe('buildFurniturePackage', () => {
  it('builds carcass, explicit door, drawer and hardware BOM without guessing rules', () => {
    const result = buildFurniturePackage({
      id: 'armario-01',
      name: 'Armário',
      width: 1800,
      height: 2200,
      depth: 600,
      carcassThickness: 18,
      material: 'MDP 18',
      sheetTemplates: [{ id: 'mdp-18', width: 2750, height: 1830, material: 'MDP 18' }],
      modules: [{
        id: 'modulo-01', name: 'Módulo central', width: 864, height: 2164, depth: 564, material: 'MDP 18',
        door: {
          count: 2, frontWidth: 430, frontHeight: 2100, material: 'MDF 18',
          hardware: [{ code: 'dobradica-110', name: 'Dobradiça 110°', quantity: 4 }],
        },
        drawer: {
          count: 2, frontWidth: 400, frontHeight: 180, boxWidth: 360, boxHeight: 150, boxDepth: 500,
          material: 'MDP 15',
          hardware: [{ code: 'corredica-500', name: 'Corrediça 500 mm', quantity: 2 }],
        },
      }],
      hardware: [{ code: 'parafuso-4x50', name: 'Parafuso 4x50', quantity: 20 }],
    });

    expect(result.blockers).toEqual([]);
    expect(result.parts.some((part) => part.id === 'modulo-01:porta' && part.quantity === 2)).toBe(true);
    expect(result.parts.some((part) => part.id === 'modulo-01:gaveta-frente' && part.quantity === 2)).toBe(true);
    expect(result.parts.some((part) => part.id === 'modulo-01:gaveta-caixa' && part.quantity === 2)).toBe(true);
    expect(result.bom.find((item) => item.code === 'dobradica-110')?.quantity).toBe(4);
    expect(result.bom.find((item) => item.code === 'corredica-500')?.quantity).toBe(2);
    expect(result.bom.find((item) => item.code === 'parafuso-4x50')?.quantity).toBe(20);
  });

  it('blocks incomplete door and drawer specifications instead of inventing clearances', () => {
    const result = buildFurniturePackage({
      id: 'armario-02', name: 'Armário', width: 800, height: 2000, depth: 500, carcassThickness: 18, material: 'MDP 18',
      modules: [{
        id: 'modulo-02', name: 'Módulo', width: 764, height: 1964, depth: 464, material: 'MDP 18',
        door: { count: 2, frontWidth: 0, frontHeight: 1900 },
        drawer: { count: 1, frontWidth: 350, frontHeight: 150, boxWidth: 0, boxHeight: 120, boxDepth: 400, material: 'MDP 15' },
      }],
    });

    expect(result.blockers.some((blocker) => blocker.includes('Porta inválida'))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes('Gaveta inválida'))).toBe(true);
  });
});
