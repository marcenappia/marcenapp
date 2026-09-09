import React from 'react';
import { Upload, MapPin, Wand2, RefreshCcw, Loader2, Sparkles, Download, DollarSign, Maximize2, X } from 'lucide-react';
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
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
              <Sparkles size={14} /> MARCENA
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">Do rascunho ao 3D em minutos.</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Prepare a referência, conte o que o cliente quer e deixe a IARA ajudar a transformar a ideia em uma apresentação visual.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500">IARA + visualização + refinamento</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400 md:grid-cols-5">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2 text-indigo-700">1 · Referência</div>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">2 · Briefing</div>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">3 · IARA</div>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">4 · 3D</div>
        <div className="col-span-3 rounded-lg border border-slate-200 bg-white px-2 py-2 md:col-span-1">5 · Apresentação</div>
      </div>

      <div className="grid grid-cols-1 gap-6 animate-in fade-in pb-20 md:pb-0 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className={`relative flex h-36 items-center justify-center rounded-xl border-2 border-dashed p-2 ${isRefining ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-white'}`}>
              {!sketchImage ? (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-lg hover:bg-slate-50 transition-colors">
                  <Upload className="text-slate-400" size={22} />
                  <span className="mt-2 text-[10px] font-bold text-slate-600">Rascunho / referência</span>
                  <span className="mt-1 text-[9px] text-slate-400">Croqui, planta ou imagem</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'sketch')} />
                </label>
              ) : <img src={sketchImage} className="h-full w-full rounded-lg object-contain" alt="Rascunho ou referência" />}
              {sketchImage && <button aria-label="Remover referência" onClick={() => { setSketchImage(null); setIsRefining(false); }} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow hover:bg-red-50 hover:text-red-500 transition-colors"><X size={11} /></button>}
            </Card>
            <Card className="relative flex h-36 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-2">
              {!envImage ? (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-lg hover:bg-slate-50 transition-colors">
                  <MapPin className="text-slate-400" size={22} />
                  <span className="mt-2 text-[10px] font-bold text-slate-600">Foto do ambiente</span>
                  <span className="mt-1 text-[9px] text-slate-400">Ambiente real do cliente</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'env')} />
                </label>
              ) : <img src={envImage} className="h-full w-full rounded-lg object-contain" alt="Foto do ambiente" />}
              {envImage && <button aria-label="Remover foto do ambiente" onClick={() => setEnvImage(null)} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow hover:bg-red-50 hover:text-red-500 transition-colors"><X size={11} /></button>}
            </Card>
          </div>

          {descriptionSlot ? (
            <div className="h-[520px] lg:h-[600px]">{descriptionSlot}</div>
          ) : (
            <Card className="rounded-2xl border-slate-700 bg-slate-900 p-5 text-white shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">{isRefining ? 'Refinar apresentação' : 'Briefing do cliente'}</label>
                  <p className="mt-1 text-[10px] text-slate-500">Descreva o ambiente e o móvel que precisa aparecer.</p>
                </div>
                <Wand2 size={17} className="text-indigo-400" />
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={isRefining ? 'Ex.: Trocar gavetas por prateleiras e manter o acabamento...' : 'Ex.: Cozinha planejada em L, bancada clara, torre quente e armários superiores...'} className="h-28 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500" />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {styles.map(s => <button key={s.id} onClick={() => setSelectedStyle(s)} className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs transition-colors ${selectedStyle.id === s.id ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>{s.label}</button>)}
              </div>
              <DecorationPanel selectedDecor={selectedDecor} onSelect={setSelectedDecor} />
              <Button onClick={generate} disabled={loading} className={`mt-4 w-full border-none ${isRefining ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : (isRefining ? <RefreshCcw size={18} /> : <Wand2 size={18} />)}
                {loading ? 'Criando visual...' : (isRefining ? 'Aplicar refinamento' : 'Criar visualização')}
              </Button>
              {error && <p className="mt-2 rounded-lg bg-red-950/50 p-2 text-xs text-red-400">{error}</p>}
            </Card>
          )}

          {gallery.length > 0 && <div><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Variações</span><span className="text-[10px] text-slate-400">{gallery.length}</span></div><div className="flex gap-2 overflow-x-auto pb-2">{gallery.map((img, idx) => <img key={idx} src={img} className={`h-16 w-16 shrink-0 cursor-pointer rounded-lg object-cover border-2 transition-all ${generatedImage === img ? 'border-indigo-500 shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'}`} onClick={() => setGeneratedImage(img)} alt={`Variação ${idx + 1}`} />)}</div></div>}
        </div>

        <div className="lg:col-span-8">
          <div className="mb-2 flex items-center justify-between"><div><span className="text-xs font-black uppercase tracking-wider text-slate-700">Apresentação visual</span><p className="text-[10px] text-slate-400">Aqui você confere o resultado antes de apresentar ao cliente.</p></div>{generatedImage && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">Pronto para apresentar</span>}</div>
          <div className="relative flex h-[400px] items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl lg:h-[600px]">
            {generatedImage ? <><img src={generatedImage} className="h-full w-full cursor-zoom-in object-contain" onClick={() => setShowModal(true)} alt="Apresentação visual gerada" /><div className="absolute bottom-4 right-4 flex gap-2"><Button onClick={() => setShowModal(true)} variant="primary" className="text-xs font-bold shadow-xl" icon={Maximize2}>Expandir</Button></div></> : <div className="max-w-sm px-6 text-center"><Wand2 className="mx-auto mb-4 text-slate-700" size={44} /><p className="text-sm font-semibold text-slate-400">Sua apresentação visual aparecerá aqui.</p><p className="mt-1 text-xs leading-relaxed text-slate-600">Comece pelo rascunho, pela foto do ambiente ou pelo briefing do cliente.</p></div>}
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={<span className="flex items-center gap-2"><Sparkles className="text-indigo-400" size={18} /> Apresentação MARCENA</span>} footer={<div className="flex w-full flex-wrap justify-end gap-2"><Button onClick={() => { if (!generatedImage) return; setSketchImage(generatedImage); setSketchBase64(generatedImage.split(',')[1]); setSketchMime('image/png'); setIsRefining(true); setPrompt(''); setShowModal(false); }} variant="magic" icon={RefreshCcw}>Refinar imagem</Button><Button onClick={handleDownload} variant="secondary" icon={Download}>Baixar</Button><Button onClick={analyzeForBudget} variant="primary" className="bg-emerald-600 hover:bg-emerald-700" icon={DollarSign}>{analyzing ? <Loader2 className="animate-spin" size={18} /> : 'Levar para orçamento'}</Button></div>}>
        <div className="flex h-full min-h-[50vh] items-center justify-center"><img src={generatedImage || ''} className="max-h-[70vh] max-w-full rounded shadow-2xl" alt="Apresentação MARCENA" /></div>
      </Modal>

      <AuthDialog isOpen={showAuthDialog} onClose={() => { setShowAuthDialog(false); setPendingAction(null); }} onSuccess={() => { if (pendingAction) pendingAction(); setPendingAction(null); }} />
    </>
  );
};
