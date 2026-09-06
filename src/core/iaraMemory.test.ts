import { describe, expect, it } from 'vitest';
import { createIaraMemory, getConfirmedMeasurements, getMeasurementEvidence, rememberMeasurements, rememberFact, resolveIaraConflict } from './iaraMemory';

describe('iaraMemory', () => {
  it('mantém medidas confirmadas como evidência', () => {
    const memory = rememberMeasurements(createIaraMemory(), { width: 2.4, height: 2.6, depth: 0.6 }, 'CONFIRMADO', 'usuario', '2026-09-06T00:00:00.000Z');
    expect(getMeasurementEvidence(memory)).toBe('confirmed');
    expect(getConfirmedMeasurements(memory)).toEqual({ width: 2.4, height: 2.6, depth: 0.6 });
  });

  it('não promove estimativa para confirmação', () => {
    const memory = rememberMeasurements(createIaraMemory(), { width: 2.4, height: 2.6, depth: 0.6 }, 'ESTIMADO', 'studio');
    expect(getMeasurementEvidence(memory)).toBe('estimated');
    expect(getConfirmedMeasurements(memory)).toEqual({ width: undefined, height: undefined, depth: undefined });
  });

  it('detecta conflito quando uma medida confirmada muda para outra confirmação', () => {
    let memory = rememberMeasurements(createIaraMemory(), { width: 2.4 }, 'CONFIRMADO', 'usuario', '2026-09-06T00:00:00.000Z');
    memory = rememberFact(memory, { key: 'width', label: 'Largura', value: 2.5, status: 'CONFIRMADO', source: 'studio', now: '2026-09-06T01:00:00.000Z' });
    expect(memory.conflicts).toHaveLength(1);
    expect(memory.conflicts[0]).toMatchObject({ key: 'width', confirmedValue: 2.4, newValue: 2.5, resolved: false });
  });

  it('resolve conflito mantendo o valor confirmado anterior', () => {
    let memory = rememberMeasurements(createIaraMemory(), { width: 2.4 }, 'CONFIRMADO', 'usuario', '2026-09-06T00:00:00.000Z');
    memory = rememberFact(memory, { key: 'width', label: 'Largura', value: 2.5, status: 'CONFIRMADO', source: 'studio', now: '2026-09-06T01:00:00.000Z' });
    memory = resolveIaraConflict(memory, memory.conflicts[0].id, 'confirmed', '2026-09-06T02:00:00.000Z');
    expect(memory.conflicts[0].resolved).toBe(true);
    expect(memory.facts.find(f => f.key === 'width')?.value).toBe(2.4);
  });

  it('resolve conflito aceitando explicitamente o novo valor', () => {
    let memory = rememberMeasurements(createIaraMemory(), { width: 2.4 }, 'CONFIRMADO', 'usuario', '2026-09-06T00:00:00.000Z');
    memory = rememberFact(memory, { key: 'width', label: 'Largura', value: 2.5, status: 'CONFIRMADO', source: 'studio', now: '2026-09-06T01:00:00.000Z' });
    memory = resolveIaraConflict(memory, memory.conflicts[0].id, 'new', '2026-09-06T02:00:00.000Z');
    expect(memory.conflicts[0].resolved).toBe(true);
    expect(memory.facts.find(f => f.key === 'width')?.value).toBe(2.5);
    expect(memory.facts.find(f => f.key === 'width')?.source).toBe('usuario');
  });
});
