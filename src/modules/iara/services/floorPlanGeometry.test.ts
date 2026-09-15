import { describe, expect, it } from 'vitest';
import { buildFloorPlanGeometry } from './floorPlanGeometry';

describe('buildFloorPlanGeometry', () => {
  it('converte paredes e ambientes sem perder referências humanas', () => {
    const geometry = buildFloorPlanGeometry({
      dimensions: { width: 4.2, depth: 3.1 },
      environments: [{ name: 'Cozinha', type: 'cozinha', confidence: 0.92 }],
      walls: [
        { start: [0, 0], end: [4.2, 0], length: 4.2, humanReference: 'frente' },
        { start: [4.2, 0], end: [4.2, 3.1], humanReference: 'direita' },
      ],
      openings: [{ type: 'janela', wallReference: 'direita', width: 1.2, height: 1.1 }],
    });

    expect(geometry.walls).toHaveLength(2);
    expect(geometry.walls[0].humanReference).toBe('frente');
    expect(geometry.walls[1].evidence).toBe('estimated');
    expect(geometry.openings[0].type).toBe('window');
    expect(geometry.openings[0].wallIndex).toBe(1);
    expect(geometry.bounds).toEqual({ width: 4.2, depth: 3.1 });
  });

  it('não inventa escala ou dimensões de abertura ausentes', () => {
    const geometry = buildFloorPlanGeometry({
      walls: [{ start: [0, 0], end: [3, 0], humanReference: 'esquerda' }],
      openings: [{ type: 'porta', wallReference: 'esquerda' }],
    });

    expect(geometry.scale).toBeNull();
    expect(geometry.scaleEvidence).toBe('unknown');
    expect(geometry.openings[0].width).toBeNull();
    expect(geometry.openings[0].height).toBeNull();
    expect(geometry.assumptions.some((item) => item.includes('Largura da abertura'))).toBe(true);
  });

  it('marca abertura sem parede correspondente como não vinculada', () => {
    const geometry = buildFloorPlanGeometry({
      walls: [{ start: [0, 0], end: [3, 0], humanReference: 'frente' }],
      openings: [{ type: 'porta', wallReference: 'fundo', width: 0.8, height: 2.1 }],
    });

    expect(geometry.openings[0].wallIndex).toBeNull();
    expect(geometry.warnings.some((item) => item.includes('não pôde ser vinculada'))).toBe(true);
  });
});
