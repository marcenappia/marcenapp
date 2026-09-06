import { describe, expect, it } from 'vitest';
import { buildHardwareList } from './hardware';

describe('buildHardwareList', () => {
  it('calcula corrediças, dobradiças e puxadores', () => {
    const result = buildHardwareList({ drawers: 4, doors: 6, handleType: 'external' });
    expect(result.find(item => item.id === 'slides')?.quantity).toBe(4);
    expect(result.find(item => item.id === 'hinges')?.quantity).toBe(12);
    expect(result.find(item => item.id === 'handles')?.quantity).toBe(10);
  });

  it('não cria puxadores para cava ou sem puxador', () => {
    expect(buildHardwareList({ drawers: 2, doors: 2, handleType: 'cava' }).some(item => item.id === 'handles')).toBe(false);
    expect(buildHardwareList({ drawers: 2, doors: 2, handleType: 'none' }).some(item => item.id === 'handles')).toBe(false);
  });
});
