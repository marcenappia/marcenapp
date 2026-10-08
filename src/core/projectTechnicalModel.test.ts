import { describe, expect, it } from 'vitest';
import { buildTechnicalStructure, projectDimensionToMm } from './projectTechnicalModel';
import type { ProjectData } from '@/modules/projetos/types';

const project: ProjectData = {
  id: 'p1', width: 2500, height: 2800, depth: 600, modules: 1, drawers: 0, doors: 6,
  internalMaterial: 'branco TX', externalMaterial: 'branco TX', backMaterial: '6mm',
  handleType: 'cava', profitMargin: 30, laborRate: 0,
};

describe('projectTechnicalModel', () => {
  it('creates a deterministic preliminary structure from confirmed project dimensions', () => {
    const structure = buildTechnicalStructure(project);
    expect(structure.status).toBe('needs_confirmation');
    expect(structure.dimensionsMm).toEqual({ width: 2500, height: 2800, depth: 600 });
    expect(structure.parts).toHaveLength(5);
    expect(structure.parts.find(part => part.id === 'porta')?.quantity).toBe(6);
    expect(structure.parts.find(part => part.id === 'porta')?.edgeBanding).toEqual({ top: true, right: true, bottom: true, left: true });
    expect(structure.components.find(component => component.id === 'laterais')?.quantity).toBe(2);
    expect(structure.components.find(component => component.id === 'portas')?.quantity).toBe(6);
    expect(structure.components.find(component => component.id === 'fundo')?.quantity).toBe(1);
    expect(structure.hardwareRequirements).toEqual([]);
    expect(structure.materialBindings).toEqual([]);
  });
});

describe('projectDimensionToMm', () => {
  it('normalizes legacy metre values and preserves millimetre values', () => {
    expect(projectDimensionToMm(2.5)).toBe(2500);
    expect(projectDimensionToMm(2.8)).toBe(2800);
    expect(projectDimensionToMm(0.6)).toBe(600);
    expect(projectDimensionToMm(2500)).toBe(2500);
    expect(projectDimensionToMm(2800)).toBe(2800);
    expect(projectDimensionToMm(600)).toBe(600);
  });
});
