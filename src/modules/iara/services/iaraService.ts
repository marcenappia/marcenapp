import { callAIText } from '@/services/ai';

export type InterpretationType = 'RENDER_REQUEST' | 'BUDGET_REQUEST' | 'CHAT';

export interface CommandPayload {
  target: 'studio' | 'portal' | 'estela' | 'chat';
  action: string;
  params: Record<string, any>;
  context?: any;
}

export interface CommandDecision {
  type: InterpretationType;
  details: string;
  command?: CommandPayload;
}

export interface ProjectFactors {
  L: number;
  A: number;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  depth: number;
  drawers: number;
  doors: number;
}

export const iaraService = {
  /**
   * CAMADA COGNITIVA: Orquestra a intenção do usuário.
   * Não executa renderização, apenas decide qual subsistema deve agir.
   */
  interpretCommand: async (prompt: string): Promise<CommandDecision> => {
    const lower = prompt.toLowerCase();
    
    // Identifica se a intenção é visual/materialização
    if (lower.includes("render") || lower.includes("mostre") || lower.includes("veja") || lower.includes("materializa") || lower.includes("desenhe")) {
      return { 
        type: 'RENDER_REQUEST', 
        details: prompt,
        command: {
          target: 'studio',
          action: 'GENERATE_VISUAL',
          params: { prompt, style: 'realistic' }
        }
      };
    }
    
    // Identifica se a intenção é financeira
    if (lower.includes("quanto") || lower.includes("preço") || lower.includes("orçamento") || lower.includes("valor")) {
      return { 
        type: 'BUDGET_REQUEST', 
        details: prompt,
        command: {
          target: 'estela',
          action: 'CALCULATE_BUDGET',
          params: { prompt }
        }
      };
    }

    return { type: 'CHAT', details: prompt };
  },

  /**
   * Calcula o orçamento inteligente
   */
  calculateSmartBudget: (prompt: string, factors: ProjectFactors, decorStyle: string): string => {
    let baseVal = 1200;
    const lower = prompt.toLowerCase();
    if (lower.includes("cozinha")) baseVal = 6000;
    if (lower.includes("guarda-roupa")) baseVal = 3000;
    
    return (baseVal * factors.L * factors.A * (decorStyle === "Luxo" ? 1.5 : 1)).toFixed(2);
  },

  /**
   * Análise técnica de imagem via IA
   */
  analyzeImage: async (imageBase64: string): Promise<ImageAnalysis> => {
    const analysisPrompt = `Analyze this furniture strictly. Estimate dims (meters). Return ONLY valid JSON: {"width": 2.0, "height": 2.5, "depth": 0.6, "drawers": 4, "doors": 4}`;
    const text = await callAIText(analysisPrompt, [{ mimeType: 'image/png', data: imageBase64 }], true);
    
    try {
      return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
      console.error("Erro ao parsear análise de imagem:", e);
      return { width: 2.0, height: 2.5, depth: 0.6, drawers: 2, doors: 2 };
    }
  }
};
