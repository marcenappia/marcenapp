import { describe, expect, it } from 'vitest';
import { clampFurniturePosition, findNextFurniturePosition } from './furnitureLayout';

describe('furnitureLayout', () => {
  it('places added modules in the first free slot instead of stacking them', () => {
    const room = { width: 2000, depth: 1200 };
    const first = findNextFurniturePosition(room, [], { width: 800, depth: 560 });
    expect(first).toEqual({ x: 0, y: 0 });

    const second = findNextFurniturePosition(room, [{ ...first!, width: 800, depth: 560 }], { width: 800, depth: 560 });
    expect(second).toEqual({ x: 850, y: 0 });
  });

  it('returns null when the module cannot fit inside the room', () => {
    expect(findNextFurniturePosition({ width: 500, depth: 500 }, [], { width: 800, depth: 560 })).toBeNull();
  });

  it('clamps manual positions to the room boundary', () => {
    expect(clampFurniturePosition({ x: 1900, y: -40 }, { width: 800, depth: 560 }, { width: 2000, depth: 1200 }))
      .toEqual({ x: 1200, y: 0 });
  });
});
