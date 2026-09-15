import { engineerBasicCarcass, type EngineeredPart, type EngineeringResult, type FurnitureEngineeringSpec } from './engineering';

export type FurnitureModuleSpec = {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  quantity?: number;
  material: string;
  grainSensitive?: boolean;
  door?: DoorSpec;
  drawer?: DrawerSpec;
  hardware?: HardwareSpec[];
};

export type DoorSpec = {
  count: number;
  frontWidth: number;
  frontHeight: number;
  thickness?: number;
  material?: string;
  grainSensitive?: boolean;
  hardware?: HardwareSpec[];
};

export type DrawerSpec = {
  count: number;
  frontWidth: number;
  frontHeight: number;
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  material: string;
  grainSensitive?: boolean;
  hardware?: HardwareSpec[];
};

export type HardwareSpec = {
  code: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
};

export type FurniturePackageSpec = FurnitureEngineeringSpec & {
  modules?: FurnitureModuleSpec[];
  hardware?: HardwareSpec[];
};

export type BomItem = {
  code: string;
  name: string;
  category: 'panel' | 'hardware';
  quantity: number;
  unit: string;
  material?: string;
  width?: number;
  height?: number;
  role?: EngineedRole;
};

type EngineedRole = EngineeredPart['role'] | 'door' | 'drawer-front' | 'drawer-box';

export type FurniturePackageResult = EngineeringResult & {
  modules: FurnitureModuleSpec[];
  hardware: HardwareSpec[];
  bom: BomItem[];
};

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function integerPositive(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function addHardware(target: HardwareSpec[], items: HardwareSpec[] | undefined, blockers: string[]): void {
  for (const item of items ?? []) {
    if (!item.code || !item.name || !integerPositive(item.quantity)) {
      blockers.push(`Ferragem inválida: ${item.code || item.name || 'sem código'}.`);
      continue;
    }
    target.push({ ...item, unit: item.unit ?? 'un' });
  }
}

function addPart(target: EngineeredPart[], part: EngineeredPart): void {
  const existing = target.find((item) => item.id === part.id && item.material === part.material && item.width === part.width && item.height === part.height);
  if (existing) existing.quantity += part.quantity;
  else target.push(part);
}

function buildBom(parts: EngineeredPart[], hardware: HardwareSpec[]): BomItem[] {
  const bom: BomItem[] = parts.map((part) => ({
    code: part.id,
    name: part.name,
    category: 'panel',
    quantity: part.quantity,
    unit: 'un',
    material: part.material,
    width: part.width,
    height: part.height,
    role: part.role,
  }));

  const hardwareByCode = new Map<string, BomItem>();
  for (const item of hardware) {
    const current = hardwareByCode.get(item.code);
    if (current) current.quantity += item.quantity;
    else hardwareByCode.set(item.code, {
      code: item.code,
      name: item.name,
      category: 'hardware',
      quantity: item.quantity,
      unit: item.unit ?? 'un',
    });
  }
  return [...bom, ...hardwareByCode.values()];
}

/**
 * Builds a fabrication package only from explicit geometry and explicit construction rules.
 * It never invents door gaps, overlays, drawer clearances, slides or hinge quantities.
 */
export function buildFurniturePackage(spec: FurniturePackageSpec): FurniturePackageResult {
  const baseSpec: FurnitureEngineeringSpec = { ...spec, doorCount: 0, drawerCount: 0 };
  const engineered = engineerBasicCarcass(baseSpec);
  const blockers = [...engineered.blockers];
  const assumptions = [...engineered.assumptions];
  const parts = [...engineered.parts];
  const hardware: HardwareSpec[] = [];
  const modules = spec.modules ?? [];

  addHardware(hardware, spec.hardware, blockers);

  for (const module of modules) {
    const quantity = module.quantity ?? 1;
    if (!module.id || !module.name || !positive(module.width) || !positive(module.height) || !positive(module.depth) || !integerPositive(quantity) || !module.material) {
      blockers.push(`Módulo inválido: ${module.id || module.name || 'sem identificador'}.`);
      continue;
    }

    const grainSensitive = module.grainSensitive !== false;
    addPart(parts, {
      id: `${module.id}:estrutura`, name: `${module.name} - estrutura`, width: module.width, height: module.depth,
      quantity, material: module.material, grainSensitive, allowRotation: !grainSensitive, role: 'shelf',
    });

    addHardware(hardware, module.hardware, blockers);

    if (module.door) {
      const door = module.door;
      if (!integerPositive(door.count) || !positive(door.frontWidth) || !positive(door.frontHeight)) {
        blockers.push(`Porta inválida no módulo ${module.id}: dimensões da frente e quantidade são obrigatórias.`);
      } else {
        const material = door.material ?? module.material;
        addPart(parts, {
          id: `${module.id}:porta`, name: `${module.name} - porta`, width: door.frontWidth, height: door.frontHeight,
          quantity: door.count * quantity, material, grainSensitive: door.grainSensitive !== false, allowRotation: door.grainSensitive === false, role: 'top',
        });
        addHardware(hardware, door.hardware, blockers);
      }
    }

    if (module.drawer) {
      const drawer = module.drawer;
      if (!integerPositive(drawer.count) || !positive(drawer.frontWidth) || !positive(drawer.frontHeight) || !positive(drawer.boxWidth) || !positive(drawer.boxHeight) || !positive(drawer.boxDepth) || !drawer.material) {
        blockers.push(`Gaveta inválida no módulo ${module.id}: dimensões da frente e da caixa são obrigatórias.`);
      } else {
        addPart(parts, {
          id: `${module.id}:gaveta-frente`, name: `${module.name} - frente de gaveta`, width: drawer.frontWidth, height: drawer.frontHeight,
          quantity: drawer.count * quantity, material: module.material, grainSensitive: drawer.grainSensitive !== false, allowRotation: drawer.grainSensitive === false, role: 'top',
        });
        addPart(parts, {
          id: `${module.id}:gaveta-caixa`, name: `${module.name} - caixa de gaveta`, width: drawer.boxWidth, height: drawer.boxDepth,
          quantity: drawer.count * quantity, material: drawer.material, grainSensitive: drawer.grainSensitive !== false, allowRotation: drawer.grainSensitive === false, role: 'bottom',
        });
        assumptions.push(`Caixa de gaveta ${module.id} registrada com dimensões explícitas; folgas, usinagem e montagem não foram inventadas.`);
        addHardware(hardware, drawer.hardware, blockers);
      }
    }
  }

  return { ...engineered, parts, modules, hardware, bom: buildBom(parts, hardware), assumptions, blockers };
}
