import React, { useRef, useState } from 'react';
import { Mic, MicOff, Send, X, Command, Ruler, Image, ClipboardList, Boxes, Scissors, PackageCheck, Calculator, FileText, ShoppingCart, Wrench, Truck, ListChecks, Camera, PencilLine, Plus, ArrowUpFromLine } from 'lucide-react';
import { IARA_SMART_ACTIONS, type IaraSmartAction } from '../message-system';

type PendingUpload = { base64: string; baseRaw?: string; maskRaw?: string; kind?: 'environment' | 'reference' | 'sketch' | 'plan' };
export type SmartAction = IaraSmartAction & { prompt: string };

const SMART_ACTIONS: Array<{ domain: SmartAction['domain']; title: string; items: SmartAction[] }> = [
  { domain: 'project', title: 'Projeto', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'project').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'production', title: 'Produção', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'production').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'business', title: 'Negócio', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'business').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'execution', title: 'Execução', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'execution').map(a => ({ ...a, prompt: a.intent })) },
];

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'project.analyze': Image, 'project.create': ClipboardList, 'project.measurements': Ruler, 'project.elevation': ArrowUpFromLine,
  'project.render': Image, 'project.review': ClipboardList, 'production.materials': Boxes, 'production.hardware': Wrench,
  'production.cut': Scissors, 'production.inventory': PackageCheck, 'production.production': ClipboardList, 'business.budget': Calculator,
  'business.documents': FileText, 'business.order': ShoppingCart, 'execution.assembly': Wrench, 'execution.installation': Wrench,
  'execution.checklist': ListChecks, 'execution.delivery': Truck,
};

interface ChatInputProps {
  chatInput: string; setChatInput: (val: string) => void; onSend: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>, kind?: PendingUpload['kind']) => void;
  toggleRecording: () => void; isListening: boolean; pendingUpload: PendingUpload | null;
  setPendingUpload: (val: PendingUpload | null) => void; onSmartAction?: (action: SmartAction) => void;
}

