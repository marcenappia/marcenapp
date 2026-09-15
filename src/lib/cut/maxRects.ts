export type CutPart = {
  id: string;
  width: number;
  height: number;
  quantity?: number;
  material: string;
  grainSensitive?: boolean;
  allowRotation?: boolean;
};

export type CutSheet = {
  id: string;
  width: number;
  height: number;
  material: string;
  thickness?: number;
};

export type CutPlacement = {
  partId: string;
  material: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
};

export type OptimizedSheet = CutSheet & {
  placements: CutPlacement[];
  usedArea: number;
  wasteArea: number;
  utilizationPct: number;
};

export type CutOptimizationResult = {
  sheets: OptimizedSheet[];
  unplaced: Array<{ partId: string; material: string; width: number; height: number }>;
  kerf: number;
  totalPartArea: number;
  totalSheetArea: number;
  wasteArea: number;
  utilizationPct: number;
};

type Rect = { x: number; y: number; width: number; height: number };
type Candidate = { rectIndex: number; width: number; height: number; rotated: boolean; shortFit: number; longFit: number };

function fits(rect: Rect, width: number, height: number): boolean {
  return width <= rect.width && height <= rect.height;
}

function candidateFor(rect: Rect, width: number, height: number, rectIndex: number, rotated: boolean): Candidate | null {
  if (!fits(rect, width, height)) return null;
  return {
    rectIndex,
    width,
    height,
    rotated,
    shortFit: Math.min(rect.width - width, rect.height - height),
    longFit: Math.max(rect.width - width, rect.height - height),
  };
}

function better(a: Candidate | null, b: Candidate | null): Candidate | null {
  if (!a) return b;
  if (!b) return a;
  if (b.shortFit < a.shortFit) return b;
  if (b.shortFit > a.shortFit) return a;
  return b.longFit < a.longFit ? b : a;
}

function splitFreeRect(free: Rect, used: Rect): Rect[] {
  if (used.x >= free.x + free.width || used.x + used.width <= free.x || used.y >= free.y + free.height || used.y + used.height <= free.y) return [free];
  const result: Rect[] = [];
  if (used.x > free.x) result.push({ x: free.x, y: free.y, width: used.x - free.x, height: free.height });
  if (used.x + used.width < free.x + free.width) result.push({ x: used.x + used.width, y: free.y, width: free.x + free.width - (used.x + used.width), height: free.height });
  if (used.y > free.y) result.push({ x: free.x, y: free.y, width: free.width, height: used.y - free.y });
  if (used.y + used.height < free.y + free.height) result.push({ x: free.x, y: used.y + used.height, width: free.width, height: free.y + free.height - (used.y + used.height) });
  return result.filter((rect) => rect.width > 0 && rect.height > 0);
}

function pruneFreeRects(rects: Rect[]): Rect[] {
  return rects.filter((rect, index) => !rects.some((other, otherIndex) => {
    if (index === otherIndex) return false;
    return other.x <= rect.x && other.y <= rect.y && other.x + other.width >= rect.x + rect.width && other.y + other.height >= rect.y + rect.height;
  }));
}

function expandParts(parts: CutPart[]): CutPart[] {
  return parts.flatMap((part) => Array.from({ length: Math.max(1, part.quantity ?? 1) }, (_, index) => ({ ...part, id: `${part.id}#${index + 1}`, quantity: 1 })));
}

function pickCandidate(freeRects: Rect[], part: CutPart, kerf: number): Candidate | null {
  const width = part.width + kerf;
  const height = part.height + kerf;
  const canRotate = part.allowRotation !== false && !part.grainSensitive;
  let best: Candidate | null = null;
  freeRects.forEach((rect, index) => {
    best = better(best, candidateFor(rect, width, height, index, false));
    if (canRotate && width !== height) best = better(best, candidateFor(rect, height, width, index, true));
  });
  return best;
}

