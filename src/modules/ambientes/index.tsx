import React, { useState } from 'react';
import { Upload, MapPin, Wand2, RefreshCcw, Loader2, Sparkles, Download, DollarSign, Maximize2, X, Ruler, House, Construction } from 'lucide-react';
import { Button, Card, Modal, DecorationPanel } from '@/components/marcenaria/shared';
import AuthDialog from '@/components/marcenaria/AuthDialog';
import { useStudio } from './hooks/useStudio';
import { EnvironmentAnalysisPanel } from './components/EnvironmentAnalysisPanel';
import type { StudioGenerationMode } from './services/studioService';

interface StudioProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<any>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  descriptionSlot?: React.ReactNode;
  projectId?: string | null;
}

export const Studio = ({ setBudgetProject, navigateTo, gallery, setGallery, descriptionSlot, projectId }: StudioProps) => {
  const [projectMode, setProjectMode] = useState<'ready' | 'planned' | 'concept'>('ready');
  const [plannedDimensions, setPlannedDimensions] = useState({ width: '', height: '', depth: '' });
  const generationMode: StudioGenerationMode = projectMode === 'ready' ? 'environment-project' : 'planned-environment';
  const planned = {
    width: plannedDimensions.width ? Number(plannedDimensions.width) : undefined,
    height: plannedDimensions.height ? Number(plannedDimensions.height) : undefined,
    depth: plannedDimensions.depth ? Number(plannedDimensions.depth) : undefined,
  };
  const {
    prompt, setPrompt, sketchImage, setSketchImage, envImage, setEnvImage,
    generatedImage, setGeneratedImage, loading, analyzing, selectedDecor, setSelectedDecor,
    isRefining, setIsRefining, error, showModal, setShowModal, isRecording,
    selectedStyle, setSelectedStyle, showAuthDialog, setShowAuthDialog, pendingAction, setPendingAction,
    generate, analyzeForBudget, styles, setSketchBase64, setSketchMime, setEnvBase64, setEnvMime,
    environmentAnalysis, analyzingEnvironment, confirmingEnvironment, environmentError,
    analyzeEnvironmentImage, confirmEnvironment, resetEnvironmentAnalysis, updateEnvironmentAnalysis,
  } = useStudio(setBudgetProject, navigateTo, gallery, setGallery, projectId, generationMode, planned);

  const processFile = (file: File, type: 'sketch' | 'env') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Clean = result.split(',')[1];
      if (type === 'sketch') {
        setSketchImage(result); setSketchBase64(base64Clean); setSketchMime(file.type); setIsRefining(false);
      } else {
        resetEnvironmentAnalysis(); setEnvImage(result); setEnvBase64(base64Clean); setEnvMime(file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a'); link.href = generatedImage; link.download = `marcenaria-${Date.now()}.png`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const selectMode = (mode: 'ready' | 'planned' | 'concept') => {
    setProjectMode(mode);
    setError?.(null);
    if (mode !== 'ready') { resetEnvironmentAnalysis(); setEnvImage(null); setEnvBase64(null); setEnvMime(null); }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-3 border-slate-200 bg-white">
            <div className="flex items-center gap-2 mb-2"><House size={16} className="text-indigo-600"/><span className="text-xs font-black uppercase tracking-wider text-slate-700">Como está o ambiente?</span></div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => selectMode('ready')} className={`rounded-lg border p-2 text-left ${projectMode === 'ready' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><MapPin size={15} className="mb-1 text-indigo-600"/><div className="text-[10px] font-bold">Já está pronto</div><div className="text-[9px] text-slate-500">Tenho foto</div></button>
              <button onClick={() => selectMode('planned')} className={`rounded-lg border p-2 text-left ${projectMode === 'planned' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><Construction size={15} className="mb-1 text-indigo-600"/><div className="text-[10px] font-bold">Está em obra</div><div className="text-[9px] text-slate-500">Projeto futuro</div></button>
              <button onClick={() => selectMode('concept')} className={`rounded-lg border p-2 text-left ${projectMode === 'concept' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><Wand2 size={15} className="mb-1 text-indigo-600"/><div className="text-[10px] font-bold">Só o conceito</div><div className="text-[9px] text-slate-500">Sem medidas</div></button>
            </div>
          </Card>

          {projectMode === 'ready' ? <div className="grid grid-cols-2 gap-2">
            <Card className={`p-2 h-32 flex items-center justify-center relative border-dashed border-2 ${isRefining ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`}>
              {!sketchImage ? <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-slate-50 transition-colors"><Upload className="text-slate-400" size={20} /><span className="text-[10px] text-slate-500 mt-1 text-center font-medium">Rascunho / referência</span><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'sketch')} /></label> : <img src={sketchImage} className="h-full object-contain" alt="Sketch" />}
              {sketchImage && <button onClick={() => { setSketchImage(null); setIsRefining(false); }} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"><X size={10} /></button>}
            </Card>
            <Card className="p-2 h-32 flex items-center justify-center relative border-dashed border-2 border-slate-300">
              {!envImage ? <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-slate-50 transition-colors"><MapPin className="text-slate-400" size={20} /><span className="text-[10px] text-slate-500 mt-1 text-center font-medium">Foto do ambiente</span><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'env')} /></label> : <img src={envImage} className="h-full object-contain" alt="Environment" />}
              {envImage && <button onClick={() => { resetEnvironmentAnalysis(); setEnvImage(null); }} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"><X size={10} /></button>}
            </Card>
          </div> : <Card className="p-3 border-slate-200 bg-white">
            <div className="flex items-center gap-2 mb-2"><Ruler size={16} className="text-indigo-600"/><span className="text-xs font-bold text-slate-700">Medidas do ambiente planejado <span className="font-normal text-slate-400">(opcional)</span></span></div>
            <div className="grid grid-cols-3 gap-2">
              {(['width', 'height', 'depth'] as const).map(key => <label key={key} className="text-[9px] font-bold uppercase text-slate-500">{key === 'width' ? 'Largura (m)' : key === 'height' ? 'Altura (m)' : 'Profundidade (m)'}<input type="number" min="0" step="0.01" value={plannedDimensions[key]} onChange={e => setPlannedDimensions(prev => ({ ...prev, [key]: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800" placeholder="—" /></label>)}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">Você pode começar sem medidas. Nesse caso, o resultado será tratado como <strong>conceito visual</strong> e não como medida de fabricação.</div>
            <label className="mt-3 flex h-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-[10px] text-slate-500 hover:bg-slate-50"><Upload size={15} className="mr-2"/> Enviar planta, croqui ou foto da obra (opcional)<input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'sketch')} /></label>
            {sketchImage && <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600"><img src={sketchImage} className="h-12 w-12 rounded object-cover" alt="Referência"/> Referência adicionada</div>}
          </Card>}

          {projectMode === 'ready' && envImage && <EnvironmentAnalysisPanel analysis={environmentAnalysis} analyzing={analyzingEnvironment} confirming={confirmingEnvironment} onAnalyze={analyzeEnvironmentImage} onConfirm={confirmEnvironment} onChange={updateEnvironmentAnalysis} />}
          {environmentError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">{environmentError}</p>}

          {descriptionSlot ? <div className="h-[520px] lg:h-[600px]">{descriptionSlot}</div> : <Card className="p-4 bg-slate-800 border-slate-700 text-white">
            <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-slate-400 uppercase">{isRefining ? "Comando de Edição" : projectMode === 'concept' ? "O que o cliente quer?" : "Pedido do cliente"}</label></div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={isRecording ? "Ouvindo..." : (isRefining ? "Ex: Trocar gavetas por prateleiras..." : "Ex: Painel de TV com rack, portas inferiores e nichos...")} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm h-24 outline-none focus:border-indigo-500 resize-none text-white placeholder:text-slate-500" />
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">{styles.map(s => <button key={s.id} onClick={() => setSelectedStyle(s)} className={`px-2 py-1 rounded text-xs whitespace-nowrap border transition-colors ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}`}>{s.label}</button>)}</div>
            <DecorationPanel selectedDecor={selectedDecor} onSelect={setSelectedDecor} />
            {projectMode !== 'ready' && <div className="mt-2 rounded-lg bg-slate-900 p-2 text-[10px] text-slate-400">{projectMode === 'planned' ? 'Projeto para ambiente futuro: a imagem ajuda a vender agora; a conferência final acontece quando a obra estiver pronta.' : 'Conceito comercial: use para apresentar a ideia antes de ter planta ou medidas.'}</div>}
            <Button onClick={generate} disabled={loading} className={`w-full mt-4 border-none ${isRefining ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : (isRefining ? <RefreshCcw size={18} /> : <Wand2 size={18} />)}
              {loading ? "Preparando projeto..." : (isRefining ? "Aplicar Alteração" : projectMode === 'concept' ? "Criar conceito" : "Criar projeto")}
            </Button>
            {error && <p className="text-xs text-red-400 mt-2 bg-red-950/50 p-2 rounded">{error}</p>}
          </Card>}

          {gallery.length > 0 && <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">{gallery.map((img, idx) => <img key={idx} src={img} className={`h-16 w-16 object-cover rounded-lg cursor-pointer border-2 transition-all flex-shrink-0 ${generatedImage === img ? 'border-indigo-500 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`} onClick={() => setGeneratedImage(img)} alt={`Gallery item ${idx}`} />)}</div>}
        </div>

        <div className="lg:col-span-8"><div className="bg-slate-900 rounded-xl border border-slate-800 h-[400px] lg:h-[600px] flex items-center justify-center overflow-hidden relative group">
          {generatedImage ? <><img src={generatedImage} className="w-full h-full object-contain cursor-zoom-in" onClick={() => setShowModal(true)} alt="Generated" /><div className="absolute bottom-4 right-4 flex gap-2"><Button onClick={() => setShowModal(true)} variant="primary" className="text-xs font-bold shadow-xl" icon={Maximize2}>Expandir</Button></div></> : <div className="text-center px-6"><Wand2 className="text-slate-600 mx-auto mb-3" size={40}/><span className="text-slate-500 text-sm">A visualização do projeto aparecerá aqui</span></div>}
        </div></div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={<span className="flex items-center gap-2"><Sparkles className="text-indigo-400" size={18}/> Resultado do projeto</span>} footer={<div className="flex w-full flex-wrap gap-2 justify-end">
        <Button onClick={() => { if (!generatedImage) return; setSketchImage(generatedImage); setSketchBase64(generatedImage.split(',')[1]); setSketchMime('image/png'); setIsRefining(true); setPrompt(""); setShowModal(false); }} variant="magic" icon={RefreshCcw}>Refinar Imagem</Button>
        <Button onClick={handleDownload} variant="secondary" icon={Download}>Baixar</Button>
        <Button onClick={analyzeForBudget} variant="primary" className="bg-emerald-600 hover:bg-emerald-700" icon={DollarSign}>{analyzing ? <Loader2 className="animate-spin" size={18}/> : "Levar ao orçamento"}</Button>
      </div>}>
        <div className="flex items-center justify-center h-full min-h-[50vh]"><img src={generatedImage || ''} className="max-w-full max-h-[70vh] rounded shadow-2xl" alt="Preview"/></div>
      </Modal>

      <AuthDialog isOpen={showAuthDialog} onClose={() => { setShowAuthDialog(false); setPendingAction(null); }} onSuccess={() => { if (pendingAction) pendingAction(); setPendingAction(null); }}/>
    </>
  );
};
