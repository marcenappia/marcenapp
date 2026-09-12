import React, { useState } from 'react';
import { Paperclip, Mic, MicOff, Send, X, Command, Ruler, Image, ClipboardList, Boxes, Scissors, PackageCheck, Calculator, FileText, ShoppingCart, Wrench, Truck, ListChecks } from 'lucide-react';

type PendingUpload = { base64: string; baseRaw?: string; maskRaw?: string };
export type SmartAction = { id: string; label: string; prompt: string; domain: 'project' | 'production' | 'business' | 'execution' };

export const SMART_ACTIONS: Array<{ domain: SmartAction['domain']; title: string; items: SmartAction[] }> = [
  { domain: 'project', title: 'IARA · Projeto', items: [
    { id: 'analyze_environment', label: 'Analisar ambiente', prompt: 'Analise o ambiente e identifique os pontos importantes para o projeto.', domain: 'project' },
    { id: 'create_project', label: 'Criar projeto', prompt: 'Crie o projeto com os dados que já temos nesta conversa.', domain: 'project' },
    { id: 'check_measurements', label: 'Conferir medidas', prompt: 'Confira as medidas e a consistência técnica deste projeto.', domain: 'project' },
    { id: 'render', label: 'Gerar render', prompt: 'Gere um render deste projeto.', domain: 'project' },
    { id: 'review_project', label: 'Revisar projeto', prompt: 'Revise o projeto e aponte o que precisa de atenção.', domain: 'project' },
  ]},
  { domain: 'production', title: 'BENTO · Produção', items: [
    { id: 'materials', label: 'Materiais', prompt: 'Liste e organize os materiais deste projeto.', domain: 'production' },
    { id: 'hardware', label: 'Ferragens', prompt: 'Liste e organize as ferragens deste projeto.', domain: 'production' },
    { id: 'cut', label: 'Plano de corte', prompt: 'Gere o plano de corte deste projeto.', domain: 'production' },
    { id: 'inventory', label: 'Consultar estoque', prompt: 'Confira o estoque necessário para este projeto.', domain: 'production' },
    { id: 'production', label: 'Preparar produção', prompt: 'Prepare a produção deste projeto.', domain: 'production' },
  ]},
  { domain: 'business', title: 'ESTELA · Negócio', items: [
    { id: 'budget', label: 'Orçamento', prompt: 'Calcule o orçamento deste projeto.', domain: 'business' },
    { id: 'documents', label: 'Documentos', prompt: 'Prepare os documentos deste projeto.', domain: 'business' },
    { id: 'order', label: 'Pedido', prompt: 'Prepare o pedido deste projeto.', domain: 'business' },
  ]},
  { domain: 'execution', title: 'JUCA · Execução', items: [
    { id: 'assembly', label: 'Montagem', prompt: 'Prepare a orientação de montagem deste projeto.', domain: 'execution' },
    { id: 'installation', label: 'Instalação', prompt: 'Prepare a orientação de instalação deste projeto.', domain: 'execution' },
    { id: 'checklist', label: 'Checklist', prompt: 'Prepare um checklist de execução deste projeto.', domain: 'execution' },
    { id: 'delivery', label: 'Entrega', prompt: 'Prepare o checklist de entrega deste projeto.', domain: 'execution' },
  ]},
];

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { analyze_environment: Image, create_project: ClipboardList, check_measurements: Ruler, render: Image, review_project: ClipboardList, materials: Boxes, hardware: Wrench, cut: Scissors, inventory: PackageCheck, production: ClipboardList, budget: Calculator, documents: FileText, order: ShoppingCart, assembly: Wrench, installation: Wrench, checklist: ListChecks, delivery: Truck };

interface ChatInputProps {
  chatInput: string; setChatInput: (val: string) => void; onSend: () => void; onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleRecording: () => void; isListening: boolean; pendingUpload: PendingUpload | null; setPendingUpload: (val: PendingUpload | null) => void;
  onSmartAction?: (action: SmartAction) => void;
}

export const ChatInput = ({ chatInput, setChatInput, onSend, onImageSelect, toggleRecording, isListening, pendingUpload, setPendingUpload, onSmartAction }: ChatInputProps) => {
  const [open, setOpen] = useState(false);
  return (
    <footer className="bg-card border-t border-border p-3 shrink-0 relative">
      {pendingUpload && <div className="absolute bottom-full left-0 mb-2 ml-3 p-2 bg-card border border-border rounded-2xl shadow-xl flex items-end gap-3 animate-in slide-in-from-bottom-2"><div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border"><img src={pendingUpload.base64} className="w-full h-full object-cover" alt="Pendente" /><button type="button" aria-label="Remover imagem" onClick={() => setPendingUpload(null)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white"><X size={10}/></button></div><span className="text-[9px] font-black uppercase text-primary tracking-widest pb-1">Alvo Marcado</span></div>}
      {open && <div role="dialog" aria-label="Capacidades da IARA" className="absolute bottom-full right-3 mb-2 w-[min(420px,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-3 z-30"><div className="flex items-center justify-between px-1 pb-2"><div><p className="text-xs font-black">Capacidades</p><p className="text-[10px] text-muted-foreground">Escolha o que a IARA deve fazer</p></div><button type="button" aria-label="Fechar capacidades" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16}/></button></div><div className="grid gap-3">{SMART_ACTIONS.map(group => <section key={group.domain}><p className="px-1 mb-1.5 text-[9px] uppercase tracking-widest font-black text-muted-foreground">{group.title}</p><div className="grid grid-cols-2 gap-1.5">{group.items.map(action => { const Icon = ICONS[action.id] ?? Command; return <button key={action.id} type="button" onClick={() => { setOpen(false); onSmartAction?.(action); }} className="flex items-center gap-2 text-left px-2.5 py-2.5 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Icon size={15} className="shrink-0 text-muted-foreground"/><span className="text-[11px] font-semibold">{action.label}</span></button>; })}</div></section>)}</div></div>}
      <div className="flex items-end gap-2">
        <div className="flex gap-1 bg-muted p-1 rounded-2xl border border-border">
          <label className="p-2.5 rounded-xl hover:bg-background transition-all cursor-pointer text-muted-foreground hover:text-primary"><Paperclip size={18} /><input type="file" className="hidden" accept="image/*" onChange={onImageSelect} /></label>
          <button type="button" aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'} onClick={toggleRecording} className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:text-primary'}`}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button>
          <button type="button" aria-label="Abrir capacidades da IARA" aria-expanded={open} onClick={() => setOpen(v => !v)} className={`p-2.5 rounded-xl transition-all ${open ? 'bg-background text-primary' : 'text-muted-foreground hover:text-primary'}`}><Command size={18} /></button>
        </div>
        <div className="flex-1 relative group"><textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={isListening ? 'IARA está ouvindo...' : 'Descreva seu móvel...'} className="w-full bg-muted border border-border rounded-2xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none max-h-32 scrollbar-none" rows={1} /><button type="button" aria-label="Enviar mensagem" onClick={onSend} className="absolute right-2 bottom-1.5 p-2 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"><Send size={18} /></button></div>
      </div>
    </footer>
  );
};
