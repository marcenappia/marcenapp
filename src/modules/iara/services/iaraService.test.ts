import { describe, it, expect, vi } from 'vitest';
import { iaraService } from './iaraService';

describe('IARA Orchestration Logic', () => {
  it('should generate a valid RENDER_REQUEST command for studio', async () => {
    const prompt = "Desenhe uma cozinha industrial";
    const decision = await iaraService.interpretCommand(prompt);
    
    expect(decision.type).toBe('RENDER_REQUEST');
    expect(decision.command).toBeDefined();
    expect(decision.command?.target).toBe('studio');
    expect(decision.command?.action).toBe('GENERATE_VISUAL');
  });

  it('should generate a valid BUDGET_REQUEST command for estela', async () => {
    const prompt = "Qual o valor desse projeto?";
    const decision = await iaraService.interpretCommand(prompt);
    
    expect(decision.type).toBe('BUDGET_REQUEST');
    expect(decision.command?.target).toBe('estela');
  });

  it('should return CHAT type for general queries', async () => {
    const prompt = "Como você está hoje?";
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
      const p = "render kitchen";
      const c = "base64data";
      expect(generateKey(p, c)).toBe(generateKey(p, c));
    });

    it('should generate different keys for different prompts', () => {
      expect(generateKey("prompt 1")).not.toBe(generateKey("prompt 2"));
    });
  });

  describe('Contract Validation', () => {
... keep existing code
