import { describe, expect, it } from 'vitest';
import type { EnvironmentAnalysis } from '../types';
import { buildEnvironmentGeometry, validateEnvironmentGeometry } from './environmentGeometry';

const analysis: EnvironmentAnalysis = {
  version: '1.0',
  roomType: 'closet',
  perspective: { description: 'canto interno', confidence: 'high' },
  elements: [
    { id: 'wall-left', type: 'wall', label: 'Parede esquerda', widthM: 2.4, confidence: 'high', measurementStatus: 'confirmed' },
    { id: 'window-1', type: 'window', label: 'Janela', widthM: 1, heightM: 0.8, confidence: 'high', measurementStatus: 'confirmed' },
  ],
  missingMeasurements: [],
  warnings: [],
  analyzedAt: new Date().toISOString(),
  confirmedByIara: false,
};

describe('environmentGeometry', () => {
  it('builds wall widths from the environment analysis', () => {
    const geometry = buildEnvironmentGeometry(analysis);
    expect(geometry.wallWidthsM['wall-left']).toBe(2.4);
    expect(geometry.openings[0].elementId).toBe('window-1');
  });

  it('accepts an opening that fits inside its wall', () => {
    const geometry = buildEnvironmentGeometry(analysis);
    geometry.ceilingHeightM = 2.6;
    geometry.openings[0].wallElementId = 'wall-left';
    geometry.openings[0].offsetFromWallStartM = 0.7;
    expect(validateEnvironmentGeometry(analysis, geometry).errors).toEqual([]);
  });

  it('rejects an opening that exceeds the wall', () => {
    const geometry = buildEnvironmentGeometry(analysis);
    geometry.ceilingHeightM = 2.6;
    geometry.openings[0].wallElementId = 'wall-left';
    geometry.openings[0].offsetFromWallStartM = 1.8;
    expect(validateEnvironmentGeometry(analysis, geometry).valid).toBe(false);
    expect(validateEnvironmentGeometry(analysis, geometry).errors.join(' ')).toContain('ultrapassa');
  });
});
