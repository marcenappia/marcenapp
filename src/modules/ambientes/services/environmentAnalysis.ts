import { callAIText } from '@/services/ai';
import type { EnvironmentAnalysis, EnvironmentConfirmation } from '../types';

const EMPTY_FALLBACK = (message: string): EnvironmentAnalysis => ({
  version: '1.0',
  roomType: 'Ambiente não classificado',
  perspective: { description: 'Não foi possível determinar a perspectiva com segurança.', confidence: 'low' },
  elements: [],
  missingMeasurements: [message],
  warnings: ['A análise automática falhou. Não use medidas estimadas para fabricação.'],
  analyzedAt: new Date().toISOString(),
  confirmedByIara: false,
});

const parseJson = <T,>(text: string): T => JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

export const analyzeEnvironment = async (imageBase64: string, mimeType = 'image/jpeg'): Promise<EnvironmentAnalysis> => {
  const prompt = `Você é um especialista em levantamento técnico de ambientes para marcenaria.
Analise a FOTO REAL enviada. NÃO invente medidas. Diferencie claramente medidas CONFIRMADAS, ESTIMADAS e DESCONHECIDAS.
Identifique somente o que estiver visualmente sustentado: paredes, cantos internos, janelas, portas, tomadas, interruptores, rodapés e obstáculos relevantes.
Avalie a perspectiva/fuga e se existe um canto de 90 graus ou outro ângulo aparente.
Para medidas, use metros e retorne null quando a foto não permitir uma medição confiável.
Para cada elemento, informe posição relativa (ex.: parede esquerda, centro da parede direita), confiança e observações.
Retorne SOMENTE JSON neste formato:
{"version":"1.0","roomType":"closet","perspective":{"description":"...","confidence":"high"},"elements":[{"id":"wall-left","type":"wall","label":"Parede esquerda","position":"esquerda","widthM":null,"heightM":null,"depthM":null,"angleDeg":null,"confidence":"medium","measurementStatus":"unknown","notes":"..."}],"missingMeasurements":["..."],"warnings":["..."],"analyzedAt":"${new Date().toISOString()}","confirmedByIara":false}`;

  try {
    const text = await callAIText(prompt, [{ mimeType, data: imageBase64 }], true);
    const parsed = parseJson<EnvironmentAnalysis>(text);
    return {
      ...parsed,
      version: '1.0',
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      missingMeasurements: Array.isArray(parsed.missingMeasurements) ? parsed.missingMeasurements : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      analyzedAt: parsed.analyzedAt || new Date().toISOString(),
      confirmedByIara: false,
    };
  } catch (error) {
    return EMPTY_FALLBACK(error instanceof Error ? error.message : 'Repita a análise da foto.');
  }
};

export const confirmEnvironmentWithIara = async (
  imageBase64: string,
  analysis: EnvironmentAnalysis,
  mimeType = 'image/jpeg',
): Promise<EnvironmentConfirmation> => {
  const prompt = `Você é a IARA, conferente técnico do MARCENAPP.
Confira a análise abaixo contra a FOTO REAL. Corrija detecções inconsistentes, não invente dimensões e mantenha como desconhecidas as medidas que a imagem não comprova.
Dê prioridade absoluta a geometria: encontros de paredes, cantos, janelas, portas e obstáculos que podem impedir o móvel.
Se houver janela, porta, tomada ou interruptor, preserve sua posição relativa mesmo sem medida.
Se uma medida estiver apenas estimada, diga explicitamente que precisa ser confirmada no local.
Retorne SOMENTE JSON:
{"analysis":{...mesmo schema da análise, "confirmedByIara":true},"summary":"...","questions":["..."],"corrections":["..."]}
ANÁLISE A CONFERIR:
${JSON.stringify(analysis)}`;

  try {
    const text = await callAIText(prompt, [{ mimeType, data: imageBase64 }], true);
    const result = parseJson<EnvironmentConfirmation>(text);
    return {
      analysis: { ...result.analysis, version: '1.0', confirmedByIara: true },
      summary: result.summary || 'Análise conferida pela IARA.',
      questions: Array.isArray(result.questions) ? result.questions : [],
      corrections: Array.isArray(result.corrections) ? result.corrections : [],
    };
  } catch (error) {
    return {
      analysis: { ...analysis, confirmedByIara: false },
      summary: error instanceof Error ? error.message : 'Não foi possível concluir a conferência.',
      questions: ['Confira manualmente as medidas antes de gerar o projeto.'],
      corrections: [],
    };
  }
};
