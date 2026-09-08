import { describe, expect, it } from 'vitest';
import { materialMatches } from './materialCatalog';

describe('materialMatches', () => {
  it('encontra padrões por nome e fabricante', () => {
    expect(materialMatches('Nuvem', 'todos', 'todos').map(item => item.supplier)).toContain('Guararapes');
    expect(materialMatches('Duratex', 'todos', 'Duratex').length).toBeGreaterThan(0);
  });

  it('filtra brancos sem misturar madeirados', () => {
    const results = materialMatches('', 'branco', 'todos');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(item => item.category === 'branco')).toBe(true);
  });
});
