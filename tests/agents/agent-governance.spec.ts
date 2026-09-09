import { describe, expect, it } from 'vitest';
import { agents, getAgent } from '../../src/lib/agents/registry';

describe('MARCENAPP agent architecture contract', () => {
  it('keeps the canonical 20-agent bank unique and addressable', () => {
    expect(agents).toHaveLength(20);

    const ids = agents.map((agent) => agent.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(getAgent(id).id).toBe(id);
    }
  });

  it('keeps capabilities unique across the specialist bank', () => {
    const capabilities = agents.flatMap((agent) => agent.capabilities);
    expect(new Set(capabilities).size).toBe(capabilities.length);
  });

  it('contains no unknown dependencies', () => {
    const ids = new Set(agents.map((agent) => agent.id));

    for (const agent of agents) {
      for (const dependency of agent.dependencies) {
        expect(ids.has(dependency), `${agent.id} -> ${dependency}`).toBe(true);
        expect(dependency).not.toBe(agent.id);
      }
    }
  });

  it('has an acyclic dependency graph', () => {
    const graph = new Map(agents.map((agent) => [agent.id, agent.dependencies]));
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: string): void => {
      if (visiting.has(id)) throw new Error(`Ciclo de dependência detectado em ${id}`);
      if (visited.has(id)) return;

      visiting.add(id);
      for (const dependency of graph.get(id) ?? []) visit(dependency);
      visiting.delete(id);
      visited.add(id);
    };

    for (const agent of agents) visit(agent.id);
    expect(visited.size).toBe(agents.length);
  });

  it('preserves critical specialist responsibilities', () => {
    expect(getAgent('render').capabilities).toContain('render.from.validated.package');
    expect(getAgent('cut_audit').capabilities).toContain('cut.overlap.validate');
    expect(getAgent('budget').capabilities).toContain('estimate.calculate');
    expect(getAgent('approval').capabilities).toContain('approval.record');
    expect(getAgent('production').capabilities).toContain('production.cutlist.generate');
  });
});
