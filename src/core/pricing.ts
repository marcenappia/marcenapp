export interface PricingProject {
  width: number;
  height: number;
  depth: number;
  modules?: number;
  drawers?: number;
  doors?: number;
  internalMaterial?: string | null;
  externalMaterial?: string | null;
  backMaterial?: string | null;
  handleType?: string | null;
  profitMargin?: number | null;
  laborRate?: number | null;
}

export interface MaterialPrice { price: number; area: number; thickness: number; label: string }
export interface PricingResult {
  total: number;
  materials: number;
  labor: number;
  waste: number;
  profit: number;
  hardware: number;
  sheetsInternal: number;
  sheetsExternal: number;
  sheetsBack: number;
  parts: Array<{ name: string; quantity: number; width: number; height: number; material: string }>;
}

// Base catalog is intentionally centralized. It is a compatibility catalog until the
// editable price-list screen is wired to persisted price data.
export const MATERIAL_CATALOG: Record<string, MaterialPrice> = {
  mdf6_white: { price: 180, area: 5.08, thickness: 0.006, label: 'MDF 6 mm branco' },
  mdf15_white: { price: 260, area: 5.08, thickness: 0.015, label: 'MDF 15 mm branco' },
  mdf18_white: { price: 290, area: 5.08, thickness: 0.018, label: 'MDF 18 mm branco' },
  mdf18_wood: { price: 495, area: 5.08, thickness: 0.018, label: 'MDF 18 mm amadeirado' },
};

export const HARDWARE_PRICES = {
  drawerSlide: 28,
  hinge: 7.5,
  externalHandle: 15,
  edgeTapePerMeter: 4,
};

const positive = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const round = (value: number) => Number(value.toFixed(2));

export function buildParts(project: PricingProject) {
  const width = positive(project.width);
  const height = positive(project.height);
  const depth = positive(project.depth);
  const modules = Math.max(1, Math.round(positive(project.modules, 1)));
  const drawers = Math.max(0, Math.round(positive(project.drawers)));
  const doors = Math.max(0, Math.round(positive(project.doors)));
  const sideThickness = MATERIAL_CATALOG[project.externalMaterial ?? 'mdf18_white']?.thickness ?? 0.018;
  const internal = project.internalMaterial ?? 'mdf15_white';
  const external = project.externalMaterial ?? 'mdf18_white';
  const back = project.backMaterial ?? 'mdf6_white';
  const innerWidth = Math.max(0.05, width - 2 * sideThickness);
  const shelfQty = Math.max(0, modules - 1);
  const parts: PricingResult['parts'] = [];
  const add = (name: string, quantity: number, w: number, h: number, material: string) => {
    if (quantity > 0 && w > 0 && h > 0) parts.push({ name, quantity, width: round(w), height: round(h), material });
  };
  add('Lateral', 2, depth, height, external);
  add('Base', 1, innerWidth, depth, external);
  add('Topo', 1, innerWidth, depth, external);
  add('Prateleira', shelfQty, innerWidth, Math.max(0.05, depth - 0.01), internal);
  add('Fundo', 1, width, height, back);
  add('Porta', doors, width / Math.max(1, doors), height, external);
  if (drawers > 0) {
    const drawerFrontHeight = Math.min(0.22, Math.max(0.12, height / Math.max(4, drawers + 2)));
    add('Frente de gaveta', drawers, innerWidth / Math.max(1, Math.ceil(Math.sqrt(modules))), drawerFrontHeight, external);
    add('Lateral de gaveta', drawers * 2, Math.max(0.25, depth - 0.06), drawerFrontHeight, internal);
    add('Fundo de gaveta', drawers, innerWidth, Math.max(0.25, depth - 0.06), internal);
  }
  return parts;
}

export function calculatePricing(project: PricingProject): PricingResult {
  const parts = buildParts(project);
  const internal = MATERIAL_CATALOG[project.internalMaterial ?? 'mdf15_white'] ?? MATERIAL_CATALOG.mdf15_white;
  const external = MATERIAL_CATALOG[project.externalMaterial ?? 'mdf18_white'] ?? MATERIAL_CATALOG.mdf18_white;
  const back = MATERIAL_CATALOG[project.backMaterial ?? 'mdf6_white'] ?? MATERIAL_CATALOG.mdf6_white;
  const areaByMaterial: Record<string, number> = {};
  for (const part of parts) areaByMaterial[part.material] = (areaByMaterial[part.material] ?? 0) + part.width * part.height * part.quantity;
  const wasteRate = 0.12;
  const internalArea = (areaByMaterial[internal.label] ?? 0);
  const externalArea = (areaByMaterial[external.label] ?? 0);
  // Parts store material keys; resolve by key for accurate sheet counts.
  const areaByKey: Record<string, number> = {};
  for (const part of parts) areaByKey[part.material] = (areaByKey[part.material] ?? 0) + part.width * part.height * part.quantity;
  const internalAreaKey = areaByKey[project.internalMaterial ?? 'mdf15_white'] ?? 0;
  const externalAreaKey = areaByKey[project.externalMaterial ?? 'mdf18_white'] ?? 0;
  const backAreaKey = areaByKey[project.backMaterial ?? 'mdf6_white'] ?? 0;
  const sheetsInternal = Math.ceil((internalAreaKey * (1 + wasteRate)) / internal.area);
  const sheetsExternal = Math.ceil((externalAreaKey * (1 + wasteRate)) / external.area);
  const sheetsBack = Math.ceil((backAreaKey * (1 + wasteRate)) / back.area);
  const materialCost = sheetsInternal * internal.price + sheetsExternal * external.price + sheetsBack * back.price;
  const drawers = Math.max(0, Math.round(positive(project.drawers)));
  const doors = Math.max(0, Math.round(positive(project.doors)));
  const handleCount = project.handleType === 'external' ? drawers + doors : 0;
  const hardware = drawers * HARDWARE_PRICES.drawerSlide + doors * 2 * HARDWARE_PRICES.hinge + handleCount * HARDWARE_PRICES.externalHandle;
  const edgeMeters = parts.reduce((sum, part) => sum + part.quantity * 2 * (part.width + part.height), 0);
  const edgeCost = edgeMeters * HARDWARE_PRICES.edgeTapePerMeter;
  const materials = materialCost + hardware + edgeCost;
  const laborRate = Math.max(0, Number(project.laborRate ?? 100));
  const labor = materials * (laborRate / 100);
  const waste = materialCost * wasteRate;
  const subtotal = materials + labor;
  const profit = subtotal * (Math.max(0, Number(project.profitMargin ?? 35)) / 100);
  return {
    total: round(subtotal + profit),
    materials: round(materials),
    labor: round(labor),
    waste: round(waste),
    profit: round(profit),
    hardware: round(hardware + edgeCost),
    sheetsInternal,
    sheetsExternal,
    sheetsBack,
    parts,
  };
}
