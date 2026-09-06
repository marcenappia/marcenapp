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
}

export interface CutPart {
  name: string;
  w: number;
  h: number;
  qtd: number;
  mat: 'white' | 'wood';
  thickness: number;
}

export interface PriceList {
  sheet: number;
  sheetArea: number;
  edgePerMeter: number;
  slide: number;
  hinge: number;
  externalHandle: number;
  backSheet: number;
  installationRate: number;
  wasteRate: number;
}

export interface BudgetResult {
  parts: CutPart[];
  internalSheets: number;
  externalSheets: number;
  backSheets: number;
  materialCost: number;
  edgeCost: number;
  hardwareCost: number;
  laborCost: number;
  installationCost: number;
  overheadCost: number;
  profit: number;
  subtotal: number;
  total: number;
  wasteRate: number;
}

export const DEFAULT_PRICES: Record<string, PriceList> = {
  mdf15_white: { sheet: 260, sheetArea: 2.73 * 1.83, edgePerMeter: 2.2, slide: 28, hinge: 7.5, externalHandle: 15, backSheet: 120, installationRate: 0.12, wasteRate: 0.12 },
  mdf18_white: { sheet: 290, sheetArea: 2.73 * 1.83, edgePerMeter: 2.4, slide: 28, hinge: 7.5, externalHandle: 15, backSheet: 120, installationRate: 0.12, wasteRate: 0.12 },
  mdf18_wood: { sheet: 495, sheetArea: 2.73 * 1.83, edgePerMeter: 3.2, slide: 28, hinge: 7.5, externalHandle: 15, backSheet: 120, installationRate: 0.12, wasteRate: 0.12 },
};

const mm = (meters: number) => Math.round(meters * 1000);

function sumArea(parts: CutPart[], predicate: (part: CutPart) => boolean): number {
  return parts.filter(predicate).reduce((sum, part) => sum + (part.w * part.h * part.qtd) / 1_000_000, 0);
}

function edgeMeters(parts: CutPart[]): number {
  return parts.reduce((sum, part) => sum + ((part.w + part.h) * 2 * part.qtd) / 1000, 0);
}

export function buildCutList(project: PricingProject): CutPart[] {
  const W = mm(project.width);
  const H = mm(project.height);
  const D = mm(project.depth);
  const modules = Math.max(1, Math.round(project.modules || 1));
  const moduleW = Math.max(300, Math.floor((W - Math.max(0, modules - 1) * 18) / modules));
  const internalDepth = Math.max(250, D - 20);
  const shelfCount = Math.max(0, modules * 2);
  const drawerCount = Math.max(0, Math.round(project.drawers));
  const doorCount = Math.max(0, Math.round(project.doors));

  const parts: CutPart[] = [
    { name: 'Lateral', w: internalDepth, h: H, qtd: modules * 2, mat: 'white', thickness: 15 },
    { name: 'Base', w: internalDepth, h: moduleW - 30, qtd: modules, mat: 'white', thickness: 15 },
    { name: 'Topo', w: internalDepth, h: moduleW - 30, qtd: modules, mat: 'white', thickness: 15 },
    { name: 'Prateleira', w: internalDepth - 20, h: moduleW - 40, qtd: shelfCount, mat: 'white', thickness: 15 },
    { name: 'Fundo', w: moduleW, h: H, qtd: modules, mat: 'white', thickness: 6 },
  ];

  if (doorCount > 0) {
    const doorW = Math.max(250, Math.floor((W - Math.max(0, doorCount - 1) * 3) / doorCount));
    parts.push({ name: 'Porta', w: doorW, h: Math.max(300, H - 4), qtd: doorCount, mat: 'wood', thickness: 18 });
  }

  if (drawerCount > 0) {
    const drawerW = Math.max(250, moduleW - 50);
    const drawerH = 120;
    parts.push({ name: 'Frente de gaveta', w: drawerW, h: drawerH, qtd: drawerCount, mat: 'wood', thickness: 18 });
    parts.push({ name: 'Caixa de gaveta', w: internalDepth - 80, h: drawerW - 80, qtd: drawerCount, mat: 'white', thickness: 15 });
  }

  return parts;
}

export function calculateBudget(project: PricingProject, prices: PriceList = DEFAULT_PRICES[project.externalMaterial] ?? DEFAULT_PRICES.mdf18_white): BudgetResult {
  const parts = buildCutList(project);
  const internalArea = sumArea(parts, part => part.mat === 'white' && part.thickness === 15) * (1 + prices.wasteRate);
  const externalArea = sumArea(parts, part => part.mat === 'wood' || part.thickness === 18) * (1 + prices.wasteRate);
  const backArea = sumArea(parts, part => part.thickness === 6) * (1 + prices.wasteRate);
  const internalSheets = Math.ceil(internalArea / prices.sheetArea);
  const externalSheets = Math.ceil(externalArea / prices.sheetArea);
  const backSheets = Math.ceil(backArea / prices.sheetArea);

  const internalPrice = DEFAULT_PRICES[project.internalMaterial]?.sheet ?? DEFAULT_PRICES.mdf15_white.sheet;
  const externalPrice = DEFAULT_PRICES[project.externalMaterial]?.sheet ?? DEFAULT_PRICES.mdf18_white.sheet;
  const materialCost = internalSheets * internalPrice + externalSheets * externalPrice + backSheets * prices.backSheet;
  const edgeCost = edgeMeters(parts) * prices.edgePerMeter;
  const handleCount = project.handleType === 'external' ? Math.max(0, project.drawers + project.doors) : 0;
  const hardwareCost = project.drawers * prices.slide + project.doors * 2 * prices.hinge + handleCount * prices.externalHandle;
  const baseCost = materialCost + edgeCost + hardwareCost;
  const laborCost = baseCost * Math.max(0, project.laborRate) / 100;
  const installationCost = baseCost * prices.installationRate;
  const overheadCost = baseCost * 0.05;
  const subtotal = baseCost + laborCost + installationCost + overheadCost;
  const profit = subtotal * Math.max(0, project.profitMargin) / 100;

  return {
    parts,
    internalSheets,
    externalSheets,
    backSheets,
    materialCost,
    edgeCost,
    hardwareCost,
    laborCost,
    installationCost,
    overheadCost,
    profit,
    subtotal,
    total: subtotal + profit,
    wasteRate: prices.wasteRate,
  };
}
