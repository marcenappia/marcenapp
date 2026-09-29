import React, { useState } from 'react';
import { Upload, MapPin, RefreshCcw, Loader2, Download, DollarSign, Maximize2, X } from 'lucide-react';
import { Button, Card, Modal, DecorationPanel } from '@/components/marcenaria/shared';
import AuthDialog from '@/components/marcenaria/AuthDialog';
import { useStudio } from './hooks/useStudio';
import type { ProjectData } from '@/modules/projetos/types';

interface StudioProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  descriptionSlot?: React.ReactNode;
}

export const StudioView = ({ setBudgetProject, navigateTo, gallery, setGallery, descriptionSlot }: StudioProps) => {
  const {
    prompt, setPrompt, sketchImage, setSketchImage, envImage, setEnvImage,
    generatedImage, setGeneratedImage, loading, analyzing, selectedDecor, setSelectedDecor,
    isRefining, setIsRefining, error, showModal, setShowModal,
    selectedStyle, setSelectedStyle, showAuthDialog, setShowAuthDialog, pendingAction, setPendingAction,
    generate, analyzeForBudget, styles, setSketchBase64, setSketchMime, setEnvBase64, setEnvMime
  } = useStudio(setBudgetProject, navigateTo, gallery, setGallery);

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

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Card className={`p-2 h-32 flex items-center justify-center relative border-dashed border-2 ${isRefining ? 'border-slate-400 bg-slate-50' : 'border-slate-300'}`}>
              {!sketchImage ? (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-slate-50 transition-colors">
                  <Upload className="text-slate-400" size={20} />
                  <span className="text-[10px] text-slate-500 mt-1 text-center font-medium">Rascunho / Imagem</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'sketch')} />
                </label>
              ) : <img src={sketchImage} className="h-full object-contain" alt="Sketch" />}
              {sketchImage && <button onClick={() => { setSketchImage(null); setIsRefining(false); }} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-50 hover:text-red-500 transition-colors"><X size={10} /></button>}
            </Card>
            <Card className="p-2 h-32 flex items-center justify-center relative border-dashed border-2 border-slate-300">
              {!envImage ? (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-slate-50 transition-colors">
                  <MapPin className="text-slate-400" size={20} />
                  <span className="text-[10px] text-slate-500 mt-1 text-center font-medium">Ambiente Real</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'env')} />
                </label>
              ) : <img src={envImage} className="h-full object-contain" alt="Environment" />}
              {envImage && <button onClick={() => setEnvImage(null)} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-50 hover:text-red-500 transition-colors"><X size={10} /></button>}
            </Card>
          </div>
          {descriptionSlot ? <div className="h-[520px] lg:h-[600px]">{descriptionSlot}</div> : <Card className="p-4 bg-white border-slate-200 text-slate-900">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{isRefining ? 'Comando de Edição' : 'Descrição do Projeto'}</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={isRefining ? 'Ex: Trocar gavetas por prateleiras...' : 'Ex: Cozinha estilo industrial...'} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm h-24 outline-none focus:border-slate-400 resize-none text-slate-900 placeholder:text-slate-400" />
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">{styles.map(s => <button key={s.id} onClick={() => setSelectedStyle(s)} className={`px-2 py-1 rounded text-xs whitespace-nowrap border transition-colors ${selectedStyle.id === s.id ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s.label}</button>)}</div>
            <DecorationPanel selectedDecor={selectedDecor} onSelect={setSelectedDecor} />
            <Button onClick={generate} disabled={loading} className="w-full mt-4 border-none">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
              {loading ? 'Processando...' : (isRefining ? 'Aplicar alteração' : 'Gerar render')}
            </Button>
            {error && <p className="text-xs text-red-700 mt-2 bg-red-50 border border-red-200 p-2 rounded-lg">{error}</p>}
          </Card>}
          {gallery.length > 0 && <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">{gallery.map((img, idx) => <img key={idx} src={img} className={`h-16 w-16 object-cover rounded-lg cursor-pointer border-2 transition-all flex-shrink-0 ${generatedImage === img ? 'border-indigo-500 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`} onClick={() => setGeneratedImage(img)} alt={`Gallery item ${idx}`} />)}</div>}
        </div>
        <div className="lg:col-span-8"><div className="bg-slate-950 rounded-xl border border-slate-800 h-[400px] lg:h-[600px] flex items-center justify-center overflow-hidden relative group">{generatedImage ? <><img src={generatedImage} className="w-full h-full object-contain cursor-zoom-in" onClick={() => setShowModal(true)} alt="Generated" /><div className="absolute bottom-4 right-4 flex gap-2"><Button onClick={() => setShowModal(true)} variant="primary" className="text-xs font-bold" icon={Maximize2}>Expandir</Button></div></> : <div className="text-center px-6"><span className="text-slate-500 text-sm">O render do ambiente aparecerá aqui.</span></div>}</div></div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Render do projeto" footer={<div className="flex w-full flex-wrap gap-2 justify-end"><Button onClick={() => { if (!generatedImage) return; setSketchImage(generatedImage); setSketchBase64(generatedImage.split(',')[1]); setSketchMime('image/png'); setIsRefining(true); setPrompt(''); setShowModal(false); }} variant="secondary" icon={RefreshCcw}>Refinar imagem</Button><Button onClick={handleDownload} variant="secondary" icon={Download}>Baixar</Button><Button onClick={analyzeForBudget} variant="primary" className="" icon={DollarSign}>{analyzing ? <Loader2 className="animate-spin" size={18} /> : 'Orçamento'}</Button></div>}>
        <div className="flex items-center justify-center h-full min-h-[50vh]"><img src={generatedImage || ''} className="max-w-full max-h-[70vh] rounded-xl" alt="Preview" /></div>
      </Modal>
      <AuthDialog isOpen={showAuthDialog} onClose={() => { setShowAuthDialog(false); setPendingAction(null); }} onSuccess={() => { if (pendingAction) pendingAction(); setPendingAction(null); }} />
    </>
  );
};

export const Studio = StudioView;
