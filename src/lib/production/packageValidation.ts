export type ProductionPart = {
  id?: string;
  code?: string;
  width?: number;
  height?: number;
  quantity?: number;
  material?: string;
};

export type ProductionSheet = {
  code?: string;
  width?: number;
  height?: number;
  material?: string;
  pieces?: Array<{
    id?: string;
    code?: string;
    width?: number;
    height?: number;
  }>;
};

export type ProductionBomItem = {
  code?: string;
  category?: string;
  quantity?: number;
};

export type ProductionPackageValidation = {
  valid: boolean;
  blockers: string[];
  summary: {
    requestedParts: number;
    plannedPieces: number;
    bomPanelQuantity: number;
  };
};

function codeOf(value: { id?: string; code?: string }): string {
  return String(value.code ?? value.id ?? '');
}

export function validateProductionPackage(
  parts: ProductionPart[],
  cutPlan: ProductionSheet[],
  bom: ProductionBomItem[] = [],
): ProductionPackageValidation {
  const blockers: string[] = [];
  const requested = new Map<string, number>();
  const planned = new Map<string, number>();

  for (const part of parts) {
    const code = codeOf(part);
    const quantity = Number(part.quantity ?? 1);
    if (!code || !Number.isInteger(quantity) || quantity < 1 || !(Number(part.width) > 0) || !(Number(part.height) > 0) || !part.material) {
      blockers.push(`Peça inválida para produção: ${code || 'sem código'}.`);
      continue;
    }
    requested.set(code, (requested.get(code) ?? 0) + quantity);
  }

  for (const sheet of cutPlan) {
    const sheetCode = String(sheet.code ?? '');
    if (!(Number(sheet.width) > 0) || !(Number(sheet.height) > 0) || !sheet.material) {
      blockers.push(`Chapa inválida no plano de corte: ${sheetCode || 'sem código'}.`);
      continue;
    }
    for (const piece of sheet.pieces ?? []) {
      const code = codeOf(piece);
      if (!code || !(Number(piece.width) > 0) || !(Number(piece.height) > 0)) {
        blockers.push(`Peça inválida na chapa ${sheetCode || '?'}.`);
        continue;
      }
      const baseCode = code.split('#')[0];
      planned.set(baseCode, (planned.get(baseCode) ?? 0) + 1);
    }
  }

  for (const [code, expected] of requested) {
    const actual = planned.get(code) ?? 0;
    if (actual !== expected) blockers.push(`Produção bloqueada: ${code} tem ${expected} peça(s) na engenharia e ${actual} no plano de corte.`);
  }
  for (const [code] of planned) {
    if (!requested.has(code)) blockers.push(`Produção bloqueada: ${code} aparece no corte, mas não existe na lista de peças.`);
  }

  const bomPanelQuantity = bom
    .filter((item) => item.category === 'panel' || item.category === undefined)
    .reduce((sum, item) => sum + Math.max(0, Number(item.quantity ?? 0)), 0);
  const requestedPartQuantity = [...requested.values()].reduce((sum, value) => sum + value, 0);
  const plannedPieceQuantity = [...planned.values()].reduce((sum, value) => sum + value, 0);
  if (bom.length && bomPanelQuantity !== requestedPartQuantity) {
    blockers.push(`BOM inconsistente: ${bomPanelQuantity} painel(is) contra ${requestedPartQuantity} peça(s) de engenharia.`);
  }

  return {
    valid: blockers.length === 0,
    blockers,
    summary: {
      requestedParts: requestedPartQuantity,
      plannedPieces: plannedPieceQuantity,
      bomPanelQuantity,
    },
  };
}
