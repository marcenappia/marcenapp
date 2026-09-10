import { useState, useEffect } from 'react';
import { Box } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { requireAuth, DecorOption } from '@/components/marcenaria/shared';
import { useStudioStore, ImageData } from '@/store/useStudioStore';
import { imageSourceToData, studioService, StudioGenerationMode } from '../services/studioService';
import { iaraService } from '@/modules/iara/services/iaraService';
import { analyzeEnvironment, confirmEnvironmentWithIara } from '../services/environmentAnalysis';
import { validateEnvironmentGeometry } from '../services/environmentGeometry';
import { registrarEventoSistema } from '@/modules/projetos/services/diarioStorage';
import type { EnvironmentAnalysis } from '../types';

interface StudioStyle { id: string; label: string; prompt: string; }
interface PlannedDimensions { width?: number; height?: number; depth?: number; }
const styles: StudioStyle[] = [
  { id: 'environment', label: 'Projeto no ambiente', prompt: 'clean contemporary custom cabinetry, architectural visualization, clear joinery composition' },
  { id: 'minimalist', label: 'Minimalista', prompt: 'minimalist interior design, soft lighting, clean lines' },
  { id: 'industrial', label: 'Industrial', prompt: 'industrial chic, exposed brick, concrete, dramatic lighting' },
  { id: 'realistic', label: 'Fotorealismo', prompt: 'photorealistic, 8k, architectural photography' },
];

const errorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

