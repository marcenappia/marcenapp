export type WorkshopPart = {
  code: string;
  label: string;
  furnitureId: string;
  furnitureName: string;
  moduleId?: string;
  moduleName?: string;
  role?: string;
  width: number;
  height: number;
  quantity: number;
  material: string;
  sheetCode?: string;
  position?: { x: number; y: number; rotated?: boolean };
};

export type WorkshopLabel = {
  id: string;
  text: string;
  partCode: string;
  furnitureId: string;
  furnitureName: string;
  moduleId?: string;
  moduleName?: string;
  role?: string;
  width: number;
  height: number;
  material: string;
  sheetCode: string;
  position: { x: number; y: number; rotated?: boolean };
};

export type WorkshopSheet = {
  code: string;
  width: number;
  height: number;
  material: string;
  pieces: Array<{ code: string; x: number; y: number; width: number; height: number; rotated?: boolean }>;
};

export type WorkshopHardware = {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
};

export type WorkshopModule = {
  id: string;
  name: string;
  partCodes: string[];
  hardwareCodes: string[];
  sequence: number;
};

export type WorkshopPacket = {
  packetId: string;
  projectId?: string;
  environmentId?: string;
  versionId?: string;
  correlationId?: string;
  furnitureId: string;
  furnitureName: string;
  source: 'engineering' | 'project';
  sequence: string[];
  modules: WorkshopModule[];
  parts: WorkshopPart[];
  labels: WorkshopLabel[];
  sheets: WorkshopSheet[];
  hardware: WorkshopHardware[];
  traceability: {
    projectId?: string;
    environmentId?: string;
    versionId?: string;
    correlationId?: string;
    furnitureId: string;
  };
};

type RecordValue = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function positiveInt(value: unknown, fallback = 1): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function positive(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function codeOf(value: RecordValue): string {
  return text(value.code ?? value.id);
}

/**
 * Converts the already validated engineering/cut/BOM package into a floor-ready
 * workshop artifact. It does not invent geometry, hardware or assembly rules.
 */
export function buildWorkshopPacket(input: {
  projectId?: string;
  environmentId?: string;
  versionId?: string;
  correlationId?: string;
  furnitureId?: string;
  furnitureName?: string;
  parts: RecordValue[];
  cutPlan: RecordValue[];
  bom?: RecordValue[];
  modules?: RecordValue[];
}): WorkshopPacket {
  const furnitureId = text(input.furnitureId) || 'furniture-1';
  const furnitureName = input.furnitureName || 'Móvel sem nome';
  const moduleRecords = input.modules ?? [];
  const partRecords = input.parts;

  const moduleMap = new Map<string, WorkshopModule>();
  moduleRecords.forEach((module, index) => {
    const id = codeOf(module);
    if (!id) return;
    moduleMap.set(id, { id, name: text(module.name) || id, partCodes: [], hardwareCodes: [], sequence: index + 1 });
  });

  const parts: WorkshopPart[] = partRecords.map((part) => {
    const code = codeOf(part);
    const moduleId = text(part.moduleId);
    const module = moduleId ? moduleMap.get(moduleId) : undefined;
    const workshopPart: WorkshopPart = {
      code,
      label: text(part.label) || text(part.name) || code,
      furnitureId,
      furnitureName,
      ...(moduleId ? { moduleId } : {}),
      ...(module ? { moduleName: module.name } : {}),
      ...(text(part.role) ? { role: text(part.role) } : {}),
      width: positive(part.width),
      height: positive(part.height),
      quantity: positiveInt(part.quantity),
      material: text(part.material),
    };
    if (module) module.partCodes.push(code);
    return workshopPart;
  });

  const partByCode = new Map(parts.map((part) => [part.code, part]));
  const labels: WorkshopLabel[] = [];
  const sheets: WorkshopSheet[] = input.cutPlan.map((sheet) => {
    const sheetCode = codeOf(sheet);
    const pieces = Array.isArray(sheet.pieces) ? sheet.pieces as RecordValue[] : [];
    const normalizedPieces = pieces.map((piece, index) => {
      const rawCode = codeOf(piece);
      const code = rawCode.split('#')[0];
      const part = partByCode.get(code);
      const position = { x: Number(piece.x), y: Number(piece.y), ...(piece.rotated !== undefined ? { rotated: Boolean(piece.rotated) } : {}) };
      if (part) {
        if (!part.sheetCode) {
          part.sheetCode = sheetCode;
          part.position = position;
        }
        labels.push({
          id: `${code}#${index + 1}`,
          text: `${part.label} | ${part.width}×${part.height} mm | ${part.material}`,
          partCode: code,
          furnitureId,
          furnitureName,
          ...(part.moduleId ? { moduleId: part.moduleId } : {}),
          ...(part.moduleName ? { moduleName: part.moduleName } : {}),
          ...(part.role ? { role: part.role } : {}),
          width: part.width,
          height: part.height,
          material: part.material,
          sheetCode,
          position,
        });
      }
      return { code, x: Number(piece.x), y: Number(piece.y), width: positive(piece.width), height: positive(piece.height), ...(piece.rotated !== undefined ? { rotated: Boolean(piece.rotated) } : {}) };
    });
    return { code: sheetCode, width: positive(sheet.width), height: positive(sheet.height), material: text(sheet.material), pieces: normalizedPieces };
  });

  const hardwareByCode = new Map<string, WorkshopHardware>();
  for (const item of input.bom ?? []) {
    if (text(item.category) !== 'hardware') continue;
    const code = codeOf(item);
    if (!code) continue;
    const current = hardwareByCode.get(code);
    if (current) current.quantity += positiveInt(item.quantity, 0);
    else hardwareByCode.set(code, { code, name: text(item.name) || code, quantity: positiveInt(item.quantity, 0), unit: text(item.unit) || 'un', ...(text(item.category) ? { category: text(item.category) } : {}) });
  }

  const hardware = [...hardwareByCode.values()];
  const sequence = ['separar chapas', 'etiquetar peças', 'separar ferragens', 'montar por módulo', 'conferir com o projeto'];

  return {
    packetId: `wp-${furnitureId}-${input.versionId || input.correlationId || 'current'}`,
    projectId: input.projectId,
    environmentId: input.environmentId,
    versionId: input.versionId,
    correlationId: input.correlationId,
    furnitureId,
    furnitureName,
    source: 'engineering',
    sequence,
    modules: [...moduleMap.values()],
    parts,
    labels,
    sheets,
    hardware,
    traceability: { projectId: input.projectId, environmentId: input.environmentId, versionId: input.versionId, correlationId: input.correlationId, furnitureId },
  };
}
