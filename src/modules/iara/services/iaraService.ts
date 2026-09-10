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
  interpretCommand: async (prompt: string): Promise<CommandDecision> => {
    const lower = prompt.toLowerCase();

    if (lower.includes('render') || lower.includes('mostre') || lower.includes('veja') || lower.includes('materializa') || lower.includes('desenhe')) {
      return {
        type: 'RENDER_REQUEST',
        details: prompt,
        command: {
          target: 'studio',
          action: 'GENERATE_VISUAL',
          params: { prompt, style: 'realistic' },
        },
      };
    }

    if (lower.includes('quanto') || lower.includes('preço') || lower.includes('orçamento') || lower.includes('valor')) {
      return {
        type: 'BUDGET_REQUEST',
        details: prompt,
        command: {
          target: 'estela',
          action: 'CALCULATE_BUDGET',
          params: { prompt },
        },
      };
    }

    return { type: 'CHAT', details: prompt };
  },

  calculateSmartBudget: (prompt: string, factors: ProjectFactors, decorStyle: string): string => {
    let baseVal = 1200;
    const lower = prompt.toLowerCase();
    if (lower.includes('cozinha')) baseVal = 6000;
    if (lower.includes('guarda-roupa')) baseVal = 3000;

    return (baseVal * factors.L * factors.A * (decorStyle === 'Luxo' ? 1.5 : 1)).toFixed(2);
  },

  analyzeImage: async (imageBase64: string): Promise<ImageAnalysis> => {
    const analysisPrompt = 'Analyze this furniture strictly. Estimate dims (meters). Return ONLY valid JSON: {"width": 2.0, "height": 2.5, "depth": 0.6, "drawers": 4, "doors": 4}';
    const raw = typeof imageBase64 === 'string' && imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const text = await callAIText(analysisPrompt, [{ mimeType: 'image/png', data: raw }], true);
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('A IA retornou uma análise de imagem em formato inválido.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('A IA retornou uma análise de imagem inválida.');
    }

    const candidate = parsed as Record<string, unknown>;
    const fields = ['width', 'height', 'depth', 'drawers', 'doors'] as const;
    if (fields.some(field => typeof candidate[field] !== 'number' || !Number.isFinite(candidate[field] as number))) {
      throw new Error('A IA retornou uma análise de imagem incompleta.');
    }

    return {
      width: candidate.width as number,
      height: candidate.height as number,
      depth: candidate.depth as number,
      drawers: candidate.drawers as number,
      doors: candidate.doors as number,
    };
  },
};