export const useStudio = <TBudget extends object>(
  setBudgetProject: React.Dispatch<React.SetStateAction<TBudget>>,
  navigateTo: (route: string) => void,
  gallery: string[],
  setGallery: React.Dispatch<React.SetStateAction<string[]>>,
  projectId?: string | null,
  generationMode: StudioGenerationMode = 'render',
  plannedDimensions: PlannedDimensions = {},
) => {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [prompt, setPrompt] = useState("");
  const [sketchImage, setSketchImage] = useState<string | null>(null);
  const [sketchBase64, setSketchBase64] = useState<string | null>(null);
  const [sketchMime, setSketchMime] = useState<string | null>(null);
  const [envImage, setEnvImage] = useState<string | null>(null);
  const [envBase64, setEnvBase64] = useState<string | null>(null);
  const [envMime, setEnvMime] = useState<string | null>(null);
  const [environmentAnalysis, setEnvironmentAnalysis] = useState<EnvironmentAnalysis | null>(null);
  const [analyzingEnvironment, setAnalyzingEnvironment] = useState(false);
  const [confirmingEnvironment, setConfirmingEnvironment] = useState(false);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDecor, setSelectedDecor] = useState<DecorOption>({ id: 'minimal', label: 'Minimalista', icon: Box, prompt: 'Minimalist style, clean surfaces, few objects, museum-like, organized.' });
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StudioStyle>(styles[0]);
  const generatedImage = useStudioStore(state => state.generatedImage);
  const setGeneratedImage = useStudioStore(state => state.setGeneratedImage);
  const isRendering = useStudioStore(state => state.isRendering);
  useEffect(() => { setLoading(isRendering); }, [isRendering]);
  useEffect(() => { if (!user) return; supabase.from('gallery_images').select('image_url, prompt').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { if (data && data.length > 0) { const urls = data.map(d => d.image_url); setGallery(urls); if (!generatedImage) setGeneratedImage(urls[0]); } }); }, [user]);
  const saveToGallery = async (imageUrl: string, promptText: string) => { if (!user) return; const { error: insertError } = await supabase.from('gallery_images').insert({ user_id: user.id, image_url: imageUrl, prompt: promptText }); if (insertError) throw new Error(`Não foi possível salvar a imagem na galeria: ${insertError.message}`); };
  const resetEnvironmentAnalysis = () => { setEnvironmentAnalysis(null); setEnvironmentError(null); };
  const analyzeEnvironmentImage = async () => { if (!envBase64) { setEnvironmentError('Adicione uma foto real do ambiente primeiro.'); return; } const authed = await requireAuth(); if (!authed) { setPendingAction(() => () => analyzeEnvironmentImage()); setShowAuthDialog(true); return; } setAnalyzingEnvironment(true); setEnvironmentError(null); try { setEnvironmentAnalysis(await analyzeEnvironment(envBase64, envMime || 'image/jpeg')); } catch (error) { setEnvironmentError(errorMessage(error, 'Não foi possível analisar o ambiente.')); } finally { setAnalyzingEnvironment(false); } };
  const confirmEnvironment = async () => { if (!envBase64 || !environmentAnalysis) return; const authed = await requireAuth(); if (!authed) { setPendingAction(() => () => confirmEnvironment()); setShowAuthDialog(true); return; } setConfirmingEnvironment(true); setEnvironmentError(null); try { const result = await confirmEnvironmentWithIara(envBase64, environmentAnalysis, envMime || 'image/jpeg'); setEnvironmentAnalysis(result.analysis); if (result.questions.length > 0) setEnvironmentError(`A IARA pede conferência: ${result.questions.join(' ')}`); else if (projectId) registrarEventoSistema(projectId, 'ambiente-confirmado-iara', 'Ambiente real analisado e confirmado pela IARA. Mapa espacial liberado para o projeto.', 'iara'); } catch (error) { setEnvironmentError(errorMessage(error, 'Não foi possível concluir a conferência.')); } finally { setConfirmingEnvironment(false); } };
  const updateEnvironmentAnalysis = (next: EnvironmentAnalysis) => { setEnvironmentAnalysis({ ...next, confirmedByIara: false }); setEnvironmentError(null); };

  const generate = async () => {
    if (!prompt && !sketchImage && !envImage) { setError("Adicione o pedido do cliente, um rascunho ou uma foto do ambiente."); return; }
    if (generationMode === 'environment-project' && envImage && !environmentAnalysis) { setError("Analise a foto do ambiente antes de criar o projeto."); return; }
    if (generationMode === 'environment-project' && envImage && environmentAnalysis && !environmentAnalysis.confirmedByIara) { setError("Confira o mapa do ambiente com a IARA antes de criar o projeto."); return; }
    if (generationMode === 'environment-project' && envImage && environmentAnalysis) { if (!environmentAnalysis.geometry) { setError("Registre as medidas-chave do ambiente antes de criar o projeto."); return; } const geometryCheck = validateEnvironmentGeometry(environmentAnalysis, environmentAnalysis.geometry); if (!geometryCheck.valid || geometryCheck.criticalMissing.length > 0) { setError(`A geometria ainda precisa de conferência: ${[...geometryCheck.errors, ...geometryCheck.criticalMissing.map(item => `falta ${item}`)].join(' ')}`); return; } }
    if (generationMode === 'planned-environment') { const hasAnyDimension = plannedDimensions.width || plannedDimensions.height || plannedDimensions.depth; if (hasAnyDimension && (!plannedDimensions.width || !plannedDimensions.height || !plannedDimensions.depth)) { setError('Se informar medidas do ambiente planejado, preencha largura, altura e profundidade.'); return; } }
    const authed = await requireAuth(); if (!authed) { setPendingAction(() => () => generate()); setShowAuthDialog(true); return; }
    setLoading(true); setError(null);
    try {
      const imgs: ImageData[] = []; if (sketchBase64 && sketchMime) imgs.push({ mimeType: sketchMime, data: sketchBase64 }); if (envBase64 && envMime) imgs.push({ mimeType: envMime, data: envBase64 });
      const plannedContext = generationMode === 'planned-environment' ? `\nAMBIENTE AINDA NÃO PRONTO: este é um projeto para execução futura. ${plannedDimensions.width ? `MEDIDAS DE REFERÊNCIA INFORMADAS: largura ${plannedDimensions.width} m, altura ${plannedDimensions.height} m, profundidade ${plannedDimensions.depth} m.` : 'Não há medidas confirmadas nesta etapa; trate como CONCEITO VISUAL.'} Não apresente medidas inventadas como medidas de fabricação.\n` : '';
      const environmentContext = environmentAnalysis ? `\nMAPA TÉCNICO DO AMBIENTE (fonte de restrições; NÃO invente medidas):\n${JSON.stringify(environmentAnalysis)}\nREGRAS: respeite paredes, cantos, janelas, portas, tomadas, interruptores e obstáculos detectados. Use a geometria confirmada como referência principal. Nunca ocupe uma abertura ou ponto elétrico sem instrução explícita. Medidas estimadas não são medidas de fabricação; mantenha folgas e peça confirmação quando necessário.` : '';
      const generationPrompt = `${prompt || 'Projetar a marcenaria conforme o material de referência enviado.'}${plannedContext}${environmentContext}`;
      const effectiveMode: StudioGenerationMode = generationMode === 'environment-project' && envImage ? 'environment-project' : generationMode === 'environment-project' ? 'render' : generationMode;
      let newImage: string | null = null; if (isRefining && generatedImage) newImage = await studioService.refineVisual(generatedImage, generationPrompt); else newImage = await studioService.generateVisual(generationPrompt, imgs, selectedStyle.prompt, selectedDecor.prompt, effectiveMode);
      if (newImage) { setGeneratedImage(newImage); setGallery((prev: string[]) => [newImage!, ...prev]); setShowModal(true); await saveToGallery(newImage, generationPrompt); if (projectId) registrarEventoSistema(projectId, 'projeto-gerado-estudio', generationMode === 'planned-environment' ? 'Projeto conceitual preparado no Estúdio para ambiente futuro; aguardando conferência do ambiente real para produção.' : envImage ? 'Projeto de marcenaria materializado no ambiente real a partir da foto e do mapa confirmado pela IARA.' : 'Projeto visual gerado no Estúdio.', 'estudio'); } else throw new Error("Falha na geração. Tente novamente.");
    } catch (error) { setError(errorMessage(error, "Erro de conexão.")); } finally { setLoading(false); }
  };

  const analyzeForBudget = async () => {
    if (!generatedImage) return;
    if (generationMode === 'planned-environment' && (!plannedDimensions.width || !plannedDimensions.height || !plannedDimensions.depth)) { setError('Antes do orçamento, confirme largura, altura e profundidade do ambiente. O conceito pode ser vendido agora, mas não deve virar medida de fabricação.'); return; }
    const authed = await requireAuth(); if (!authed) { setPendingAction(() => () => analyzeForBudget()); setShowAuthDialog(true); return; }
    setAnalyzing(true); setError(null);
    try {
      const image = await imageSourceToData(generatedImage);
      const est = await iaraService.analyzeImage(image.data);
      setBudgetProject((prevRaw) => { const prev = prevRaw as TBudget & { width?: number; height?: number; depth?: number; drawers?: number; doors?: number }; return ({ ...prev, width: plannedDimensions.width || est.width || prev.width, height: plannedDimensions.height || est.height || prev.height, depth: plannedDimensions.depth || est.depth || prev.depth, drawers: est.drawers || 2, doors: est.doors || 2 }); });
      if (projectId) registrarEventoSistema(projectId, 'estimativa-enviada-orcamento', generationMode === 'planned-environment' ? 'IARA preparou uma estimativa visual para o orçamento; medidas do ambiente foram informadas como referência e ainda exigem conferência final.' : 'IARA preparou a estimativa visual para o orçamento.', 'iara');
      setShowModal(false); navigateTo('orcamento');
    } catch (error) { setError(errorMessage(error, 'Não foi possível analisar a imagem para o orçamento. Tente novamente.')); } finally { setAnalyzing(false); }
  };

  return { prompt, setPrompt, sketchImage, setSketchImage, envImage, setEnvImage, generatedImage, setGeneratedImage, loading, analyzing, selectedDecor, setSelectedDecor, isRefining, setIsRefining, error, setError, showModal, setShowModal, isRecording, setIsRecording, selectedStyle, setSelectedStyle, showAuthDialog, setShowAuthDialog, pendingAction, setPendingAction, generate, analyzeForBudget, styles, setSketchBase64, setSketchMime, setEnvBase64, setEnvMime, environmentAnalysis, analyzingEnvironment, confirmingEnvironment, environmentError, analyzeEnvironmentImage, confirmEnvironment, resetEnvironmentAnalysis, updateEnvironmentAnalysis };
};
