import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useOrcamento } from './hooks/useOrcamento';

describe('useOrcamento', () => {
  const baseProject = {
    width: 2.4,
    height: 2.6,
    depth: 0.6,
    drawers: 4,
    doors: 6,
    internalMaterial: 'mdf15_white',
    externalMaterial: 'mdf18_white',
    backMaterial: 'mdf6_white',
    handleType: 'external',
    laborRate: 100,
    profitMargin: 35,
  };

  it('reflects depth and hardware in the total value', () => {
    const { result: base } = renderHook(() => useOrcamento(baseProject));
    const { result: deeper } = renderHook(() => useOrcamento({ ...baseProject, depth: 0.8 }));
    const { result: moreHardware } = renderHook(() => useOrcamento({ ...baseProject, drawers: 8, doors: 10 }));

    expect(deeper.current.calc.total).toBeGreaterThan(base.current.calc.total);
    expect(moreHardware.current.calc.total).toBeGreaterThan(base.current.calc.total);
    expect(base.current.formatBRL(1234.56)).toContain('R$');
  });
});
