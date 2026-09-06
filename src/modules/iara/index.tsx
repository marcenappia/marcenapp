import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, Brain } from 'lucide-react';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { MemoryConflictsPanel } from './components/MemoryConflictsPanel';
import AuthDialog from '../../components/marcenaria/AuthDialog';
import { useIaraChat } from './hooks/useIaraChat';

const LogoHex = ({ size = 40, className = "" }: { size?: number; className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]">
      <defs><linearGradient id="chatLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="hsl(var(--primary))" /><stop offset="100%" stopColor="hsl(234, 88%, 48%)" /></linearGradient></defs>
      <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="hsl(var(--sidebar-bg))" stroke="url(#chatLogoGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="50" y="66" textAnchor="middle" fontSize="46" fontWeight="900" fill="white" style={{ fontFamily: 'system-ui', fontStyle: 'italic', letterSpacing: '-2px' }}>M</text>
      <circle cx="50" cy="34" r="6" fill="hsl(var(--primary))" />
    </svg>
  </div>
);

interface IaraModuleProps {
  syncProject?: { width?: number; height?: number; depth?: number } | null;
  onProjectChange?: (p: { width: number; height: number; depth: number }) => void;
  syncDescription?: string;
  onDescriptionChange?: (text: string) => void;
  embedded?: boolean;
  projectId?: string | null;
}

