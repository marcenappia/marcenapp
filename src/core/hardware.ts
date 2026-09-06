export type HardwareCategory = 'gaveta' | 'porta' | 'acabamento';

export interface HardwareItem {
  id: string;
  name: string;
  category: HardwareCategory;
  quantity: number;
  unit: string;
  note?: string;
}

export interface HardwareProject {
  drawers?: number;
  doors?: number;
  handleType?: string;
}

const positiveInt = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));

export function buildHardwareList(project: HardwareProject): HardwareItem[] {
  const drawers = positiveInt(project.drawers);
  const doors = positiveInt(project.doors);
  const items: HardwareItem[] = [];

  if (drawers > 0) {
    items.push({
      id: 'slides',
      name: 'Corrediça telescópica',
      category: 'gaveta',
      quantity: drawers,
      unit: 'pares',
      note: '1 par por gaveta',
    });
  }

  if (doors > 0) {
    items.push({
      id: 'hinges',
      name: 'Dobradiça 35 mm',
      category: 'porta',
      quantity: doors * 2,
      unit: 'un.',
      note: 'Base inicial: 2 por porta; revisar conforme altura/peso',
    });
  }

  if (doors + drawers > 0 && project.handleType !== 'none' && project.handleType !== 'cava') {
    items.push({
      id: 'handles',
      name: 'Puxador',
      category: 'acabamento',
      quantity: doors + drawers,
      unit: 'un.',
      note: '1 por frente/porta',
    });
  }

  return items;
}
