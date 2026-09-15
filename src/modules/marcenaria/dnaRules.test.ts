import { describe, expect, it } from 'vitest';
import { dnaContext, dnaPriority, resolveDnaRules, type DnaRule } from './dnaRules';

const rule = (overrides: Partial<DnaRule>): DnaRule => ({
  id: crypto.randomUUID(),
  user_id: 'user',
  category: 'construcao',
  rule_key: 'folga_porta',
  rule_value: { text: '2 mm' },
  status: 'defined',
  source: 'manual',
  confidence: 1,
  version: 1,
  effective_from: new Date().toISOString(),
  created_by: 'user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('marcenaria DNA', () => {
  it('prioriza exceção de projeto sobre regra definida, aprendida e sugerida', () => {
    expect(dnaPriority(rule({ status: 'project_exception' }))).toBeGreaterThan(dnaPriority(rule({ status: 'defined' })));
    expect(dnaPriority(rule({ status: 'defined' }))).toBeGreaterThan(dnaPriority(rule({ status: 'learned' })));
    expect(dnaPriority(rule({ status: 'learned' }))).toBeGreaterThan(dnaPriority(rule({ status: 'suggested' })));
  });

  it('mantém apenas a regra efetiva por chave e preserva a versão mais nova no mesmo nível', () => {
    const resolved = resolveDnaRules([
      rule({ id: 'old', version: 1 }),
      rule({ id: 'new', version: 2 }),
      rule({ id: 'exception', status: 'project_exception', version: 1 }),
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('exception');
  });

  it('produz contexto explícito para a IARA sem transformar sugestão em regra', () => {
    const context = dnaContext([rule({ status: 'defined' }), rule({ id: 'suggested', status: 'suggested', rule_key: 'cor' })]);
    expect(context.priority).toBe('project_exception > defined > learned > suggested');
    expect(context.rules).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'folga_porta', status: 'defined' })]));
  });
});