export const ChatInput = ({ chatInput, setChatInput, onSend, onImageSelect, toggleRecording, isListening, pendingUpload, setPendingUpload, onSmartAction }: ChatInputProps) => {
  const [open, setOpen] = useState(false);
  const environmentInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const selectImage = (ref: React.RefObject<HTMLInputElement | null>, kind: PendingUpload['kind'], prompt?: string) => {
    setOpen(false);
    if (prompt) setChatInput(prompt);
    ref.current?.click();
  };

  const startElevation = () => selectImage(planInputRef, 'plan', 'Prepare a elevação desta planta.');

  return <footer className="shrink-0 border-t border-border bg-card px-2.5 pt-2.5 sm:p-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:pb-4 relative z-20" aria-label="Compositor da IARA">
    {pendingUpload && <div className="absolute bottom-full left-0 mb-2 ml-3 p-2 bg-card border border-border rounded-2xl shadow-xl flex items-end gap-3 animate-in slide-in-from-bottom-2">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
        <img src={pendingUpload.base64} className="w-full h-full object-cover" alt="Imagem anexada" />
        <button type="button" aria-label="Remover imagem anexada" onClick={() => setPendingUpload(null)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"><X size={10} /></button>
      </div>
      <span className="text-[9px] font-bold text-muted-foreground tracking-wide pb-1">{pendingUpload.kind === 'reference' ? 'Referência' : pendingUpload.kind === 'sketch' ? 'Rascunho' : pendingUpload.kind === 'plan' ? 'Planta' : 'Ambiente'}</span>
    </div>}

    {open && <div role="dialog" aria-label="Adicionar ao contexto da IARA" className="absolute bottom-full left-2 right-2 sm:left-3 sm:right-auto mb-2 w-auto sm:w-[min(430px,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-3 z-30">
      <div className="flex items-center justify-between px-1 pb-2">
        <div><p className="text-xs font-bold">Adicionar ao projeto</p><p className="text-[10px] text-muted-foreground">Escolha o tipo de material para a IARA entender o contexto.</p></div>
        <button type="button" aria-label="Fechar menu adicionar" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-muted"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <button type="button" onClick={() => selectImage(environmentInputRef, 'environment')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors"><Camera size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Foto do ambiente</strong><small className="text-[9px] text-muted-foreground">Câmera ou galeria</small></span></button>
        <button type="button" onClick={() => selectImage(referenceInputRef, 'reference')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors"><Image size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Foto de referência</strong><small className="text-[9px] text-muted-foreground">Estilo ou inspiração</small></span></button>
        <button type="button" onClick={() => selectImage(sketchInputRef, 'sketch')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors"><PencilLine size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Rascunho à mão</strong><small className="text-[9px] text-muted-foreground">Foto do desenho</small></span></button>
        <button type="button" onClick={() => selectImage(planInputRef, 'plan')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors"><Ruler size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Planta / medidas</strong><small className="text-[9px] text-muted-foreground">Planta ou cotas</small></span></button>
        <button type="button" onClick={startElevation} className="col-span-2 flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors"><ArrowUpFromLine size={17} className="shrink-0 text-primary" /><span><strong className="block text-[11px]">Fazer elevação da planta</strong><small className="text-[9px] text-muted-foreground">Envie a planta e a IARA prepara a elevação</small></span></button>
      </div>

      <div className="border-t border-border pt-2">
        <p className="px-1 mb-1.5 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Ações da IARA</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SMART_ACTIONS.flatMap(group => group.items.map(action => ({ group, action }))).map(({ group, action }) => {
            const Icon = ICONS[action.id] ?? Command;
            return <button key={action.id} type="button" onClick={() => { setOpen(false); onSmartAction?.(action); }} aria-label={`${action.label} — ${group.title}`} className="group flex items-center gap-2 text-left px-2.5 py-2.5 min-h-11 rounded-xl border border-border bg-background/70 hover:border-primary/40 hover:bg-primary/5 transition-colors"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors"><Icon size={15} /></span><span className="text-[11px] font-semibold leading-tight">{action.label}</span></button>;
          })}
        </div>
      </div>
    </div>}

    <input ref={environmentInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => onImageSelect(e, 'environment')} />
    <input ref={referenceInputRef} type="file" className="hidden" accept="image/*" onChange={e => onImageSelect(e, 'reference')} />
    <input ref={sketchInputRef} type="file" className="hidden" accept="image/*" onChange={e => onImageSelect(e, 'sketch')} />
    <input ref={planInputRef} type="file" className="hidden" accept="image/*" onChange={e => onImageSelect(e, 'plan')} />

    <div className="flex items-end gap-2">
      <div className="flex gap-1 bg-muted p-1 rounded-2xl border border-border shrink-0">
        <button type="button" aria-label="Adicionar foto, referência ou planta" aria-expanded={open} onClick={() => setOpen(v => !v)} className={`p-2.5 min-w-11 min-h-11 rounded-xl transition-all ${open ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'}`}><Plus size={20} /></button>
        <button type="button" aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'} onClick={toggleRecording} className={`p-2.5 min-w-11 min-h-11 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:text-primary'}`}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button>
      </div>
      <div className="flex-1 relative group">
        <textarea aria-label="Mensagem para a IARA" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={isListening ? 'IARA está ouvindo...' : 'Ex.: Quero uma cozinha em L de 2,80 m, com torre quente e portas lisas...'} className="w-full bg-muted border border-border rounded-2xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none max-h-32 scrollbar-none min-h-11" rows={1} />
        <button type="button" aria-label="Enviar mensagem" onClick={onSend} className="absolute right-2 bottom-1.5 min-w-9 min-h-9 p-2 bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"><Send size={18} /></button>
      </div>
    </div>
  </footer>;
};
