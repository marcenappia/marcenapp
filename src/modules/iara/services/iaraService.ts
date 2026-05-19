import { callAIText } from '@/services/ai';

export const iaraService = {
  /**
   * Interpreta o comando do usuário para decidir a próxima ação
   */
  interpretCommand: async (prompt: string, context?: any) => {
    // Aqui no futuro teríamos uma chamada ao GPT para decidir se é uma dúvida, 
    // um pedido de render, uma alteração técnica, etc.
    // Por enquanto simulamos a lógica
    const lower = prompt.toLowerCase();
    
    if (lower.includes("render") || lower.includes("mostre") || lower.includes("veja") || lower.includes("materializa")) {
      return { type: 'RENDER_REQUEST', details: prompt };
    }
    
    if (lower.includes("quanto") || lower.includes("preço") || lower.includes("orçamento")) {
      return { type: 'BUDGET_REQUEST', details: prompt };
    }

    return { type: 'CHAT', details: prompt };
  },

  /**
   * Calcula o orçamento inteligente (lógica que estava no hook)
   */
  calculateSmartBudget: (prompt: string, factors: any, decorStyle: string) => {
    let baseVal = 1200;
    const lower = prompt.toLowerCase();
    if (lower.includes("cozinha")) baseVal = 6000;
    if (lower.includes("guarda-roupa")) baseVal = 3000;
    
    return (baseVal * factors.L * factors.A * (decorStyle === "Luxo" ? 1.5 : 1)).toFixed(2);
  },

  /**
   * Simulação de OCR ou análise técnica de imagem
   */
  analyzeImage: async (imageBase64: string) => {
    const analysisPrompt = `Analyze this furniture strictly. Estimate dims (meters). Return ONLY valid JSON: {"width": 2.0, "height": 2.5, "depth": 0.6, "drawers": 4, "doors": 4}`;
    const text = await callAIText(analysisPrompt, [{ mimeType: 'image/png', data: imageBase64 }], true);
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  }
};
