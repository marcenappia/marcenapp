import React, { useRef, useState } from 'react';
import { Mic, MicOff, Send, X, Command, Ruler, Image, ClipboardList, Boxes, Scissors, PackageCheck, Calculator, FileText, ShoppingCart, Wrench, Truck, ListChecks, Camera, Paperclip, PencilLine } from 'lucide-react';
import { IARA_SMART_ACTIONS, type IaraSmartAction } from '../message-system';

type PendingUpload = { base64: string; baseRaw?: string; maskRaw?: string };
export type SmartAction = IaraSmartAction & { prompt: string };

const SMART_ACTIONS: Array<{ domain: SmartAction['domain']; title: string; items: SmartAction[] }> = [
  { domain: 'project', title: 'Projeto', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'project').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'production', title: 'Produção', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'production').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'business', title: 'Negócio', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'business').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'execution', title: 'Execução', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'execution').map(a => ({ ...a, prompt: a.intent })) },
];

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'project.analyze': Image, 'project.create': ClipboardList, 'project.measurements': Ruler, 'project.render': Image, 'project.review': ClipboardList,
  'production.materials': Boxes, 'production.hardware': Wrench, 'production.cut': Scissors, 'production.inventory': PackageCheck, 'production.production': ClipboardList,
  'business.budget': Calculator, 'business.documents': FileText, 'business.order': ShoppingCart,
  'execution.assembly': Wrench, 'execution.installation': Wrench, 'execution.checklist': ListChecks, 'execution.delivery': Truck,
};

interface ChatInputProps {
  chatInput: string; setChatInput: (val: string) => void; onSend: () => void; onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleRecording: () => void; isListening: boolean; pendingUpload: PendingUpload | null; setPendingUpload: (val: PendingUpload | null) => void;
  onSmartAction?: (action: SmartAction) => void;
}

export const ChatInput = ({ chatInput, setChatInput, onSend, onImageSelect, toggleRecording, isListening, pendingUpload, setPendingUpload, onSmartAction }: ChatInputProps) => {
  const [open, setOpen] = useState(false);
  const environmentInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const generalImageInputRef = useRef<HTMLInputElement>(null);

  const selectImage = (ref: React.RefObject<HTMLInputElement | null>) => {
    setOpen(false);
    ref.current?.click();
  };

  return (
    <footer className="bg-card border-t border-border p-3 sm:p-4 shrink-0 relative" aria-label="Compositor da IARA">
      {pendingUpload && <div className="absolute bottom-full left-0 mb-2 ml-3 p-2 bg-card border border-border rounded-2xl shadow-xl flex items-end gap-3 animate-in slide-in-from-bottom-2"><div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border"><img src={pendingUpload.base64} className="w-full h-full object-cover" alt="Imagem anexada" /><button type="button" aria-label="Remover imagem anexada" onClick={() => setPendingUpload(null)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={10}/></button></div><span className="text-[9px] font-bold text-muted-foreground tracking-wide pb-1">Imagem anexada</span></div>}

      {open && <div role="dialog" aria-label="Adicionar ao contexto da IARA" className="absolute bottom-full left-3 right-3 sm:left-3 sm:right-auto mb-2 w-auto sm:w-[min(430px,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-3 z-30">
        <div className="flex items-center justify-between px-1 pb-2">
          <div><p className="text-xs font-bold">Adicionar</p><p className="text-[10px] text-muted-foreground">Traga uma imagem ou referência para a conversa.</p></div>
          <button type="button" aria-label="Fechar menu adicionar" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X size={16}/></button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <button type="button" onClick={() => selectImage(environmentInputRef)} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Camera size={17} className="shrink-0 text-muted-foreground"/><span><strong className="block text-[11px]">Foto do ambiente</strong><small className="text-[9px] text-muted-foreground">Câmera ou galeria</small></span></button>
          <button type="button" onClick={() => selectImage(referenceInputRef)} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Image size={17} className="shrink-0 text-muted-foreground"/><span><strong className="block text-[11px]">Foto de referência</strong><small className="text-[9px] text-muted-foreground">Estilo ou inspiração</small></span></button>
          <button type="button" onClick={() => selectImage(sketchInputRef)} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><PencilLine size={17} className="shrink-0 text-muted-foreground"/><span><strong className="block text-[11px]">Rascunho à mão</strong><small className="text-[9px] text-muted-foreground">Foto do desenho</small></span></button>
          <button type="button" onClick={() => selectImage(planInputRef)} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Ruler size={17} className="shrink-0 text-muted-foreground"/><span><strong className="block text-[11px]">Planta / medidas</strong><small className="text-[9px] text-muted-foreground">Planta ou cotas</small></span></button>
        </div>
        <div className="border-t border-border pt-2">
          <p className="px-1 mb-1.5 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Ações da IARA</p>
          <div className="grid grid-cols-2 gap-1.5">{SMART_ACTIONS.flatMap(group => group.items.map(action => ({ group, action }))).map(({ group, action }) => { const Icon = ICONS[action.id] ?? Command; return <button key={action.id} type="button" onClick={() => { setOpen(false); onSmartAction?.(action); }} className="flex items-center gap-2 text-left px-2.5 py-2.5 min-h-11 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Icon size={15} className="shrink-0 text-muted-foreground" aria-hidden="true"/><span className="text-[11px] font-semibold">{action.label}</span><span className="sr-only">{group.title}</span></button>; })}</div>
        </div>
      </div>}

      <input ref={environmentInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={onImageSelect} />
      <input ref={referenceInputRef} type="file" className="hidden" accept="image/*" onChange={onImageSelect} />
      <input ref={sketchInputRef} type="file" className="hidden" accept="image/*" onChange={onImageSelect} />
      <input ref={planInputRef} type="file" className="hidden" accept="image/*" onChange={onImageSelect} />
      <input ref={generalImageInputRef} type="file" className="hidden" accept="image/*" onChange={onImageSelect} />

      <div className="flex items-end gap-2">
        <div className="flex gap-1 bg-muted p-1 rounded-2xl border border-border shrink-0">
          <button type="button" aria-label="Adicionar foto, referência ou planta" aria-expanded={open} onClick={() => setOpen(v => !v)} className={`p-2.5 min-w-11 min-h-11 rounded-xl transition-all ${open ? 'bg-background text-primary' : 'text-muted-foreground hover:text-primary'}`}><Command size={18} aria-hidden="true" /></button>
          <button type="button" aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'} onClick={toggleRecording} className={`p-2.5 min-w-11 min-h-11 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:text-primary'}`}>{isListening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}</button>
        </div>
        <div className="flex-1 relative group"><textarea aria-label="Mensagem para a IARA" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={isListening ? 'IARA está ouvindo...' : 'Descreva o que você quer fazer...'} className="w-full bg-muted border border-border rounded-2xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none max-h-32 scrollbar-none min-h-11" rows={1} /><button type="button" aria-label="Enviar mensagem" onClick={onSend} className="absolute right-2 bottom-1.5 min-w-9 min-h-9 p-2 bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Send size={18}/></button></div>
      </div>
    </footer>
  );
};
