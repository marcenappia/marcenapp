import { describe, expect, it } from 'vitest';
import { buildTechnicalStructure } from './projectTechnicalModel';
import type { ProjectData } from '@/modules/projetos/types';

const project: ProjectData = {
  id: 'p1', width: 2.5, height: 2.8, depth: 0.6, modules: 1, drawers: 0, doors: 6,
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
  });
});