import { describe, expect, it } from 'vitest';
import { buildWorkshopPacket } from './workshopPacket';

describe('buildWorkshopPacket', () => {
  it('organizes parts, sheets and hardware while preserving project traceability', () => {
    const packet = buildWorkshopPacket({
      projectId: 'project-1',
      environmentId: 'env-2',
      versionId: 'version-3',
      correlationId: 'corr-4',
      furnitureId: 'moveis-cozinha-1',
      furnitureName: 'Cozinha',
      modules: [{ id: 'mod-bancada', name: 'Módulo bancada' }],
      parts: [
        { id: 'mod-bancada:lateral', name: 'Lateral esquerda', width: 600, height: 720, quantity: 2, material: 'MDP 18mm', moduleId: 'mod-bancada' },
      ],
      cutPlan: [{ code: 'CHAPA-01', width: 2750, height: 1830, material: 'MDP 18mm', pieces: [{ id: 'mod-bancada:lateral#1', x: 10, y: 20, width: 600, height: 720 }] }],
      bom: [{ code: 'PF-15', name: 'Parafuso', category: 'hardware', quantity: 8, unit: 'un' }],
    });

    expect(packet.traceability).toEqual({ projectId: 'project-1', environmentId: 'env-2', versionId: 'version-3', correlationId: 'corr-4', furnitureId: 'moveis-cozinha-1' });
    expect(packet.modules[0].partCodes).toContain('mod-bancada:lateral');
    expect(packet.parts[0].sheetCode).toBe('CHAPA-01');
    expect(packet.hardware[0]).toMatchObject({ code: 'PF-15', quantity: 8 });
    expect(packet.sequence).toEqual(['separar chapas', 'etiquetar peças', 'separar ferragens', 'montar por módulo', 'conferir com o projeto']);
  });
});
