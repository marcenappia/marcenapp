import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { callAIImage, callAIText, requireAuth } from '@/components/marcenaria/shared';

const styles = [
  { id: 'realistic', label: 'Fotorealismo', prompt: 'photorealistic, 8k, architectural photography' },
  { id: 'minimalist', label: 'Minimalista', prompt: 'minimalist interior design, soft lighting, clean lines' },
  { id: 'industrial', label: 'Industrial', prompt: 'industrial chic, exposed brick, concrete, dramatic lighting' }
];

export const useStudio = (setBudgetProject: any, navigateTo: any, gallery: string[], setGallery: any) => {
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
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDecor, setSelectedDecor] = useState<any>({ id: 'minimal', label: 'Minimalista', prompt: 'Minimalist decoration, few objects, clean.' });
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(styles[0]);
  const recognitionRef = useRef<any>(null);

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
  }, [user]);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    await supabase.from('gallery_images').insert({
      user_id: user.id,
      image_url: imageUrl,
      prompt: promptText,
    });
  };

  const generate = async () => {
    if (!prompt && !sketchImage) { setError("Adicione um prompt ou imagem."); return; }
    const authed = await requireAuth();
    if (!authed) {
      setPendingAction(() => () => generate());
      setShowAuthDialog(true);
      return;
    }
    setLoading(true); setError(null);
    try {
      const decPrompt = `INTERIOR STYLING: Apply a ${selectedDecor.label} style. ${selectedDecor.prompt}`;
      let newImage: string | null = null;
      const imgs = [];
      if (sketchBase64 && sketchMime) imgs.push({ mimeType: sketchMime, data: sketchBase64 });
      if (envBase64 && envMime) imgs.push({ mimeType: envMime, data: envBase64 });

      if (sketchImage && envImage) {
        const finalPrompt = `ACT AS AN EXPERT ARCHITECTURAL VISUALIZER. Input 1: OBJECT. Input 2: ENVIRONMENT. TASK: Composite Object into Environment seamlessly. Match perspective. Style: ${selectedStyle.prompt}. ${decPrompt} User Instruction: ${prompt}`;
        newImage = await callAIImage(finalPrompt, imgs);
      } else if (sketchImage) {
        const finalPrompt = isRefining
          ? `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${prompt}". Keep everything else the same.`
          : `ACT AS A 3D RENDERING ENGINE. Transform this sketch into a Photorealistic Image. Style: ${selectedStyle.prompt}. ${decPrompt}. Details: ${prompt}`;
        newImage = await callAIImage(finalPrompt, imgs);
      } else {
        const finalPrompt = `Photorealistic interior design image of ${prompt}, style: ${selectedStyle.prompt}, ultra detailed, 8k. ${decPrompt}`;
        newImage = await callAIImage(finalPrompt);
      }

      if (newImage) {
        setGeneratedImage(newImage);
        setGallery((prev: string[]) => [newImage!, ...prev]);
        setShowModal(true);
        await saveToGallery(newImage, prompt);
      } else {
        throw new Error("Falha na geração. Tente novamente.");
      }
    } catch (e: any) {
      setError(e?.message || "Erro de conexão.");
    } finally { setLoading(false); }
  };

  const analyzeForBudget = async () => {
    if (!generatedImage) return;
    const authed = await requireAuth();
    if (!authed) {
      setPendingAction(() => () => analyzeForBudget());
      setShowAuthDialog(true);
      return;
    }
    setAnalyzing(true);
    try {
      const imageBase64 = generatedImage.split(',')[1];
      const analysisPrompt = `Analyze this furniture strictly. Estimate dims (meters). Return ONLY valid JSON: {"width": 2.0, "height": 2.5, "depth": 0.6, "drawers": 4, "doors": 4}`;
      const text = await callAIText(analysisPrompt, [{ mimeType: 'image/png', data: imageBase64 }], true);
      if (text) {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const est = JSON.parse(clean);
        setBudgetProject((prev: any) => ({ ...prev, width: est.width || 2, height: est.height || 2.5, depth: est.depth || 0.6, drawers: est.drawers || 2, doors: est.doors || 2 }));
        setShowModal(false); navigateTo('orcamento');
      }
    } catch {
      alert("Não foi possível analisar. Redirecionando..."); navigateTo('orcamento');
    } finally { setAnalyzing(false); }
  };

  return {
    prompt, setPrompt, sketchImage, setSketchImage, envImage, setEnvImage,
    generatedImage, setGeneratedImage, loading, analyzing, selectedDecor, setSelectedDecor,
    isRefining, setIsRefining, error, setError, showModal, setShowModal, isRecording, setIsRecording,
    selectedStyle, setSelectedStyle, showAuthDialog, setShowAuthDialog, pendingAction, setPendingAction,
    generate, analyzeForBudget, styles, setSketchBase64, setSketchMime, setEnvBase64, setEnvMime
  };
};
