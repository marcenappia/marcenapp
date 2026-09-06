import { describe, expect, it } from 'vitest';
import { createCutIntegrationPayload } from './cutIntegration';
import { serializeCutPlanCsv, serializeCutPlanJson } from './cutExport';

describe('cut export', () => {
  const payload = createCutIntegrationPayload({
    projectId: 'p1',
    projectName: 'Cozinha',
    sheet: { width: 2730, height: 1830, thickness: 15, material: 'white' },
    kerf: 3,
    parts: [{
      id: '12', name: 'Lateral, esquerda', width: 700, height: 500,
      quantity: 2, x: 0, y: 0, rotated: false, grain: 'vertical',
    }],
  });

  it('gera JSON versionado', () => {
    const json = serializeCutPlanJson(payload);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(parsed.project.name).toBe('Cozinha');
    expect(parsed.parts).toHaveLength(1);
  });

  it('gera CSV com cabeçalho e escape de vírgula', () => {
    const csv = serializeCutPlanCsv(payload);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('peca');
    expect(lines[1]).toContain('"Lateral, esquerda"');
    expect(lines[1]).toContain('vertical');
  });
});
