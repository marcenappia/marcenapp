export type GrainDirection = 'vertical' | 'horizontal' | 'none';

export interface CutPlanningPart {
  id: number;
  name: string;
  w: number;
  h: number;
  qtd: number;
  mat: 'white' | 'wood';
  thickness: number;
  grain?: GrainDirection;
}

export interface PlannedItem extends CutPlanningPart {
  uid: string;
  x: number;
  y: number;
  rotated: boolean;
}

export interface CutStockSheet {
  id: string;
  material: 'white' | 'wood';
  thickness: number;
  width: number;
  height: number;
  source: 'sheet' | 'remnant';
}

export interface CutRemnant {
  id: string;
  material: 'white' | 'wood';
  thickness: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

export interface CutSheet {
  material: 'white' | 'wood';
  thickness: number;
  width: number;
  height: number;
  source: 'sheet' | 'remnant';
  stockId: string;
  items: PlannedItem[];
  usedArea: number;
  utilization: number;
  remnantArea: number;
  remnants: CutRemnant[];
}

export interface CutPlanOptions {
  sheetWidth?: number;
  sheetHeight?: number;
  kerf?: number;
  allowRotation?: boolean;
  stockSheets?: CutStockSheet[];
}

interface FreeRect { x: number; y: number; w: number; h: number }

const DEFAULT_SHEET_W = 2730;
const DEFAULT_SHEET_H = 1830;
const DEFAULT_KERF = 3;

function area(w: number, h: number) { return w * h; }

function canPlace(rect: FreeRect, w: number, h: number, kerf: number) {
  return w > 0 && h > 0 && w + kerf <= rect.w + 0.001 && h + kerf <= rect.h + 0.001;
}

function placeInSheet(
  sheet: CutSheet,
  free: FreeRect[],
  part: CutPlanningPart,
  uid: string,
  options: Required<CutPlanOptions>,
): boolean {
  const candidates = [{ w: part.w, h: part.h, rotated: false }];
  const grain = part.grain ?? 'none';
  if (options.allowRotation && grain === 'none' && part.w !== part.h) {
    candidates.push({ w: part.h, h: part.w, rotated: true });
  }

  let best: { index: number; w: number; h: number; rotated: boolean; score: number } | null = null;
  free.forEach((rect, index) => {
    candidates.forEach(candidate => {
      if (!canPlace(rect, candidate.w, candidate.h, options.kerf)) return;
      const leftover = area(rect.w, rect.h) - area(candidate.w + options.kerf, candidate.h + options.kerf);
      const shortSide = Math.min(rect.w - candidate.w, rect.h - candidate.h);
      const score = leftover * 0.001 + shortSide;
      if (!best || score < best.score) best = { index, ...candidate, score };
    });
  });

  if (!best) return false;
  const rect = free[best.index];
  sheet.items.push({ ...part, uid, w: best.w, h: best.h, x: rect.x, y: rect.y, rotated: best.rotated });
  sheet.usedArea += area(part.w, part.h);

  const right: FreeRect = { x: rect.x + best.w + options.kerf, y: rect.y, w: rect.w - best.w - options.kerf, h: rect.h };
  const bottom: FreeRect = { x: rect.x, y: rect.y + best.h + options.kerf, w: best.w, h: rect.h - best.h - options.kerf };
  const rest: FreeRect[] = [];
  if (right.w > 0 && right.h > 0) rest.push(right);
  if (bottom.w > 0 && bottom.h > 0) rest.push(bottom);
  free.splice(best.index, 1, ...rest);
  return true;
}

function expandParts(parts: CutPlanningPart[]) {
  const expanded: CutPlanningPart[] = [];
  parts.forEach(part => {
    const qtd = Math.max(0, Math.floor(Number(part.qtd) || 0));
    for (let i = 0; i < qtd; i++) expanded.push(part);
  });
  return expanded;
}

export function planCutting(parts: CutPlanningPart[], options: CutPlanOptions = {}): CutSheet[] {
  const config: Required<Omit<CutPlanOptions, 'stockSheets'>> & { stockSheets: CutStockSheet[] } = {
    sheetWidth: options.sheetWidth ?? DEFAULT_SHEET_W,
    sheetHeight: options.sheetHeight ?? DEFAULT_SHEET_H,
    kerf: options.kerf ?? DEFAULT_KERF,
    allowRotation: options.allowRotation ?? true,
    stockSheets: options.stockSheets ?? [],
  };

  const groups = new Map<string, CutPlanningPart[]>();
  expandParts(parts).forEach(part => {
    const key = `${part.mat}:${part.thickness}`;
    const list = groups.get(key) ?? [];
    list.push(part);
    groups.set(key, list);
  });

  const sheets: CutSheet[] = [];
  groups.forEach(group => {
    const key = `${group[0].mat}:${group[0].thickness}`;
    group.sort((a, b) => area(b.w, b.h) - area(a.w, a.h));
    const stock = config.stockSheets
      .filter(s => `${s.material}:${s.thickness}` === key)
      .sort((a, b) => area(b.width, b.height) - area(a.width, a.height));
    let stockIndex = 0;
    let current: CutSheet | null = null;
    let free: FreeRect[] = [];
    let sequence = 0;

    const finalizeCurrent = () => {
      if (!current) return;
      const sheetArea = area(current.width, current.height);
      current.utilization = current.usedArea / sheetArea;
      current.remnants = free
        .filter(rect => rect.w >= 150 && rect.h >= 150)
        .map((rect, index) => ({
          id: `${current!.stockId}-rem-${index}`,
          material: current!.material,
          thickness: current!.thickness,
          x: rect.x,
          y: rect.y,
          width: Math.floor(rect.w),
          height: Math.floor(rect.h),
          area: Math.floor(rect.w) * Math.floor(rect.h),
        }));
      current.remnantArea = current.remnants.reduce((sum, rem) => sum + rem.area, 0);
    };

    const createNextSheet = () => {
      finalizeCurrent();
      const source = stock[stockIndex++] ?? {
        id: `sheet-${group[0].mat}-${group[0].thickness}-${sheets.length + 1}`,
        material: group[0].mat,
        thickness: group[0].thickness,
        width: config.sheetWidth,
        height: config.sheetHeight,
        source: 'sheet' as const,
      };
      current = {
        material: source.material,
        thickness: source.thickness,
        width: source.width,
        height: source.height,
        source: source.source,
        stockId: source.id,
        items: [],
        usedArea: 0,
        utilization: 0,
        remnantArea: area(source.width, source.height),
        remnants: [],
      };
      free = [{ x: 0, y: 0, w: source.width, h: source.height }];
      sheets.push(current);
    };

    group.forEach((part, index) => {
      if (!current) createNextSheet();
      if (placeInSheet(current!, free, part, `${part.id}-${sequence++}-${index}`, config)) return;

      // A remnant that cannot accept this part is skipped without leaving a
      // misleading empty sheet in the plan. The next compatible stock item
      // gets a chance before opening a new full sheet.
      if (current!.items.length === 0 && current!.source === 'remnant') {
        sheets.pop();
        current = null;
        free = [];
        if (stockIndex < stock.length) {
          createNextSheet();
          if (placeInSheet(current!, free, part, `${part.id}-${sequence++}-${index}`, config)) return;
        }
      }

      createNextSheet();
      if (!placeInSheet(current!, free, part, `${part.id}-${sequence++}-${index}`, config)) {
        throw new Error(`Peça ${part.name} (${part.w}×${part.h} mm) maior que a chapa disponível`);
      }
    });
    finalizeCurrent();
  });

  return sheets;
}
