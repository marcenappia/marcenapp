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

  describe('Contract Validation', () => {
    it('should fail if critical params are missing in interpretCommand (simulated logic)', async () => {
      // Testando a robustez do contrato de comando
      const prompt = "renderize";
      const decision = await iaraService.interpretCommand(prompt);
      
      expect(decision.type).toBe('RENDER_REQUEST');
      expect(decision.command?.params.prompt).toBeDefined();
    });
  });
});