const IaraModule = ({ syncProject, onProjectChange, syncDescription, onDescriptionChange, embedded, projectId = null }: IaraModuleProps = {}) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [factors, setFactors] = useState({ L: syncProject?.width ?? 2.4, A: syncProject?.height ?? 2.6, P: syncProject?.depth ?? 0.6, E: 0.018, X: 0, Y: 0 });
  const [decorStyle] = useState("Limpo");
  const [activeImageZoom, setActiveImageZoom] = useState<{ url: string; budget?: string | null } | null>(null);

  useEffect(() => {
    if (!syncProject) return;
    setFactors(prev => ({ ...prev, L: syncProject.width ?? prev.L, A: syncProject.height ?? prev.A, P: syncProject.depth ?? prev.P }));
  }, [syncProject?.width, syncProject?.height, syncProject?.depth]);

  useEffect(() => {
    if (!onProjectChange) return;
    const sameAsStudio = syncProject?.width === factors.L && syncProject?.height === factors.A && syncProject?.depth === factors.P;
    if (sameAsStudio) return;
    onProjectChange({ width: factors.L, height: factors.A, depth: factors.P });
  }, [factors.L, factors.A, factors.P]);

  const { messages, chatInput, setChatInput, isTyping, isListening, handleSend, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload, error, retryLast, dismissError, memoryEvidence, memoryConflictCount, memory, resolveMemoryConflict } = useIaraChat(factors, decorStyle, setShowAuthDialog, {
    onProjectCreated: (p) => setFactors(prev => ({ ...prev, L: p.width ?? prev.L, A: p.height ?? prev.A, P: p.depth ?? prev.P })),
  }, projectId);

  const lastPushedRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pushDescription = (text: string, immediate = false) => {
    if (!onDescriptionChange) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    const doPush = () => { lastPushedRef.current = text; onDescriptionChange(text); };
    if (immediate) doPush(); else pushTimerRef.current = setTimeout(doPush, 300);
  };
  useEffect(() => () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); }, []);
  useEffect(() => { if (syncDescription === undefined || syncDescription === lastPushedRef.current) return; if (syncDescription !== chatInput) setChatInput(syncDescription); }, [syncDescription]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => {
    if (!maskingImage || !canvasRef.current) return;
    const c = canvasRef.current; c.width = 1080; c.height = 1920;
    const ctx = c.getContext('2d');
    if (ctx) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 60; ctxRef.current = ctx; }
  }, [maskingImage]);
  const getCoords = (e: any) => { const rect = canvasRef.current!.getBoundingClientRect(); const sx = 1080 / rect.width; const sy = 1920 / rect.height; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; return { offsetX: (cx - rect.left) * sx, offsetY: (cy - rect.top) * sy }; };
  const startDraw = (e: any) => { if (!ctxRef.current) return; ctxRef.current.beginPath(); const c = getCoords(e); ctxRef.current.moveTo(c.offsetX, c.offsetY); (canvasRef.current as any).isDrawing = true; };
  const moveDraw = (e: any) => { if (!(canvasRef.current as any)?.isDrawing || !ctxRef.current) return; const c = getCoords(e); ctxRef.current.lineTo(c.offsetX, c.offsetY); ctxRef.current.stroke(); };
  const endDraw = () => { if (canvasRef.current) (canvasRef.current as any).isDrawing = false; };

  const confirmMask = async () => {
    if (!maskingImage || !canvasRef.current) return;
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, 1080, 1920);
    const ratio = Math.min(1080 / maskingImage.img.width, 1920 / maskingImage.img.height); const dw = maskingImage.img.width * ratio; const dh = maskingImage.img.height * ratio;
    ctx.drawImage(maskingImage.img, (1080 - dw)/2, (1920 - dh)/2, dw, dh);
    const baseB64 = canvas.toDataURL("image/jpeg", 0.7); const baseRaw = baseB64.split(",")[1];
    ctx.clearRect(0,0,1080,1920); ctx.fillStyle = "#000000"; ctx.fillRect(0,0,1080,1920); ctx.drawImage(canvasRef.current, 0, 0);
    const idata = ctx.getImageData(0,0,1080,1920); const d = idata.data;
    for(let i=0; i<d.length; i+=4) { if(d[i+3]>10) { d[i]=d[i+1]=d[i+2]=255; d[i+3]=255; } else { d[i]=d[i+1]=d[i+2]=0; d[i+3]=255; } }
    ctx.putImageData(idata, 0, 0); const maskRaw = canvas.toDataURL("image/png").split(",")[1];
    setPendingUpload({ base64: baseB64, baseRaw, maskRaw }); setMaskingImage(null);
  };

  const memoryLabel = memoryEvidence === 'confirmed' ? 'Medidas confirmadas' : memoryEvidence === 'estimated' ? 'Medidas estimadas' : 'Medidas ainda não conferidas';
  const memoryClass = memoryEvidence === 'confirmed' ? 'text-emerald-600' : memoryEvidence === 'estimated' ? 'text-amber-600' : 'text-orange-600';

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]'} bg-background relative overflow-hidden rounded-xl border border-border`}>
      <header className="px-4 py-3 bg-card border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <LogoHex size={36} />
          <div>
            <h2 className="text-sm font-black text-foreground leading-none uppercase italic tracking-tight">IARA — Assistente técnica</h2>
            <div className="flex items-center gap-2 mt-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-[9px] text-green-600 uppercase font-bold tracking-widest">Online</span><span className={`text-[9px] font-bold ${memoryClass}`}>{memoryLabel}</span>{memoryConflictCount > 0 && <span className="text-[9px] font-bold text-red-600">• {memoryConflictCount} conflito(s)</span>}</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"><Brain size={13} className="text-primary" /><span>Memória operacional · conferência antes de decisões críticas</span></div>
      </header>
      <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2 text-[10px] text-muted-foreground"><ShieldCheck size={14} className="shrink-0 text-primary" /><span><strong className="text-foreground">Modo técnico seguro:</strong> medidas estimadas não viram produção automaticamente. A IARA acompanha o que foi confirmado e sinaliza conflitos antes de uma decisão irreversível.</span></div>
      <MemoryConflictsPanel memory={memory} onResolve={resolveMemoryConflict} />
      <ChatMessages messages={messages} isTyping={isTyping} onImageZoom={setActiveImageZoom} messagesEndRef={messagesEndRef} error={error} onRetry={retryLast} onDismissError={dismissError} onSuggestion={(text) => { setChatInput(text); pushDescription(text, true); }} />
      <ChatInput chatInput={chatInput} setChatInput={(v) => { setChatInput(v); pushDescription(typeof v === 'function' ? (v as any)(chatInput) : v); }} onSend={() => { const sent = chatInput.trim(); if (sent) pushDescription(sent, true); handleSend(); }} onImageSelect={handleImageSelect} toggleRecording={toggleRecording} isListening={isListening} pendingUpload={pendingUpload} setPendingUpload={setPendingUpload} />
      {maskingImage && <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"><div className="w-full max-w-sm aspect-[9/16] relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"><img src={maskingImage.src} className="absolute inset-0 w-full h-full object-contain pointer-events-none" /><canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" /><div className="absolute top-6 left-6 right-6 flex justify-between items-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5"><span className="text-white text-xs font-black uppercase tracking-tighter italic">IARA Target Painter</span><button onClick={() => setMaskingImage(null)} className="text-white/60 hover:text-white transition-colors"><X size={20}/></button></div></div><div className="mt-8 flex gap-4 w-full max-w-sm"><button onClick={() => setMaskingImage(null)} className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">Cancelar</button><button onClick={confirmMask} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Confirmar Alvo</button></div></div>}
      {activeImageZoom && <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setActiveImageZoom(null)}><div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}><img src={activeImageZoom.url} className="w-full h-auto rounded-2xl shadow-2xl" alt="Zoom" /><button onClick={() => setActiveImageZoom(null)} className="absolute -top-4 -right-4 p-3 bg-white text-black rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"><X size={24}/></button>{activeImageZoom.budget && <div className="absolute bottom-6 left-6 bg-primary/90 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/20 shadow-2xl"><span className="text-white font-black italic tracking-tighter text-xl">R$ {activeImageZoom.budget}</span></div>}</div></div>}
      <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} onSuccess={() => setShowAuthDialog(false)} />
    </div>
  );
};
export default IaraModule;
