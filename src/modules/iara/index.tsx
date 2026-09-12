import React, { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, PanelRight } from 'lucide-react';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput, type SmartAction } from './components/ChatInput';
import { ContextPanel, type ContextPanelData } from './components/ContextPanel';
import AuthDialog from '../../components/marcenaria/AuthDialog';
import { useIaraChat } from './hooks/useIaraChat';

interface IaraModuleProps {
  syncProject?: { width?: number; height?: number; depth?: number } | null;
  onProjectChange?: (p: { width: number; height: number; depth: number }) => void;
  embedded?: boolean;
  projectId?: string | null;
}

const IaraModule = ({ syncProject, onProjectChange, embedded, projectId = null }: IaraModuleProps = {}) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [contextPanel, setContextPanel] = useState<ContextPanelData | null>(null);
  const [factors, setFactors] = useState({ L: syncProject?.width ?? 2.4, A: syncProject?.height ?? 2.6, P: syncProject?.depth ?? 0.6, E: 0.018, X: 0, Y: 0 });
  const [decorStyle] = useState('Limpo');
  const [activeImageZoom, setActiveImageZoom] = useState<{ url: string; budget?: string | null } | null>(null);
  useEffect(() => { if (!syncProject) return; setFactors(prev => { const next = { ...prev, L: syncProject.width ?? prev.L, A: syncProject.height ?? prev.A, P: syncProject.depth ?? prev.P }; return next.L === prev.L && next.A === prev.A && next.P === prev.P ? prev : next; }); }, [syncProject?.width, syncProject?.height, syncProject?.depth]);
  useEffect(() => { if (!onProjectChange) return; const sameAsStudio = syncProject?.width === factors.L && syncProject?.height === factors.A && syncProject?.depth === factors.P; if (sameAsStudio) return; onProjectChange({ width: factors.L, height: factors.A, depth: factors.P }); }, [factors.L, factors.A, factors.P, onProjectChange, syncProject?.width, syncProject?.height, syncProject?.depth]);
  const { messages, chatInput, setChatInput, isTyping, isListening, handleSend, handleSmartAction, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload, error, retryLast, dismissError } = useIaraChat(factors, decorStyle, setShowAuthDialog, { onProjectCreated: (p) => setFactors(prev => ({ ...prev, L: p.width ?? prev.L, A: p.height ?? prev.A, P: p.depth ?? prev.P })) }, projectId);
  const isDrawingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { if (maskingImage && canvasRef.current) { const c = canvasRef.current; c.width = 1080; c.height = 1920; const ctx = c.getContext('2d'); if (ctx) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 60; ctxRef.current = ctx; } } }, [maskingImage]);
  type CanvasPointerEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;
  const getCoords = (e: CanvasPointerEvent) => { const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return null; const sx = 1080 / rect.width; const sy = 1920 / rect.height; const point = 'touches' in e ? e.touches[0] : e; if (!point) return null; return { offsetX: (point.clientX - rect.left) * sx, offsetY: (point.clientY - rect.top) * sy }; };
  const startDraw = (e: CanvasPointerEvent) => { if (!ctxRef.current) return; const c = getCoords(e); if (!c) return; ctxRef.current.beginPath(); ctxRef.current.moveTo(c.offsetX, c.offsetY); isDrawingRef.current = true; };
  const moveDraw = (e: CanvasPointerEvent) => { if (!isDrawingRef.current || !ctxRef.current) return; const c = getCoords(e); if (!c) return; ctxRef.current.lineTo(c.offsetX, c.offsetY); ctxRef.current.stroke(); };
  const endDraw = () => { isDrawingRef.current = false; };
  const confirmMask = async () => { if (!maskingImage || !canvasRef.current) return; const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920; const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 1080, 1920); const ratio = Math.min(1080 / maskingImage.img.width, 1920 / maskingImage.img.height); const dw = maskingImage.img.width * ratio; const dh = maskingImage.img.height * ratio; ctx.drawImage(maskingImage.img, (1080 - dw) / 2, (1920 - dh) / 2, dw, dh); const baseB64 = canvas.toDataURL('image/jpeg', 0.7); const baseRaw = baseB64.split(',')[1]; ctx.clearRect(0, 0, 1080, 1920); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 1080, 1920); ctx.drawImage(canvasRef.current, 0, 0); const idata = ctx.getImageData(0, 0, 1080, 1920); const d = idata.data; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 10) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255; } else { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; } } ctx.putImageData(idata, 0, 0); const maskRaw = canvas.toDataURL('image/png').split(',')[1]; setPendingUpload({ base64: baseB64, baseRaw, maskRaw }); setMaskingImage(null); };
  const handleChatInputChange = (value: React.SetStateAction<string>) => setChatInput(value);
  const openArtifact = (data: { type: string; id?: string; imageUrl?: string | null }) => setContextPanel({ title: data.type === 'render' ? 'Render do projeto' : data.type === 'budget' ? 'Orçamento do projeto' : 'Artefato do projeto', type: data.type, imageUrl: data.imageUrl, description: projectId ? 'Este conteúdo está vinculado ao projeto e pode ser consultado sem sair da conversa.' : undefined });
  const onSmartAction = (action: SmartAction) => void handleSmartAction(action);
  return (
    <div className={`relative flex min-h-0 flex-col overflow-hidden bg-background ${embedded ? 'h-full' : 'h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]'}`}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-3 py-2 sm:px-5 sm:py-2.5" aria-label="IARA no projeto">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageCircle size={16} aria-hidden="true" /></div>
          <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-foreground">IARA</h2>{projectId && <span className="inline-flex items-center gap-1 text-[9px] font-medium text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Conectada ao projeto</span>}</div><p className="truncate text-[10px] text-muted-foreground">Inteligência do projeto</p></div>
        </div>
        <button type="button" onClick={() => contextPanel ? setContextPanel(null) : setContextPanel({ title: 'Contexto do projeto', type: 'project', description: projectId ? 'O contexto desta conversa permanece vinculado ao projeto atual.' : 'Converse com a IARA para construir o contexto do trabalho.' })} aria-label={contextPanel ? 'Fechar contexto' : 'Abrir contexto do projeto'} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><PanelRight size={17} aria-hidden="true" /></button>
      </header>
      <ChatMessages messages={messages} isTyping={isTyping} onImageZoom={setActiveImageZoom} onArtifactOpen={openArtifact} messagesEndRef={messagesEndRef} error={error} onRetry={retryLast} onDismissError={dismissError} onSuggestion={(text) => setChatInput(text)} />
      <ChatInput chatInput={chatInput} setChatInput={handleChatInputChange} onSend={handleSend} onImageSelect={handleImageSelect} toggleRecording={toggleRecording} isListening={isListening} pendingUpload={pendingUpload} setPendingUpload={setPendingUpload} onSmartAction={onSmartAction} />
      {maskingImage && <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300"><div className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"><img src={maskingImage.src} className="pointer-events-none absolute inset-0 h-full w-full object-contain" alt="Imagem do ambiente" /><canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw} className="absolute inset-0 h-full w-full touch-none cursor-crosshair" /><div className="absolute left-6 right-6 top-6 flex items-center justify-between rounded-2xl border border-white/5 bg-black/40 p-4 backdrop-blur-md"><span className="text-xs font-bold text-white">Marque a área do móvel</span><button type="button" aria-label="Fechar marcação" onClick={() => setMaskingImage(null)} className="p-2 text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={20}/></button></div></div><div className="mt-6 flex w-full max-w-sm gap-3"><button type="button" onClick={() => setMaskingImage(null)} className="min-h-11 flex-1 rounded-xl bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Cancelar</button><button type="button" onClick={confirmMask} className="min-h-11 flex-1 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Confirmar marcação</button></div></div>}
      {activeImageZoom && <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4 animate-in zoom-in-95 duration-200" onClick={() => setActiveImageZoom(null)}><div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}><img src={activeImageZoom.url} className="h-auto w-full rounded-2xl shadow-2xl" alt="Imagem ampliada" /><button type="button" onClick={() => setActiveImageZoom(null)} aria-label="Fechar imagem ampliada" className="absolute -right-2 -top-2 rounded-full bg-white p-3 text-black shadow-2xl hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={24}/></button>{activeImageZoom.budget && <div className="absolute bottom-4 left-4 rounded-xl bg-primary px-4 py-2 shadow-xl"><span className="text-lg font-bold text-primary-foreground">R$ {activeImageZoom.budget}</span></div>}</div></div>}
      <ContextPanel panel={contextPanel} onClose={() => setContextPanel(null)} />
      <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} onSuccess={() => setShowAuthDialog(false)} />
    </div>
  );
};
export default IaraModule;
