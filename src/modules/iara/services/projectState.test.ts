import { describe, expect, it } from 'vitest';
import { applyProjectStatePatch, createProjectStateFromConversation, emptyProjectState, extractProjectStatePatch } from './projectState';

describe('projectState', () => {
  it('extracts named dimensions from a natural language turn', () => {
    const patch = extractProjectStatePatch('Quero um armário de 2,50 m de altura, 1,60 m de largura e 45 cm de profundidade.');
    expect(patch.intent).toBe('create_project');
    expect(patch.project?.dimensions).toEqual({ width: 1600, height: 2500, depth: 450 });
  });

  it('keeps facts across turns instead of replacing the whole project', () => {
    const state = createProjectStateFromConversation([
      'Quero um armário de 1,60 m de largura e 2,50 m de altura.',
      'A profundidade é 45 cm.',
    ]);
    expect(state.project.dimensions).toEqual({ width: 1600, height: 2500, depth: 450 });
    expect(state.sourceTurns).toBe(2);
  });

  it('stores separate component facts when the user describes a bancada and armário superior', () => {
    const state = createProjectStateFromConversation([
      'Quero um armário de 2,50 m de altura, 1,60 m de largura e 45 cm de profundidade. Essa é a bancada. No armário superior, a profundidade vai ser de 35 cm e a altura de 85 cm.',
    ]);
    const upper = state.components.find(component => component.type === 'armario_superior');
    expect(upper?.dimensions).toMatchObject({ depth: 350, height: 850 });
  });

  it('merges component updates by stable id', () => {
    const first = applyProjectStatePatch(emptyProjectState, {
      components: [{ id: 'door-3', type: 'door', dimensions: { height: 700 }, properties: {} }],
    });
    const second = applyProjectStatePatch(first, {
      components: [{ id: 'door-3', type: 'door', dimensions: { width: 400 }, properties: { material: 'vidro' } }],
    });
    expect(second.components).toHaveLength(1);
    expect(second.components[0].dimensions).toEqual({ height: 700, width: 400 });
    expect(second.components[0].properties).toEqual({ material: 'vidro' });
  });

  it('does not invent dimensions when a turn contains no measurable value', () => {
    const patch = extractProjectStatePatch('Agora quero deixar o projeto mais moderno.');
    expect(patch.project?.dimensions).toEqual({});
  });
});
