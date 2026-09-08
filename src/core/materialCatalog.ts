export type MaterialCategory = 'branco' | 'madeirado' | 'cinza' | 'colorido' | 'textura';

export interface MaterialCatalogItem {
  id: string;
  supplier: string;
  supplierUrl: string;
  name: string;
  category: MaterialCategory;
  thicknesses: number[];
  sheetWidth: number;
  sheetHeight: number;
  notes: string;
}

export const MDF_SUPPLIERS = [
  { name: 'Duratex', url: 'https://www.downloads.duratexmadeira.com.br/' },
  { name: 'Guararapes', url: 'https://www.guararapes.com.br/downloads/' },
  { name: 'Berneck', url: 'https://www.berneck.com.br/' },
  { name: 'Arauco', url: 'https://www.arauco.com/br/' },
] as const;

export const MDF_CATALOG: MaterialCatalogItem[] = [
  { id: 'duratex-branco-diamante', supplier: 'Duratex', supplierUrl: 'https://www.downloads.duratexmadeira.com.br/', name: 'Branco Diamante', category: 'branco', thicknesses: [6, 15, 18, 25], sheetWidth: 2750, sheetHeight: 1850, notes: 'Padrão claro para portas, caixas e interiores.' },
  { id: 'duratex-cinza-sagrado', supplier: 'Duratex', supplierUrl: 'https://www.downloads.duratexmadeira.com.br/', name: 'Cinza Sagrado', category: 'cinza', thicknesses: [6, 15, 18], sheetWidth: 2750, sheetHeight: 1850, notes: 'Cinza neutro para projetos contemporâneos.' },
  { id: 'duratex-noce-amendoa', supplier: 'Duratex', supplierUrl: 'https://www.downloads.duratexmadeira.com.br/', name: 'Noce Amêndoa', category: 'madeirado', thicknesses: [6, 15, 18], sheetWidth: 2750, sheetHeight: 1850, notes: 'Madeirado quente para portas e frentes.' },
  { id: 'guararapes-nuvem', supplier: 'Guararapes', supplierUrl: 'https://www.guararapes.com.br/downloads/', name: 'Nuvem', category: 'branco', thicknesses: [6, 9, 12, 15, 18, 25], sheetWidth: 2750, sheetHeight: 1850, notes: 'Coleção Offwhite, textura Matt.' },
  { id: 'guararapes-fresno-acores', supplier: 'Guararapes', supplierUrl: 'https://www.guararapes.com.br/downloads/', name: 'Fresno Açores', category: 'madeirado', thicknesses: [6, 18], sheetWidth: 2750, sheetHeight: 1850, notes: 'Madeirado para composições e frentes.' },
  { id: 'guararapes-mangue', supplier: 'Guararapes', supplierUrl: 'https://www.guararapes.com.br/downloads/', name: 'Mangue', category: 'colorido', thicknesses: [6, 9, 12, 15, 18, 25], sheetWidth: 2750, sheetHeight: 1850, notes: 'Tom terroso da linha Colors.' },
  { id: 'berneck-mdf-branco', supplier: 'Berneck', supplierUrl: 'https://www.berneck.com.br/', name: 'MDF Branco Berneck', category: 'branco', thicknesses: [9, 12, 15, 18, 22, 25], sheetWidth: 2750, sheetHeight: 1850, notes: 'Base neutra; confirmar acabamento e padrão no catálogo atual.' },
];

export const materialMatches = (query: string, category: MaterialCategory | 'todos', supplier: string | 'todos') => {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  return MDF_CATALOG.filter(item => {
    const matchesText = !normalized || `${item.name} ${item.supplier} ${item.category} ${item.notes}`.toLocaleLowerCase('pt-BR').includes(normalized);
    const matchesCategory = category === 'todos' || item.category === category;
    const matchesSupplier = supplier === 'todos' || item.supplier === supplier;
    return matchesText && matchesCategory && matchesSupplier;
  });
};
