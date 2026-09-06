import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { requireAuth, DecorOption } from '@/components/marcenaria/shared';
import { useStudioStore, ImageData } from '@/store/useStudioStore';
import { studioService } from '../services/studioService';
import { iaraService } from '@/modules/iara/services/iaraService';
import { analyzeEnvironment, confirmEnvironmentWithIara } from '../services/environmentAnalysis';
import type { EnvironmentAnalysis } from '../types';

interface StudioStyle { id: string; label: string; prompt: string; }
const styles: StudioStyle[] = [
  { id: 'realistic', label: 'Fotorealismo', prompt: 'photorealistic, 8k, architectural photography' },
  { id: 'minimalist', label: 'Minimalista', prompt: 'minimalist interior design, soft lighting, clean lines' },
  { id: 'industrial', label: 'Industrial', prompt: 'industrial chic, exposed brick, concrete, dramatic lighting' }
];

export const useStudio = (setBudgetProject: React.Dispatch<React.SetStateAction<any>>, navigateTo: (route: string) => void, gallery: string[], setGallery: React.Dispatch<React.SetStateAction<string[]>>) => {
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
  const [selectedDecor, setSelectedDecor] = useState<DecorOption>({ id: 'minimal', label: 'Minimalista', icon: () => null, prompt: 'Minimalist style, clean surfaces, few objects, museum-like, organized.' } as any);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StudioStyle>(styles[0]);

  const generatedImage = useStudioStore(state => state.generatedImage);
  const setGeneratedImage = useStudioStore(state => state.setGeneratedImage);
  const isRendering = useStudioStore(state => state.isRendering);
  useEffect(() => { setLoading(isRendering); }, [isRendering]);

  useEffect(() => {
    if (!user) return;
    supabase.from('gallery_images').select('image_url, prompt').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data && data.length > 0) {
        const urls = data.map(d => d.image_url);
        setGallery(urls);
        if (!generatedImage) setGeneratedImage(urls[0]);
      }
    });
  }, [user]);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    await supabase.from('gallery_images').insert({ user_id: user.id, image_url: imageUrl, prompt: promptText });
  };

  const resetEnvironmentAnalysis = () => { setEnvironmentAnalysis(null); setEnvironmentError(null); };

  const analyzeEnvironmentImage = async () => {
    if (!envBase64) { setEnvironmentError('Adicione uma foto real do ambiente primeiro.'); return; }
    const authed = await requireAuth();
    if (!authed) { setPendingAction(() => () => analyzeEnvironmentImage()); setShowAuthDialog(true); return; }
    setAnalyzingEnvironment(true); setEnvironmentError(null);
    try { setEnvironmentAnalysis(await analyzeEnvironment(envBase64, envMime || 'image/jpeg')); }
    catch (e: any) { setEnvironmentError(e?.message || 'Não foi possível analisar o ambiente.'); }
    finally { setAnalyzingEnvironment(false); }
  };

  const confirmEnvironment = async () => {
    if (!envBase64 || !environmentAnalysis) return;
    const authed = await requireAuth();
    if (!authed) { setPendingAction(() => () => confirmEnvironment()); setShowAuthDialog(true); return; }
    setConfirmingEnvironment(true); setEnvironmentError(null);
    try {
      const result = await confirmEnvironmentWithIara(envBase64, environmentAnalysis, envMime || 'image/jpeg');
      setEnvironmentAnalysis(result.analysis);
      if (result.questions.length > 0) setEnvironmentError(`A IARA pede conferência: ${result.questions.join(' ')}`);
    } catch (e: any) { setEnvironmentError(e?.message || 'Não foi possível concluir a conferência.'); }
    finally { setConfirmingEnvironment(false); }
  };

  const updateEnvironmentAnalysis = (next: EnvironmentAnalysis) => {
    setEnvironmentAnalysis({ ...next, confirmedByIara: false });
    setEnvironmentError(null);
  };

  const generate = async () => {
    if (!prompt && !sketchImage && !envImage) { setError("Adicione um prompt, rascunho ou foto do ambiente."); return; }
    if (envImage && !environmentAnalysis) { setError("Analise a foto do ambiente antes de criar o projeto."); return; }
    if (envImage && environmentAnalysis && !environmentAnalysis.confirmedByIara) { setError("Confira o mapa do ambiente com a IARA antes de criar o projeto."); return; }
    const authed = await requireAuth();
    if (!authed) { setPendingAction(() => () => generate()); setShowAuthDialog(true); return; }
    setLoading(true); setError(null);
    try {
      const imgs: ImageData[] = [];
      if (sketchBase64 && sketchMime) imgs.push({ mimeType: sketchMime, data: sketchBase64 });
      if (envBase64 && envMime) imgs.push({ mimeType: envMime, data: envBase64 });
      const environmentContext = environmentAnalysis ? `\nMAPA TÉCNICO DO AMBIENTE (fonte de restrições; NÃO invente medidas):\n${JSON.stringify(environmentAnalysis)}\nREGRAS: respeite paredes, cantos, janelas, portas, tomadas, interruptores e obstáculos detectados. Nunca ocupe uma abertura ou ponto elétrico sem instrução explícita. Medidas estimadas não são medidas de fabricação; mantenha folgas e peça confirmação quando necessário.` : '';
      const generationPrompt = `${prompt || 'Projetar aproveitando o ambiente fotografado.'}${environmentContext}`;
      let newImage: string | null = null;
      if (isRefining && generatedImage) newImage = await studioService.refineVisual(generatedImage, generationPrompt);
      else newImage = await studioService.generateVisual(generationPrompt, imgs, selectedStyle.prompt, selectedDecor.prompt);
      if (newImage) { setGeneratedImage(newImage); setGallery((prev: string[]) => [newImage!, ...prev]); setShowModal(true); await saveToGallery(newImage, generationPrompt); }
      else throw new Error("Falha na geração. Tente novamente.");
    } catch (e: any) { setError(e?.message || "Erro de conexão."); }
    finally { setLoading(false); }
  };

  const analyzeForBudget = async () => {
    if (!generatedImage) return;
    const authed = await requireAuth();
    if (!authed) { setPendingAction(() => () => analyzeForBudget()); setShowAuthDialog(true); return; }
    setAnalyzing(true);
    try {
      const imageBase64 = generatedImage.split(',')[1];
      const est = await iaraService.analyzeImage(imageBase64);
      setBudgetProject((prev: any) => ({ ...prev, width: est.width || 2, height: est.height || 2.5, depth: est.depth || 0.6, drawers: est.drawers || 2, doors: est.doors || 2 }));
      setShowModal(false); navigateTo('orcamento');
    } catch { alert("Não foi possível analisar. Redirecionando..."); navigateTo('orcamento'); }
    finally { setAnalyzing(false); }
  };

  return {
    prompt, setPrompt, sketchImage, setSketchImage, envImage, setEnvImage,
    generatedImage, setGeneratedImage, loading, analyzing, selectedDecor, setSelectedDecor,
    isRefining, setIsRefining, error, setError, showModal, setShowModal, isRecording, setIsRecording,
    selectedStyle, setSelectedStyle, showAuthDialog, setShowAuthDialog, pendingAction, setPendingAction,
    generate, analyzeForBudget, styles, setSketchBase64, setSketchMime, setEnvBase64, setEnvMime,
    environmentAnalysis, analyzingEnvironment, confirmingEnvironment, environmentError,
    analyzeEnvironmentImage, confirmEnvironment, resetEnvironmentAnalysis, updateEnvironmentAnalysis,
  };
};
