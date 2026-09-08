import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { requireAuth, DecorOption } from '@/components/marcenaria/shared';
import { useStudioStore, ImageData } from '@/store/useStudioStore';
import { studioService, StudioGenerationMode } from '../services/studioService';
import { iaraService } from '@/modules/iara/services/iaraService';
import type { ProjectData } from '@/modules/projetos/types';
import { Box } from 'lucide-react';

interface StudioStyle { id: string; label: string; prompt: string; }
interface PlannedDimensions { width?: number; height?: number; depth?: number; }
const styles: StudioStyle[] = [
  { id: 'environment', label: 'Projeto no ambiente', prompt: 'clean contemporary custom cabinetry, architectural visualization, clear joinery composition' },
  { id: 'minimalist', label: 'Minimalista', prompt: 'minimalist interior design, soft lighting, clean lines' },
  { id: 'industrial', label: 'Industrial', prompt: 'industrial chic, exposed brick, concrete, dramatic lighting' },
  { id: 'realistic', label: 'Fotorealismo', prompt: 'photorealistic, 8k, architectural photography' },
];

export const useStudio = (
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>, 
  navigateTo: (route: string) => void, 
  gallery: string[], 
  setGallery: React.Dispatch<React.SetStateAction<string[]>>
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
  const [selectedDecor, setSelectedDecor] = useState<DecorOption>({ 
    id: 'minimal', 
    label: 'Minimalista', 
    icon: Box,
    prompt: 'Minimalist style, clean surfaces, few objects, museum-like, organized.'
  });
  
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StudioStyle>(styles[0]);
  const generatedImage = useStudioStore(state => state.generatedImage);
  const setGeneratedImage = useStudioStore(state => state.setGeneratedImage);
  const isRendering = useStudioStore(state => state.isRendering);

  // Sincroniza o loading do estúdio com o store global
  useEffect(() => {
    setLoading(isRendering);
  }, [isRendering]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('gallery_images')
      .select('image_url, prompt')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const urls = data.map(d => d.image_url);
          setGallery(urls);
          if (!generatedImage) setGeneratedImage(urls[0]);
        }
      });
  }, [user, generatedImage, setGallery, setGeneratedImage]);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    await supabase.from('gallery_images').insert({
      user_id: user.id,
      image_url: imageUrl,
      prompt: promptText,
    });
  };

  const generate = async () => {
    if (!prompt && !sketchImage && !envImage) { setError("Adicione o pedido do cliente, um rascunho ou uma foto do ambiente."); return; }
    if (generationMode === 'environment-project' && envImage && !environmentAnalysis) { setError("Analise a foto do ambiente antes de criar o projeto."); return; }
    if (generationMode === 'environment-project' && envImage && environmentAnalysis && !environmentAnalysis.confirmedByIara) { setError("Confira o mapa do ambiente com a IARA antes de criar o projeto."); return; }
    if (generationMode === 'environment-project' && envImage && environmentAnalysis) { if (!environmentAnalysis.geometry) { setError("Registre as medidas-chave do ambiente antes de criar o projeto."); return; } const geometryCheck = validateEnvironmentGeometry(environmentAnalysis, environmentAnalysis.geometry); if (!geometryCheck.valid || geometryCheck.criticalMissing.length > 0) { setError(`A geometria ainda precisa de conferência: ${[...geometryCheck.errors, ...geometryCheck.criticalMissing.map(item => `falta ${item}`)].join(' ')}`); return; } }
    if (generationMode === 'planned-environment') { const hasAnyDimension = plannedDimensions.width || plannedDimensions.height || plannedDimensions.depth; if (hasAnyDimension && (!plannedDimensions.width || !plannedDimensions.height || !plannedDimensions.depth)) { setError('Se informar medidas do ambiente planejado, preencha largura, altura e profundidade.'); return; } }
    const authed = await requireAuth(); if (!authed) { setPendingAction(() => () => generate()); setShowAuthDialog(true); return; }
    setLoading(true); setError(null);
    try {
      const imgs: ImageData[] = [];
      if (sketchBase64 && sketchMime) imgs.push({ mimeType: sketchMime, data: sketchBase64 });
      if (envBase64 && envMime) imgs.push({ mimeType: envMime, data: envBase64 });

      let newImage: string | null = null;
      if (isRefining && generatedImage) {
        newImage = await studioService.refineVisual(generatedImage, prompt);
      } else {
        newImage = await studioService.generateVisual(
          prompt, 
          imgs, 
          selectedStyle.prompt, 
          selectedDecor.prompt
        );
      }

      if (newImage) {
        setGeneratedImage(newImage);
        setGallery((prev: string[]) => [newImage!, ...prev]);
        setShowModal(true);
        await saveToGallery(newImage, prompt);
      } else {
        throw new Error("Falha na geração. Tente novamente.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro de conexão.");
    } finally { setLoading(false); }
  };

  const analyzeForBudget = async () => {
    if (!generatedImage) return;
    if (generationMode === 'planned-environment' && (!plannedDimensions.width || !plannedDimensions.height || !plannedDimensions.depth)) { setError('Antes do orçamento, confirme largura, altura e profundidade do ambiente. O conceito pode ser vendido agora, mas não deve virar medida de fabricação.'); return; }
    const authed = await requireAuth(); if (!authed) { setPendingAction(() => () => analyzeForBudget()); setShowAuthDialog(true); return; }
    setAnalyzing(true);
    try {
      const imageBase64 = generatedImage.split(',')[1];
      const est = await iaraService.analyzeImage(imageBase64);
      setBudgetProject((prev) => ({ 
        ...prev, 
        width: est.width || 2, 
        height: est.height || 2.5, 
        depth: est.depth || 0.6, 
        drawers: est.drawers || 2, 
        doors: est.doors || 2 
      }));
      setShowModal(false); navigateTo('orcamento');
    } catch { alert("Não foi possível analisar. Redirecionando..."); navigateTo('orcamento'); } finally { setAnalyzing(false); }
  };

  return { prompt, setPrompt, sketchImage, setSketchImage, envImage, setEnvImage, generatedImage, setGeneratedImage, loading, analyzing, selectedDecor, setSelectedDecor, isRefining, setIsRefining, error, setError, showModal, setShowModal, isRecording, setIsRecording, selectedStyle, setSelectedStyle, showAuthDialog, setShowAuthDialog, pendingAction, setPendingAction, generate, analyzeForBudget, styles, setSketchBase64, setSketchMime, setEnvBase64, setEnvMime, environmentAnalysis, analyzingEnvironment, confirmingEnvironment, environmentError, analyzeEnvironmentImage, confirmEnvironment, resetEnvironmentAnalysis, updateEnvironmentAnalysis };
};
