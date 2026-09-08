export interface PricingProject {
  width: number;
  height: number;
  depth: number;
  drawers: number;
  doors: number;
  modules: number;
  internalMaterial: string;
  externalMaterial: string;
  backMaterial: string;
  handleType: string;
  laborRate: number;
  profitMargin: number;
  discountPercent?: number;
}

export interface CutPart { name: string; w: number; h: number; qtd: number; mat: 'white' | 'wood'; thickness: number; }
export interface PriceList { sheet: number; sheetArea: number; edgePerMeter: number; slide: number; hinge: number; externalHandle: number; backSheet: number; installationRate: number; wasteRate: number; overheadRate: number; }
export type PriceCatalog = Record<string, PriceList>;
export interface CutSavings { internal: number; external: number; back: number; total: number; }
export interface BudgetResult { parts: CutPart[]; internalSheets: number; externalSheets: number; backSheets: number; materialCost: number; edgeCost: number; hardwareCost: number; laborCost: number; installationCost: number; overheadCost: number; profit: number; subtotal: number; grossTotal: number; discount: number; total: number; wasteRate: number; sheetSavings: number; }

const SHEET_AREA = 2.73 * 1.83;
export const DEFAULT_PRICES: PriceCatalog = {
  mdf15_white: { sheet: 260, sheetArea: SHEET_AREA, edgePerMeter: 2.2, slide: 28, hinge: 7.5, externalHandle: 15, backSheet: 120, installationRate: 0.12, wasteRate: 0.12, overheadRate: 0.05 },
  mdf18_white: { sheet: 290, sheetArea: SHEET_AREA, edgePerMeter: 2.4, slide: 28, hinge: 7.5, externalHandle: 15, backSheet: 120, installationRate: 0.12, wasteRate: 0.12, overheadRate: 0.05 },
  mdf18_wood: { sheet: 495, sheetArea: SHEET_AREA, edgePerMeter: 3.2, slide: 28, hinge: 7.5, externalHandle: 15, backSheet: 120, installationRate: 0.12, wasteRate: 0.12, overheadRate: 0.05 },
  mdf6_white: { sheet: 120, sheetArea: SHEET_AREA, edgePerMeter: 0, slide: 0, hinge: 0, externalHandle: 0, backSheet: 120, installationRate: 0.12, wasteRate: 0.12, overheadRate: 0.05 },
};
const mm = (meters: number) => Math.round((Number(meters) || 0) * 1000);
const positiveInt = (value: number) => Math.max(0, Math.round(Number(value) || 0));
const safePrice = (value: number, fallback = 0) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;
function sumArea(parts: CutPart[], predicate: (part: CutPart) => boolean) { return parts.filter(predicate).reduce((sum, part) => sum + (part.w * part.h * part.qtd) / 1_000_000, 0); }
function edgeMeters(parts: CutPart[], predicate: (part: CutPart) => boolean) { return parts.filter(predicate).reduce((sum, part) => sum + ((part.w + part.h) * 2 * part.qtd) / 1000, 0); }

export function buildCutList(project: PricingProject): CutPart[] {
  const W = mm(project.width), H = mm(project.height), D = mm(project.depth);
  const modules = Math.max(1, positiveInt(project.modules));
  const moduleW = Math.max(300, Math.floor((W - Math.max(0, modules - 1) * 18) / modules));
  const internalDepth = Math.max(250, D - 20), shelfCount = modules * 2, drawerCount = positiveInt(project.drawers), doorCount = positiveInt(project.doors);
  const parts: CutPart[] = [
    { name: 'Lateral', w: internalDepth, h: H, qtd: modules * 2, mat: 'white', thickness: 15 },
    { name: 'Base', w: internalDepth, h: moduleW - 30, qtd: modules, mat: 'white', thickness: 15 },
    { name: 'Topo', w: internalDepth, h: moduleW - 30, qtd: modules, mat: 'white', thickness: 15 },
    { name: 'Prateleira', w: Math.max(230, internalDepth - 20), h: Math.max(260, moduleW - 40), qtd: shelfCount, mat: 'white', thickness: 15 },
    { name: 'Fundo', w: moduleW, h: H, qtd: modules, mat: 'white', thickness: 6 },
  ];
  if (doorCount > 0) parts.push({ name: 'Porta', w: Math.max(250, Math.floor((W - Math.max(0, doorCount - 1) * 3) / doorCount)), h: Math.max(300, H - 4), qtd: doorCount, mat: 'wood', thickness: 18 });
  if (drawerCount > 0) {
    const drawerW = Math.max(250, moduleW - 50);
    parts.push({ name: 'Frente de gaveta', w: drawerW, h: 120, qtd: drawerCount, mat: 'wood', thickness: 18 });
    parts.push({ name: 'Caixa de gaveta', w: Math.max(220, internalDepth - 80), h: Math.max(220, drawerW - 80), qtd: drawerCount, mat: 'white', thickness: 15 });
  }
  return parts;
}

