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
  role: 'side' | 'top' | 'bottom' | 'shelf' | 'back';
};

export type EngineeringResult = {
  furnitureId: string;
  parts: EngineeredPart[];
  assumptions: string[];
  blockers: string[];
};

function positive(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Generates only the geometry that is explicitly defined by the construction contract.
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
  if (blockers.length) return { furnitureId: spec.id, parts: [], assumptions, blockers };

  const t = spec.carcassThickness;
  const internalWidth = spec.width - (2 * t);
  const internalHeight = spec.height - (2 * t);
  if (internalWidth <= 0 || internalHeight <= 0) {
    return {
      furnitureId: spec.id,
      parts: [],
      assumptions,
      blockers: ['As dimensões externas não comportam duas laterais e travessas com a espessura informada.'],
    };
  }

  const grainSensitive = spec.grainSensitive !== false;
  const parts: EngineeredPart[] = [
    {
      id: `${spec.id}:lateral-esquerda`,
      name: 'Lateral esquerda',
      width: spec.depth,
      height: spec.height,
      quantity: 1,
      material: spec.material,
      grainSensitive,
      allowRotation: !grainSensitive,
      role: 'side',
    },
    {
      id: `${spec.id}:lateral-direita`,
      name: 'Lateral direita',
      width: spec.depth,
      height: spec.height,
      quantity: 1,
      material: spec.material,
      grainSensitive,
      allowRotation: !grainSensitive,
      role: 'side',
    },
    {
      id: `${spec.id}:base`,
      name: 'Base',
      width: internalWidth,
      height: spec.depth,
      quantity: 1,
      material: spec.material,
      grainSensitive,
      allowRotation: !grainSensitive,
      role: 'bottom',
    },
    {
      id: `${spec.id}:tampo`,
      name: 'Tampo',
      width: internalWidth,
      height: spec.depth,
      quantity: 1,
      material: spec.material,
      grainSensitive,
      allowRotation: !grainSensitive,
      role: 'top',
    },
  ];

  const shelfCount = spec.shelfCount ?? 0;
  if (!Number.isInteger(shelfCount) || shelfCount < 0) blockers.push('Quantidade de prateleiras inválida.');
  if (shelfCount > 0) {
    for (let index = 1; index <= shelfCount; index += 1) {
      parts.push({
        id: `${spec.id}:prateleira-${index}`,
        name: `Prateleira ${index}`,
        width: internalWidth,
        height: Math.max(1, spec.depth - 2),
        quantity: 1,
        material: spec.material,
        grainSensitive,
        allowRotation: !grainSensitive,
        role: 'shelf',
      });
    }
  }

  if (spec.backThickness !== undefined) {
    if (!positive(spec.backThickness)) blockers.push('Espessura do fundo inválida.');
    else {
      const inset = spec.backInset ?? 0;
      if (inset < 0 || inset >= spec.depth) blockers.push('Recuo do fundo inválido.');
      else {
        parts.push({
          id: `${spec.id}:fundo`,
          name: 'Fundo',
          width: spec.width,
          height: spec.height,
          quantity: 1,
          material: spec.backMaterial ?? spec.material,
          grainSensitive,
          allowRotation: !grainSensitive,
          role: 'back',
        });
      }
    }
  } else {
    assumptions.push('Fundo não foi gerado porque a espessura do fundo não foi informada.');
  }

  if ((spec.doorCount ?? 0) > 0) blockers.push('Portas exigem regra explícita de folga, sobreposição e ferragens; não foram inventadas.');
  if ((spec.drawerCount ?? 0) > 0) blockers.push('Gavetas exigem regra explícita de caixa, corrediça e folgas; não foram inventadas.');

  return { furnitureId: spec.id, parts, assumptions, blockers };
}
