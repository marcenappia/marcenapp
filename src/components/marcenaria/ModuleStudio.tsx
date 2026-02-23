import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, MapPin, Wand2, RefreshCcw, Loader2, Sparkles, 
  Download, DollarSign, Maximize2, X, Mic
} from 'lucide-react';
import { Button, Card, Modal, DecorationPanel, callAIImage, callAIText, requireAuth, type DecorOption } from './shared';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const styles = [
  { id: 'realistic', label: 'Fotorealismo', prompt: 'photorealistic, 8k, architectural photography' },
  { id: 'minimalist', label: 'Minimalista', prompt: 'minimalist interior design, soft lighting, clean lines' },
  { id: 'industrial', label: 'Industrial', prompt: 'industrial chic, exposed brick, concrete, dramatic lighting' }
];

interface Props {
  setBudgetProject: React.Dispatch<React.SetStateAction<any>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
}

const ModuleStudio = ({ setBudgetProject, navigateTo, gallery, setGallery }: Props) => {
  const nav = useNavigate();
  const { user } = useAuth();
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
  const [selectedDecor, setSelectedDecor] = useState<DecorOption>({ id: 'minimal', label: 'Minimalista', icon: undefined as any, prompt: 'Minimalist decoration, few objects, clean.' });
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(styles[0]);
  const recognitionRef = useRef<any>(null);

  // Load gallery from DB
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

  useEffect(() => {
    if (!generatedImage && gallery.length > 0) setGeneratedImage(gallery[0]);
  }, []);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    await supabase.from('gallery_images').insert({
      user_id: user.id,
      image_url: imageUrl,
      prompt: promptText,
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Navegador sem suporte a voz.");
    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) setPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const processFile = (file: File, type: 'sketch' | 'env') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Clean = result.split(',')[1];
      if (type === 'sketch') {
        setSketchImage(result); setSketchBase64(base64Clean); setSketchMime(file.type); setIsRefining(false);
      } else {
        setEnvImage(result); setEnvBase64(base64Clean); setEnvMime(file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `marcenaria-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const analyzeForBudget = async () => {
    if (!generatedImage) return;
    const authed = await requireAuth();
    if (!authed) { nav('/auth'); return; }
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

  const generate = async () => {
    if (!prompt && !sketchImage) { setError("Adicione um prompt ou imagem."); return; }
    const authed = await requireAuth();
    if (!authed) { nav('/auth'); return; }
    setLoading(true); setError(null);
    try {
      const decPrompt = `INTERIOR STYLING: Apply a ${selectedDecor.label} style. ${selectedDecor.prompt}`;
      let newImage: string | null = null;
      const buildImages = () => {
        const imgs: { mimeType: string; data: string }[] = [];
        if (sketchBase64 && sketchMime) imgs.push({ mimeType: sketchMime, data: sketchBase64 });
        if (envBase64 && envMime) imgs.push({ mimeType: envMime, data: envBase64 });
        return imgs;
      };

      if (sketchImage && envImage) {
        const finalPrompt = `ACT AS AN EXPERT ARCHITECTURAL VISUALIZER. Input 1: OBJECT. Input 2: ENVIRONMENT. TASK: Composite Object into Environment seamlessly. Match perspective. Style: ${selectedStyle.prompt}. ${decPrompt} User Instruction: ${prompt}`;
        newImage = await callAIImage(finalPrompt, buildImages());
      } else if (sketchImage) {
        const finalPrompt = isRefining
          ? `ACT AS A 3D MODELER AND RENDERER. TASK: Re-render the provided image with STRUCTURAL MODIFICATIONS. USER COMMAND: "${prompt}". Keep everything else the same.`
          : `ACT AS A 3D RENDERING ENGINE. Transform this sketch into a Photorealistic Image. Style: ${selectedStyle.prompt}. ${decPrompt}. Details: ${prompt}`;
        newImage = await callAIImage(finalPrompt, buildImages());
      } else {
        const finalPrompt = `Photorealistic interior design image of ${prompt}, style: ${selectedStyle.prompt}, ultra detailed, 8k. ${decPrompt}`;
        newImage = await callAIImage(finalPrompt);
      }

      if (newImage) {
        setGeneratedImage(newImage);
        setGallery(prev => [newImage!, ...prev]);
        setShowModal(true);
        await saveToGallery(newImage, prompt);
      } else {
        throw new Error("Falha na geração. Tente novamente.");
      }
    } catch (e: any) {
      setError(e?.message || "Erro de conexão.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Card className={`p-2 h-32 flex items-center justify-center relative border-dashed border-2 ${isRefining ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`}>
              {!sketchImage ? (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-slate-50 transition-colors">
                  <Upload className="text-slate-400" size={20} />
                  <span className="text-[10px] text-slate-500 mt-1 text-center font-medium">Rascunho / Imagem</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'sketch')} />
                </label>
              ) : <img src={sketchImage} className="h-full object-contain" />}
              {sketchImage && (
                <button onClick={() => { setSketchImage(null); setIsRefining(false); }} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={10} />
                </button>
              )}
            </Card>
            <Card className="p-2 h-32 flex items-center justify-center relative border-dashed border-2 border-slate-300">
              {!envImage ? (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-slate-50 transition-colors">
                  <MapPin className="text-slate-400" size={20} />
                  <span className="text-[10px] text-slate-500 mt-1 text-center font-medium">Ambiente Real</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'env')} />
                </label>
              ) : <img src={envImage} className="h-full object-contain" />}
              {envImage && (
                <button onClick={() => setEnvImage(null)} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={10} />
                </button>
              )}
            </Card>
          </div>

          <Card className="p-4 bg-slate-800 border-slate-700 text-white">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase">
                {isRefining ? "Comando de Edição" : "Descrição do Projeto"}
              </label>
              <button
                onClick={toggleRecording}
                className={`p-1.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                title="Falar descrição"
              >
                <Mic size={16} />
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={isRecording ? "Ouvindo..." : (isRefining ? "Ex: Trocar gavetas por prateleiras..." : "Ex: Cozinha estilo industrial...")}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm h-24 outline-none focus:border-indigo-500 resize-none text-white placeholder:text-slate-500"
            />
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">
              {styles.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap border transition-colors ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <DecorationPanel selectedDecor={selectedDecor} onSelect={setSelectedDecor} />
            <Button
              onClick={generate}
              disabled={loading}
              className={`w-full mt-4 border-none ${isRefining ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (isRefining ? <RefreshCcw size={18} /> : <Wand2 size={18} />)}
              {loading ? "Processando..." : (isRefining ? "Aplicar Alteração" : "Criar Imagem")}
            </Button>
            {error && <p className="text-xs text-red-400 mt-2 bg-red-950/50 p-2 rounded">{error}</p>}
          </Card>

          {gallery.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {gallery.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  className={`h-16 w-16 object-cover rounded-lg cursor-pointer border-2 transition-all flex-shrink-0 ${generatedImage === img ? 'border-indigo-500 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  onClick={() => setGeneratedImage(img)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="bg-slate-900 rounded-xl border border-slate-800 h-[400px] lg:h-[600px] flex items-center justify-center overflow-hidden relative group">
            {generatedImage ? (
              <>
                <img src={generatedImage} className="w-full h-full object-contain cursor-zoom-in" onClick={() => setShowModal(true)} />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button onClick={() => setShowModal(true)} variant="primary" className="text-xs font-bold shadow-xl" icon={Maximize2}>Expandir</Button>
                </div>
              </>
            ) : (
              <div className="text-center px-6">
                <Wand2 className="text-slate-600 mx-auto mb-3" size={40} />
                <span className="text-slate-500 text-sm">A visualização aparecerá aqui</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={<span className="flex items-center gap-2"><Sparkles className="text-indigo-400" size={18} /> Resultado</span>}
        footer={
          <div className="flex w-full flex-wrap gap-2 justify-end">
            <Button
              onClick={() => {
                if (!generatedImage) return;
                setSketchImage(generatedImage);
                setSketchBase64(generatedImage.split(',')[1]);
                setSketchMime('image/png');
                setIsRefining(true);
                setPrompt("");
                setShowModal(false);
              }}
              variant="magic"
              icon={RefreshCcw}
            >
              Refinar Imagem
            </Button>
            <Button onClick={handleDownload} variant="secondary" icon={Download}>Baixar</Button>
            <Button onClick={analyzeForBudget} variant="primary" className="bg-emerald-600 hover:bg-emerald-700" icon={DollarSign}>
              {analyzing ? <Loader2 className="animate-spin" size={18} /> : "Orçamento"}
            </Button>
          </div>
        }
      >
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <img src={generatedImage || ''} className="max-w-full max-h-[70vh] rounded shadow-2xl" />
        </div>
      </Modal>
    </>
  );
};

export default ModuleStudio;
