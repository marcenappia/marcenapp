import React from 'react';
import { Paperclip, Mic, MicOff, Send, X } from 'lucide-react';

type PendingUpload = { base64: string; baseRaw?: string; maskRaw?: string };
interface ChatInputProps {
  chatInput: string;
  setChatInput: (val: string) => void;
  onSend: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleRecording: () => void;
  isListening: boolean;
  pendingUpload: PendingUpload | null;
  setPendingUpload: (val: PendingUpload | null) => void;
}

export const ChatInput = ({ chatInput, setChatInput, onSend, onImageSelect, toggleRecording, isListening, pendingUpload, setPendingUpload }: ChatInputProps) => (
  <footer className="bg-card border-t border-border p-3 shrink-0 relative">
    {pendingUpload && (
      <div className="absolute bottom-full left-0 mb-2 ml-3 p-2 bg-card border border-border rounded-2xl shadow-xl flex items-end gap-3 animate-in slide-in-from-bottom-2">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
          <img src={pendingUpload.base64} className="w-full h-full object-cover" alt="Pending" />
          <button type="button" aria-label="Remover imagem" onClick={() => setPendingUpload(null)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white"><X size={10}/></button>
        </div>
        <span className="text-[9px] font-black uppercase text-primary tracking-widest pb-1">Alvo Marcado</span>
      </div>
    )}
    <div className="flex items-end gap-2">
      <div className="flex gap-1 bg-muted p-1 rounded-2xl border border-border">
        <label className="p-2.5 rounded-xl hover:bg-background transition-all cursor-pointer text-muted-foreground hover:text-primary">
          <Paperclip size={18} /><input type="file" className="hidden" accept="image/*" onChange={onImageSelect} />
        </label>
        <button type="button" aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'} onClick={toggleRecording} className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:text-primary'}`}>
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      </div>
      <div className="flex-1 relative group">
        <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={isListening ? 'IARA está ouvindo...' : 'Descreva seu móvel...'} className="w-full bg-muted border border-border rounded-2xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none max-h-32 scrollbar-none" rows={1} />
        <button type="button" aria-label="Enviar mensagem" onClick={onSend} className="absolute right-2 bottom-1.5 p-2 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"><Send size={18} /></button>
      </div>
    </div>
  </footer>
);
