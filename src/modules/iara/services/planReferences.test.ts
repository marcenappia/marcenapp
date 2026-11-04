import { describe, expect, it } from 'vitest';
import { orderPlanReferences } from './planReferences';

const photo = (id: string) => ({ mimeType: 'image/jpeg', data: `photo-${id}`, kind: 'environment' });

describe('orderPlanReferences', () => {
  it('move a planta atual para a primeira posição quando ela já está na lista', () => {
    const refs = [photo('1'), photo('2'), { mimeType: 'image/png', data: 'atual', kind: 'plan' }, photo('3')];
    const ordered = orderPlanReferences(refs, 'atual');
    expect(ordered[0]).toEqual({ mimeType: 'image/png', data: 'atual', kind: 'plan' });
    expect(ordered.map((ref) => ref.data)).toEqual(['atual', 'photo-1', 'photo-2', 'photo-3']);
  });

  it('cria a referência da planta atual quando ela está ausente', () => {
    const ordered = orderPlanReferences([photo('1'), photo('2')], 'novo');
    expect(ordered[0]).toEqual({ mimeType: 'image/png', data: 'novo', kind: 'plan' });
    expect(ordered.map((ref) => ref.data)).toEqual(['novo', 'photo-1', 'photo-2']);
  });

  it('não duplica a planta atual', () => {
    const refs = [{ mimeType: 'image/png', data: 'atual', kind: 'plan' }, photo('1'), { mimeType: 'image/png', data: 'atual', kind: 'plan' }];
    const ordered = orderPlanReferences(refs, 'atual');
    expect(ordered.filter((ref) => ref.data === 'atual')).toHaveLength(1);
    expect(ordered.map((ref) => ref.data)).toEqual(['atual', 'photo-1']);
  });

  it('respeita o limite de oito referências', () => {
    const refs = Array.from({ length: 10 }, (_, index) => photo(String(index)));
    const ordered = orderPlanReferences(refs, 'atual');
    expect(ordered).toHaveLength(8);
    expect(ordered[0].data).toBe('atual');
  });
});
