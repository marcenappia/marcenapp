import { describe, expect, it } from 'vitest';
import { generatePartsFromProject } from './index';

const project = {
  width: 2.4,
  height: 2.6,
  depth: 0.6,
  modules: 3,
  doors: 6,
  drawers: 4,
};

describe('generatePartsFromProject', () => {
  it('creates a deterministic cutting list from the project dimensions', () => {
    const parts = generatePartsFromProject(project);

    expect(parts.map(({ name, qtd, mat }) => ({ name, qtd, mat }))).toEqual([
      { name: 'Lateral', qtd: 2, mat: 'white' },
      { name: 'Base / Topo', qtd: 2, mat: 'white' },
      { name: 'Prateleira', qtd: 6, mat: 'white' },
      { name: 'Fundo', qtd: 1, mat: 'white' },
      { name: 'Porta', qtd: 6, mat: 'wood' },
      { name: 'Frente de gaveta', qtd: 4, mat: 'wood' },
    ]);
    expect(parts.map(part => part.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('changes dimensions without accumulating old parts', () => {
    const wider = generatePartsFromProject({ ...project, width: 3 });

    expect(wider).toHaveLength(6);
    expect(wider[1].h).toBe(2964);
    expect(wider[0].id).toBe(1);
  });
});