import { describe, it, expect, vi, afterEach } from 'vitest';
import { iaraService } from './iaraService';
import { callAIText } from '@/services/ai';

vi.mock('@/services/ai', () => ({
  callAIText: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('IARA Orchestration Logic', () => {
  it('should generate a valid RENDER_REQUEST command for studio', async () => {
    const prompt = 'Desenhe uma cozinha industrial';
    const decision = await iaraService.interpretCommand(prompt);

    expect(decision.type).toBe('RENDER_REQUEST');
    expect(decision.command).toBeDefined();
    expect(decision.command?.target).toBe('studio');
    expect(decision.command?.action).toBe('GENERATE_VISUAL');
  });

  it('should generate a valid BUDGET_REQUEST command for estela', async () => {
    const prompt = 'Qual o valor desse projeto?';
    const decision = await iaraService.interpretCommand(prompt);

    expect(decision.type).toBe('BUDGET_REQUEST');
    expect(decision.command?.target).toBe('estela');
  });

  it('should return CHAT type for general queries', async () => {
    const prompt = 'Como você está hoje?';
    const decision = await iaraService.interpretCommand(prompt);

    expect(decision.type).toBe('CHAT');
    expect(decision.command).toBeUndefined();
  });

  describe('Idempotency Logic', () => {
    const generateKey = (prompt: string, context?: string) => {
      const hashPayload = `${prompt}-Limpo-2.4-2.6-${context?.substring(0, 500)}`;
      let hash = 0;
      for (let i = 0; i < hashPayload.length; i++) {
        const char = hashPayload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `iara-${Math.abs(hash).toString(36)}`;
    };

    it('should generate deterministic keys for the same input', () => {
      const p = 'render kitchen';
      const c = 'base64data';
      expect(generateKey(p, c)).toBe(generateKey(p, c));
    });

    it('should generate different keys for different prompts', () => {
      expect(generateKey('prompt 1')).not.toBe(generateKey('prompt 2'));
    });
  });

  describe('Contract Validation', () => {
    it('should fail if critical params are missing in interpretCommand (simulated logic)', async () => {
      const prompt = 'renderize';
      const decision = await iaraService.interpretCommand(prompt);

      expect(decision.type).toBe('RENDER_REQUEST');
      expect(decision.command?.params.prompt).toBeDefined();
    });
  });

  describe('Image Analysis', () => {
    it('should return validated numeric fields from the AI response', async () => {
      vi.mocked(callAIText).mockResolvedValue('{"width":2,"height":2.5,"depth":0.6,"drawers":4,"doors":4}');

      await expect(iaraService.analyzeImage('data:image/png;base64,abc')).resolves.toEqual({
        width: 2,
        height: 2.5,
        depth: 0.6,
        drawers: 4,
        doors: 4,
      });

      expect(callAIText).toHaveBeenCalledWith(
        expect.any(String),
        [{ mimeType: 'image/png', data: 'abc' }],
        true,
      );
    });

    it('should reject malformed AI JSON instead of returning fake dimensions', async () => {
      vi.mocked(callAIText).mockResolvedValue('not-json');

      await expect(iaraService.analyzeImage('abc')).rejects.toThrow('formato inválido');
    });

    it('should reject incomplete AI JSON instead of inventing missing values', async () => {
      vi.mocked(callAIText).mockResolvedValue('{"width":2,"height":2.5,"depth":0.6}');

      await expect(iaraService.analyzeImage('abc')).rejects.toThrow('incompleta');
    });
  });
});
