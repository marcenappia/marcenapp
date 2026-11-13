export interface FurnitureFootprint {
  x: number;
  y: number;
  width: number;
  depth: number;
}

export interface RoomFootprint {
  width: number;
  depth: number;
}

const DEFAULT_GAP = 20;
const GRID_STEP = 50;

function overlaps(a: FurnitureFootprint, b: FurnitureFootprint, gap: number): boolean {
  return a.x < b.x + b.width + gap
    && a.x + a.width + gap > b.x
    && a.y < b.y + b.depth + gap
    && a.y + a.depth + gap > b.y;
}

/** Finds the first free top-down position, scanning left-to-right and front-to-back. */
export function findNextFurniturePosition(
  room: RoomFootprint,
  existing: FurnitureFootprint[],
  item: Pick<FurnitureFootprint, 'width' | 'depth'>,
  gap = DEFAULT_GAP,
): { x: number; y: number } | null {
  if (item.width <= 0 || item.depth <= 0 || item.width > room.width || item.depth > room.depth) return null;

  for (let y = 0; y + item.depth <= room.depth; y += GRID_STEP) {
    for (let x = 0; x + item.width <= room.width; x += GRID_STEP) {
      const candidate = { x, y, ...item };
      if (!existing.some((placed) => overlaps(candidate, placed, gap))) return { x, y };
    }
  }

  return null;
}

export function clampFurniturePosition(
  position: { x: number; y: number },
  item: Pick<FurnitureFootprint, 'width' | 'depth'>,
  room: RoomFootprint,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(Math.max(0, room.width - item.width), position.x)),
    y: Math.max(0, Math.min(Math.max(0, room.depth - item.depth), position.y)),
  };
}
