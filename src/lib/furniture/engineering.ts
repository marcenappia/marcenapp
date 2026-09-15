import type { CutSheet } from '@/lib/cut/maxRects';

export type FurnitureEngineeringSpec = {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  carcassThickness: number;
  backThickness?: number;
  backInset?: number;
  shelfCount?: number;
  doorCount?: number;
  drawerCount?: number;
  material: string;
  backMaterial?: string;
  grainSensitive?: boolean;
  sheetTemplates?: CutSheet[];
  kerf?: number;
};

export type EngineeredPart = {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  material: string;
  grainSensitive: boolean;
  allowRotation: boolean;
  role: 'side' | 'top' | 'bottom' | 'shelf' | 'back' | 'door' | 'drawer-front' | 'drawer-box';
};

export type EngineeringResult = {
  furnitureId: string;
  parts: EngineeredPart[];
  sheetTemplates: CutSheet[];
  kerf?: number;
  assumptions: string[];
  blockers: string[];
};

function positive(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validSheets(sheets: CutSheet[] | undefined): boolean {
  return Boolean(sheets?.length) && sheets!.every((sheet) => positive(sheet.width) && positive(sheet.height) && Boolean(sheet.material));
}

/**
 * Generates only geometry explicitly defined by the construction contract.
 * It deliberately does not guess door/drawer fronts, fittings, edge clearances or joinery.
 */
export function engineerBasicCarcass(spec: FurnitureEngineeringSpec): EngineeringResult {
  const blockers: string[] = [];
  const assumptions: string[] = [];

  for (const [label, value] of [
    ['largura', spec.width],
    ['altura', spec.height],
    ['profundidade', spec.depth],
    ['espessura da caixa', spec.carcassThickness],
  ] as const) {
    if (!positive(value)) blockers.push(`Dimensão inválida: ${label}.`);
  }
  if (!spec.id) blockers.push('Móvel sem identificador.');
  if (!spec.material) blockers.push('Móvel sem material da caixa.');
  if (spec.kerf !== undefined && (!Number.isFinite(spec.kerf) || spec.kerf < 0)) blockers.push('Kerf inválido.');
  if (spec.sheetTemplates && !validSheets(spec.sheetTemplates)) blockers.push('Chapas de fabricação inválidas.');
  if (blockers.length) return { furnitureId: spec.id, parts: [], sheetTemplates: spec.sheetTemplates ?? [], kerf: spec.kerf, assumptions, blockers };

  const t = spec.carcassThickness;
  const internalWidth = spec.width - (2 * t);
  const internalHeight = spec.height - (2 * t);
  if (internalWidth <= 0 || internalHeight <= 0) {
    return {
      furnitureId: spec.id,
      parts: [],
      sheetTemplates: spec.sheetTemplates ?? [],
      kerf: spec.kerf,
      assumptions,
      blockers: ['As dimensões externas não comportam duas laterais e travessas com a espessura informada.'],
    };
  }

  const grainSensitive = spec.grainSensitive !== false;
  const parts: EngineeredPart[] = [
    { id: `${spec.id}:lateral-esquerda`, name: 'Lateral esquerda', width: spec.depth, height: spec.height, quantity: 1, material: spec.material, grainSensitive, allowRotation: !grainSensitive, role: 'side' },
    { id: `${spec.id}:lateral-direita`, name: 'Lateral direita', width: spec.depth, height: spec.height, quantity: 1, material: spec.material, grainSensitive, allowRotation: !grainSensitive, role: 'side' },
    { id: `${spec.id}:base`, name: 'Base', width: internalWidth, height: spec.depth, quantity: 1, material: spec.material, grainSensitive, allowRotation: !grainSensitive, role: 'bottom' },
    { id: `${spec.id}:tampo`, name: 'Tampo', width: internalWidth, height: spec.depth, quantity: 1, material: spec.material, grainSensitive, allowRotation: !grainSensitive, role: 'top' },
  ];

  const shelfCount = spec.shelfCount ?? 0;
  if (!Number.isInteger(shelfCount) || shelfCount < 0) blockers.push('Quantidade de prateleiras inválida.');
  if (shelfCount > 0) {
    for (let index = 1; index <= shelfCount; index += 1) {
      parts.push({
        id: `${spec.id}:prateleira-${index}`, name: `Prateleira ${index}`, width: internalWidth, height: spec.depth,
        quantity: 1, material: spec.material, grainSensitive, allowRotation: !grainSensitive, role: 'shelf',
      });
    }
  }

  if (spec.backThickness !== undefined) {
    if (!positive(spec.backThickness)) blockers.push('Espessura do fundo inválida.');
    else {
      const inset = spec.backInset ?? 0;
      if (inset < 0 || inset >= spec.depth) blockers.push('Recuo do fundo inválido.');
      else parts.push({
        id: `${spec.id}:fundo`, name: 'Fundo', width: spec.width, height: spec.height, quantity: 1,
        material: spec.backMaterial ?? spec.material, grainSensitive, allowRotation: !grainSensitive, role: 'back',
      });
    }
  } else {
    assumptions.push('Fundo não foi gerado porque a espessura do fundo não foi informada.');
  }

  if ((spec.doorCount ?? 0) > 0) blockers.push('Portas exigem regra explícita de folga, sobreposição e ferragens; não foram inventadas.');
  if ((spec.drawerCount ?? 0) > 0) blockers.push('Gavetas exigem regra explícita de caixa, corrediça e folgas; não foram inventadas.');

  return { furnitureId: spec.id, parts, sheetTemplates: spec.sheetTemplates ?? [], kerf: spec.kerf, assumptions, blockers };
}
