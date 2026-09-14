import { describe, expect, it, vi } from 'vitest';

const callAIContractClause = vi.fn();

vi.mock('@/services/ai', () => ({ callAIContractClause }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ ilike: vi.fn(() => ({ maybeSingle: vi.fn() })), order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: vi.fn() })) })) })) })),
    })),
  },
}));
vi.mock('@/store/useStudioStore', () => ({ useStudioStore: { getState: () => ({ enqueueCommand: vi.fn(() => 'studio-test') }) } }));
vi.mock('@/store/useMarcenappOS', () => ({ useMarcenappOS: { getState: () => ({ dispatchCommand: vi.fn() }) } }));

describe('gerarContrato tool', () => {
  it('returns ok=false when AI fails', async () => {
    const { executeToolCall } = await import('@/core/toolRegistry');
    callAIContractClause.mockRejectedValueOnce(new Error('provider failed'));

    const result = await executeToolCall('gerarContrato', {
      clienteNome: 'Cliente Teste',
      clausulasExtras: ['Parede torta'],
    }, { userId: 'user-a' });

    expect(result.ok).toBe(false);
  });

  it('returns ok=false when the server result is empty', async () => {
    const { executeToolCall } = await import('@/core/toolRegistry');
    callAIContractClause.mockResolvedValueOnce({ id: 'clause-1', text: '', model: 'test', operationType: 'gerarContrato' });

    const result = await executeToolCall('gerarContrato', {
      clienteNome: 'Cliente Teste',
      clausulasExtras: ['Risco hidráulico'],
    }, { userId: 'user-a' });

    expect(result.ok).toBe(false);
  });

  it('returns ok=true only after every requested clause succeeds', async () => {
    const { executeToolCall } = await import('@/core/toolRegistry');
    callAIContractClause
      .mockResolvedValueOnce({ id: 'clause-1', text: 'Cláusula um', model: 'test', operationType: 'gerarContrato' })
      .mockResolvedValueOnce({ id: 'clause-2', text: 'Cláusula dois', model: 'test', operationType: 'gerarContrato' });

    const result = await executeToolCall('gerarContrato', {
      clienteNome: 'Cliente Teste',
      valor: 1000,
      prazoDias: 30,
      clausulasExtras: ['Parede torta', 'Risco hidráulico'],
    }, { userId: 'user-a' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { clausulasGeradas: number; clausulas: string[] };
      expect(data.clausulasGeradas).toBe(2);
      expect(data.clausulas).toEqual(['Cláusula um', 'Cláusula dois']);
    }
  });
});
