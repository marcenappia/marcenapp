import type { CutIntegrationPayload } from './cutIntegration';

export function serializeCutPlanJson(payload: CutIntegrationPayload): string {
  return JSON.stringify(payload, null, 2);
}

const csvCell = (value: string | number | boolean | undefined) => {
  const text = value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function serializeCutPlanCsv(payload: CutIntegrationPayload): string {
  const header = ['projeto', 'chapa_largura_mm', 'chapa_altura_mm', 'espessura_mm', 'material', 'kerf_mm', 'peca_id', 'peca', 'largura_mm', 'altura_mm', 'quantidade', 'x_mm', 'y_mm', 'girada', 'veio'];
  const rows = payload.parts.map(part => [
    payload.project.name ?? payload.project.id,
    payload.sheet.width,
    payload.sheet.height,
    payload.sheet.thickness,
    payload.sheet.material,
    payload.kerf,
    part.id,
    part.name,
    part.width,
    part.height,
    part.quantity,
    part.x,
    part.y,
    part.rotated ?? false,
    part.grain ?? 'none',
  ]);

  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
