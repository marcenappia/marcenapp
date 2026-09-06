import type { EnvironmentAnalysis, EnvironmentElement } from '../types';

export interface EnvironmentGeometry {
  roomWidthM: number | null;
  roomHeightM: number | null;
  roomDepthM: number | null;
  ceilingHeightM: number | null;
  wallWidthsM: Record<string, number>;
  openings: Array<{
    elementId: string;
    wallElementId: string | null;
    offsetFromWallStartM: number | null;
    sillHeightM: number | null;
  }>;
  source: 'photo' | 'user' | 'mixed';
  validatedAt?: string;
}

export interface GeometryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  criticalMissing: string[];
}

export const emptyEnvironmentGeometry = (): EnvironmentGeometry => ({
  roomWidthM: null,
  roomHeightM: null,
  roomDepthM: null,
  ceilingHeightM: null,
  wallWidthsM: {},
  openings: [],
  source: 'mixed',
});

const positive = (value: number | null | undefined) => value != null && Number.isFinite(value) && value > 0;

export function validateEnvironmentGeometry(
  analysis: EnvironmentAnalysis,
  geometry: EnvironmentGeometry,
): GeometryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalMissing: string[] = [];

  if (geometry.roomWidthM != null && !positive(geometry.roomWidthM)) errors.push('A largura do ambiente deve ser maior que zero.');
  if (geometry.roomHeightM != null && !positive(geometry.roomHeightM)) errors.push('A altura do ambiente deve ser maior que zero.');
  if (geometry.roomDepthM != null && !positive(geometry.roomDepthM)) errors.push('A profundidade do ambiente deve ser maior que zero.');
  if (geometry.ceilingHeightM != null && !positive(geometry.ceilingHeightM)) errors.push('O pé-direito deve ser maior que zero.');

  const walls = analysis.elements.filter((item) => item.type === 'wall');
  walls.forEach((wall) => {
    const width = geometry.wallWidthsM[wall.id];
    if (width != null && !positive(width)) errors.push(`${wall.label || 'Parede'}: largura inválida.`);
  });

  geometry.openings.forEach((opening) => {
    const element = analysis.elements.find((item) => item.id === opening.elementId);
    if (!element) return;
    const wallWidth = opening.wallElementId ? geometry.wallWidthsM[opening.wallElementId] : null;
    const openingWidth = element.widthM;
    if (opening.offsetFromWallStartM != null && opening.offsetFromWallStartM < 0) {
      errors.push(`${element.label}: posição inicial não pode ser negativa.`);
    }
    if (openingWidth != null && openingWidth <= 0) errors.push(`${element.label}: largura inválida.`);
    if (wallWidth != null && openingWidth != null && opening.offsetFromWallStartM != null && opening.offsetFromWallStartM + openingWidth > wallWidth + 0.001) {
      errors.push(`${element.label}: ultrapassa o comprimento da parede informada.`);
    }
    if (element.type === 'window' && opening.sillHeightM != null && opening.sillHeightM < 0) {
      errors.push(`${element.label}: altura do peitoril não pode ser negativa.`);
    }
  });

  if (!positive(geometry.ceilingHeightM)) criticalMissing.push('pé-direito');
  if (walls.some((wall) => !positive(geometry.wallWidthsM[wall.id]))) criticalMissing.push('largura das paredes relevantes');

  const openings = analysis.elements.filter((item) => ['window', 'door'].includes(item.type));
  openings.forEach((opening) => {
    if (!geometry.openings.some((item) => item.elementId === opening.id && item.offsetFromWallStartM != null)) {
      criticalMissing.push(`posição da ${opening.type === 'window' ? 'janela' : 'porta'}: ${opening.label}`);
    }
  });

  if (analysis.perspective.confidence !== 'high') {
    warnings.push('A perspectiva da foto não foi considerada de alta confiança; confirme as paredes no local.');
  }
  if (analysis.elements.some((item) => item.angleDeg != null && Math.abs((item.angleDeg || 0) - 90) > 3)) {
    warnings.push('Há pelo menos um encontro de paredes com ângulo diferente de 90°; não force um canto reto no projeto.');
  }

  return { valid: errors.length === 0, errors, warnings, criticalMissing: [...new Set(criticalMissing)] };
}

export function buildEnvironmentGeometry(analysis: EnvironmentAnalysis): EnvironmentGeometry {
  const base = emptyEnvironmentGeometry();
  const wallWidthsM: Record<string, number> = {};
  analysis.elements.forEach((item: EnvironmentElement) => {
    if (item.type === 'wall' && item.widthM != null && positive(item.widthM)) wallWidthsM[item.id] = item.widthM;
  });
  const openings = analysis.elements
    .filter((item) => item.type === 'window' || item.type === 'door')
    .map((item) => ({ elementId: item.id, wallElementId: null, offsetFromWallStartM: null, sillHeightM: item.type === 'window' ? null : null }));
  return { ...base, wallWidthsM, openings, source: 'photo' };
}