export function calculateBudget(project: PricingProject, catalog: PriceCatalog = DEFAULT_PRICES, sheetSavings: CutSavings = { internal: 0, external: 0, back: 0, total: 0 }): BudgetResult {
  const parts = buildCutList(project);
  const internalPrices = catalog[project.internalMaterial] ?? DEFAULT_PRICES.mdf15_white;
  const externalPrices = catalog[project.externalMaterial] ?? DEFAULT_PRICES.mdf18_white;
  const backPrices = catalog[project.backMaterial] ?? DEFAULT_PRICES.mdf6_white;
  const wasteRate = Math.min(1, safePrice(externalPrices.wasteRate, 0.12));
  const internalArea = sumArea(parts, p => p.mat === 'white' && p.thickness === 15) * (1 + wasteRate);
  const externalArea = sumArea(parts, p => p.mat === 'wood' || p.thickness === 18) * (1 + wasteRate);
  const backArea = sumArea(parts, p => p.thickness === 6) * (1 + wasteRate);
  const internalSheets = internalArea > 0 ? Math.ceil(internalArea / safePrice(internalPrices.sheetArea, SHEET_AREA)) : 0;
  const externalSheets = externalArea > 0 ? Math.ceil(externalArea / safePrice(externalPrices.sheetArea, SHEET_AREA)) : 0;
  const backSheets = backArea > 0 ? Math.ceil(backArea / safePrice(backPrices.sheetArea, SHEET_AREA)) : 0;
  const internalSaving = Math.min(internalSheets, Math.max(0, Math.floor(sheetSavings.internal))) * safePrice(internalPrices.sheet);
  const externalSaving = Math.min(externalSheets, Math.max(0, Math.floor(sheetSavings.external))) * safePrice(externalPrices.sheet);
  const backSaving = Math.min(backSheets, Math.max(0, Math.floor(sheetSavings.back))) * safePrice(backPrices.sheet);
  const appliedSavings = internalSaving + externalSaving + backSaving;
  const materialCost = Math.max(0, internalSheets * safePrice(internalPrices.sheet) + externalSheets * safePrice(externalPrices.sheet) + backSheets * safePrice(backPrices.sheet) - appliedSavings);
  const edgeCost = edgeMeters(parts, p => p.mat === 'white' && p.thickness !== 6) * safePrice(internalPrices.edgePerMeter) + edgeMeters(parts, p => p.mat === 'wood') * safePrice(externalPrices.edgePerMeter);
  const handleCount = project.handleType === 'external' ? positiveInt(project.drawers) + positiveInt(project.doors) : 0;
  const hardwareCost = positiveInt(project.drawers) * safePrice(externalPrices.slide) + positiveInt(project.doors) * 2 * safePrice(externalPrices.hinge) + handleCount * safePrice(externalPrices.externalHandle);
  const baseCost = materialCost + edgeCost + hardwareCost;
  const laborCost = baseCost * Math.max(0, safePrice(project.laborRate)) / 100;
  const installationCost = baseCost * safePrice(externalPrices.installationRate, 0.12);
  const overheadCost = baseCost * safePrice(externalPrices.overheadRate, 0.05);
  const subtotal = baseCost + laborCost + installationCost + overheadCost;
  const profit = subtotal * Math.max(0, safePrice(project.profitMargin)) / 100;
  const grossTotal = subtotal + profit;
  const discountPercent = Math.min(100, safePrice(project.discountPercent));
  const discount = grossTotal * discountPercent / 100;
  const total = Math.max(0, grossTotal - discount);
  return { parts, internalSheets, externalSheets, backSheets, materialCost, edgeCost, hardwareCost, laborCost, installationCost, overheadCost, profit, subtotal, grossTotal, discount, total, wasteRate, sheetSavings: appliedSavings };
}