export function optimizeCutList(parts: CutPart[], sheetTemplates: CutSheet[], kerf = 3): CutOptimizationResult {
  if (!Number.isFinite(kerf) || kerf < 0) throw new Error('Kerf deve ser um número maior ou igual a zero.');
  const expanded = expandParts(parts).filter((part) => part.width > 0 && part.height > 0);
  const open = new Map<string, Array<{ sheet: OptimizedSheet; freeRects: Rect[] }>>();
  const sheets: OptimizedSheet[] = [];
  const unplaced: CutOptimizationResult['unplaced'] = [];

  const templates = sheetTemplates.filter((sheet) => sheet.width > 0 && sheet.height > 0 && sheet.material);
  const sorted = [...expanded].sort((a, b) => (b.width * b.height) - (a.width * a.height));

  for (const part of sorted) {
    let bestContainer: { entry: { sheet: OptimizedSheet; freeRects: Rect[] }; candidate: Candidate } | null = null;
    for (const entry of open.get(part.material) ?? []) {
      const candidate = pickCandidate(entry.freeRects, part, kerf);
      if (!candidate) continue;
      if (!bestContainer || candidate.shortFit < bestContainer.candidate.shortFit || (candidate.shortFit === bestContainer.candidate.shortFit && candidate.longFit < bestContainer.candidate.longFit)) {
        bestContainer = { entry, candidate };
      }
    }

    if (!bestContainer) {
      const template = templates.find((sheet) => sheet.material === part.material);
      if (!template) {
        unplaced.push({ partId: part.id, material: part.material, width: part.width, height: part.height });
        continue;
      }
      const sheet: OptimizedSheet = { ...template, id: `${template.id}#${sheets.length + 1}`, placements: [], usedArea: 0, wasteArea: template.width * template.height, utilizationPct: 0 };
      const freeRects: Rect[] = [{ x: 0, y: 0, width: template.width, height: template.height }];
      const candidate = pickCandidate(freeRects, part, kerf);
      if (!candidate) {
        unplaced.push({ partId: part.id, material: part.material, width: part.width, height: part.height });
        continue;
      }
      const entry = { sheet, freeRects };
      const placement = { x: freeRects[candidate.rectIndex].x, y: freeRects[candidate.rectIndex].y, width: part.width, height: part.height, rotated: candidate.rotated };
      sheet.placements.push({ partId: part.id, material: part.material, ...placement });
      sheet.usedArea += part.width * part.height;
      sheet.wasteArea = sheet.width * sheet.height - sheet.usedArea;
      sheet.utilizationPct = (sheet.usedArea / (sheet.width * sheet.height)) * 100;
      const usedRect = { x: placement.x, y: placement.y, width: candidate.width, height: candidate.height };
      entry.freeRects.splice(candidate.rectIndex, 1, ...splitFreeRect(freeRects[candidate.rectIndex], usedRect));
      entry.freeRects.splice(0, entry.freeRects.length, ...pruneFreeRects(entry.freeRects));
      sheets.push(sheet);
      open.set(part.material, [...(open.get(part.material) ?? []), entry]);
      continue;
    }

    const { entry, candidate } = bestContainer;
    const free = entry.freeRects[candidate.rectIndex];
    const placement = { x: free.x, y: free.y, width: part.width, height: part.height, rotated: candidate.rotated };
    entry.sheet.placements.push({ partId: part.id, material: part.material, ...placement });
    entry.sheet.usedArea += part.width * part.height;
    entry.sheet.wasteArea = entry.sheet.width * entry.sheet.height - entry.sheet.usedArea;
    entry.sheet.utilizationPct = (entry.sheet.usedArea / (entry.sheet.width * entry.sheet.height)) * 100;
    entry.freeRects.splice(candidate.rectIndex, 1, ...splitFreeRect(free, { x: placement.x, y: placement.y, width: candidate.width, height: candidate.height }));
    entry.freeRects.splice(0, entry.freeRects.length, ...pruneFreeRects(entry.freeRects));
  }

  const totalPartArea = expanded.filter((part) => !unplaced.some((item) => item.partId.startsWith(part.id))).reduce((sum, part) => sum + part.width * part.height, 0);
  const totalSheetArea = sheets.reduce((sum, sheet) => sum + sheet.width * sheet.height, 0);
  const wasteArea = Math.max(0, totalSheetArea - totalPartArea);
  return { sheets, unplaced, kerf, totalPartArea, totalSheetArea, wasteArea, utilizationPct: totalSheetArea ? (totalPartArea / totalSheetArea) * 100 : 0 };
}
