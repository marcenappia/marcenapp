import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Paperclip, Send, Mic, MicOff, Sliders, X, Check,
  Download, Share2, Maximize2, Rotate3d, Settings2
} from 'lucide-react';
import { callAIImage, callAIText } from './shared';
import AuthDialog from './AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// --- Logo ---
const LogoHex = ({ size = 40, className = "" }: { size?: number; className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]">
      <defs>
        <linearGradient id="chatLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(234, 88%, 48%)" />
        </linearGradient>
      </defs>
      <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="hsl(var(--sidebar-bg))" stroke="url(#chatLogoGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="50" y="66" textAnchor="middle" fontSize="46" fontWeight="900" fill="white" style={{ fontFamily: 'system-ui', fontStyle: 'italic', letterSpacing: '-2px' }}>M</text>
      <circle cx="50" cy="34" r="6" fill="hsl(var(--primary))" />
    </svg>
  </div>
);

// --- 3D Scene ---
function Scene3D({ factors }: { factors: Record<string, number> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(3, 3, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, width);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const { L, A, P, E, X, Y } = factors;
    const material = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.2 });
    const group = new THREE.Group();
    const sideGeo = new THREE.BoxGeometry(E, A, P);
    const topGeo = new THREE.BoxGeometry(L, E, P);
    const positions: [number, number, number][] = [[-L/2+E/2,0,0],[L/2-E/2,0,0],[0,A/2-E/2,0],[0,-A/2+E/2,0]];
    positions.forEach(pos => {
      const isTop = pos[0] === 0;
      const m = new THREE.Mesh(isTop ? topGeo : sideGeo, material);
      m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; group.add(m);
    });
    group.position.set(X, Y, 0);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20,20), new THREE.ShadowMaterial({opacity:0.4}));
    ground.rotation.x = -Math.PI/2; ground.position.y = -A/2+Y; ground.receiveShadow = true;
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); dirLight.position.set(5,10,5); dirLight.castShadow = true;
    scene.add(group, ground, new THREE.AmbientLight(0xffffff, 0.8), dirLight);

    let animId: number;
    const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => { cancelAnimationFrame(animId); if (mountRef.current) mountRef.current.innerHTML = ""; controls.dispose(); renderer.dispose(); };
  }, [factors]);
  return <div className="w-full aspect-square rounded-2xl overflow-hidden border border-border bg-card" ref={mountRef} />;
}

// --- Types ---
interface ChatMessage {
  id: string;
  user_id: string;
  sender: string;
  text: string | null;
  image_url: string | null;
  budget: string | null;
  created_at: string;
}

// --- Main Component ---
const ModuleChat = () => {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [factors, setFactors] = useState({ L: 2.4, A: 2.6, P: 0.6, E: 0.018, X: 0, Y: 0 });
  const [decorStyle, setDecorStyle] = useState("Limpo");
  const [isEngineeringOpen, setIsEngineeringOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Masking state
  const [maskingImage, setMaskingImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ base64: string; baseRaw: string; maskRaw: string } | null>(null);
  const [lastContext, setLastContext] = useState<{ baseRaw: string; maskRaw: string } | null>(null);

  // Zoom overlay
  const [activeImageZoom, setActiveImageZoom] = useState<{ url: string; budget?: string | null } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Load messages & realtime
  useEffect(() => {
    if (!user) return;
    // Initial load
    supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    // Realtime
    const channel = supabase
      .channel('chat_messages_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Image select -> open masking overlay
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (r) => {
      const img = new Image();
      img.onload = () => setMaskingImage({ src: r.target!.result as string, img });
      img.src = r.target!.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Canvas for mask drawing
  useEffect(() => {
    if (maskingImage && canvasRef.current) {
      const c = canvasRef.current;
      c.width = 1080; c.height = 1920;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 60;
        ctxRef.current = ctx;
      }
    }
  }, [maskingImage]);

  const getCoords = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = 1080 / rect.width; const sy = 1920 / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { offsetX: (cx - rect.left) * sx, offsetY: (cy - rect.top) * sy };
  };
  const startDraw = (e: any) => { if (!ctxRef.current) return; ctxRef.current.beginPath(); const c = getCoords(e); ctxRef.current.moveTo(c.offsetX, c.offsetY); (canvasRef.current as any).isDrawing = true; };
  const moveDraw = (e: any) => { if (!(canvasRef.current as any)?.isDrawing || !ctxRef.current) return; const c = getCoords(e); ctxRef.current.lineTo(c.offsetX, c.offsetY); ctxRef.current.stroke(); };
  const endDraw = () => { if (canvasRef.current) (canvasRef.current as any).isDrawing = false; };

  const confirmMask = async () => {
    if (!maskingImage || !canvasRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, 1080, 1920);
    const ratio = Math.min(1080 / maskingImage.img.width, 1920 / maskingImage.img.height);
    const dw = maskingImage.img.width * ratio; const dh = maskingImage.img.height * ratio;
    ctx.drawImage(maskingImage.img, (1080 - dw)/2, (1920 - dh)/2, dw, dh);
    const baseB64 = canvas.toDataURL("image/jpeg", 0.7);
    const baseRaw = baseB64.split(",")[1];

    ctx.clearRect(0,0,1080,1920); ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, 1080, 1920);
    ctx.drawImage(canvasRef.current, 0, 0);
    const idata = ctx.getImageData(0,0,1080,1920); const d = idata.data;
    for(let i=0; i<d.length; i+=4) { if(d[i+3]>10) { d[i]=d[i+1]=d[i+2]=255; d[i+3]=255; } else { d[i]=d[i+1]=d[i+2]=0; d[i+3]=255; } }
    ctx.putImageData(idata, 0, 0);
    const maskRaw = canvas.toDataURL("image/png").split(",")[1];

    setPendingUpload({ base64: baseB64, baseRaw, maskRaw });
    setMaskingImage(null);
  };

  const compressImage = async (base64Url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const r = 1024 / img.width;
        canvas.width = 1024; canvas.height = img.height * r;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.src = base64Url;
    });
  };

  const saveMessage = async (msg: Partial<ChatMessage>) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({ user_id: user.id, ...msg });
  };

  const handleSend = async () => {
    if (!chatInput.trim() && !pendingUpload) return;
    if (!user) { setShowAuthDialog(true); return; }

    const promptText = chatInput.trim();
    setChatInput("");
    setIsTyping(true);

    let currentBaseRaw: string | null = null;
    let currentMaskRaw: string | null = null;
    let previewImg: string | null = null;

    if (pendingUpload) {
      currentBaseRaw = pendingUpload.baseRaw;
      currentMaskRaw = pendingUpload.maskRaw;
      previewImg = pendingUpload.base64;
      setLastContext({ baseRaw: currentBaseRaw, maskRaw: currentMaskRaw });
      setPendingUpload(null);
    } else if (lastContext) {
      currentBaseRaw = lastContext.baseRaw;
      currentMaskRaw = lastContext.maskRaw;
    } else {
      setIsTyping(false);
      // Save a system message
      await saveMessage({ sender: 'iara', text: 'Por favor, anexe uma imagem do ambiente para iniciar a materialização.' });
      return;
    }

    // Save user message (don't duplicate via realtime - we use realtime for inserts)
    // We just insert; realtime will add it to the list
    await saveMessage({ sender: 'user', text: promptText, image_url: previewImg });

    // Budget calc
    let baseVal = 1200;
    if (promptText.toLowerCase().includes("cozinha")) baseVal = 6000;
    if (promptText.toLowerCase().includes("guarda-roupa")) baseVal = 3000;
    const finalBudget = (baseVal * factors.L * factors.A * (decorStyle === "Luxo" ? 1.5 : 1)).toFixed(2);

    // Generate image via edge function
    try {
      const finalPrompt = `MARCENAPP 4.0: Crie um móvel de estilo ${decorStyle}. REFINAMENTO DO MESTRE: ${promptText}. Dimensões: L:${factors.L} A:${factors.A}. Fotorrealismo máximo.`;
      const images = [
        { mimeType: 'image/jpeg', data: currentBaseRaw },
        { mimeType: 'image/png', data: currentMaskRaw },
      ];
      const resultUrl = await callAIImage(finalPrompt, images);

      if (resultUrl) {
        const compressed = await compressImage(resultUrl);
        await saveMessage({
          sender: 'iara',
          text: `Materialização concluída. Estilo: ${decorStyle}.`,
          image_url: compressed,
          budget: finalBudget,
        });
      } else {
        await saveMessage({ sender: 'iara', text: 'Não foi possível gerar a imagem. Tente novamente.' });
      }
    } catch (e: any) {
      await saveMessage({ sender: 'iara', text: `Erro na renderização: ${e?.message || 'Tente novamente.'}` });
    } finally {
      setIsTyping(false);
    }
  };

  // Speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR(); r.lang = "pt-BR";
      r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false);
      r.onresult = (e: any) => setChatInput(prev => `${prev} ${e.results[0][0].transcript}`);
      recognitionRef.current = r;
    }
  }, []);

  const downloadImage = async (url: string) => {
    const blob = await (await fetch(url)).blob();
    const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `MARCENAPP_Render.png`; a.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-background relative overflow-hidden rounded-xl border border-border">
      {/* Header */}
      <header className="px-4 py-3 bg-card border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <LogoHex size={36} />
          <div>
            <h2 className="text-sm font-black text-foreground leading-none uppercase italic tracking-tight">IARA.ai</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-green-600 uppercase font-bold tracking-widest">Online</span>
            </div>
          </div>
        </div>
        <button onClick={() => setIsEngineeringOpen(!isEngineeringOpen)} className={`p-2 rounded-full transition-all ${isEngineeringOpen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <Sliders size={18} />
        </button>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin relative">
        <div className="text-center pb-2">
          <span className="px-3 py-1 bg-muted rounded-full text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Sessão de Materialização</span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-1 shadow-md ${isUser ? 'bg-primary rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
                {msg.image_url && (
                  <div className="relative rounded-xl overflow-hidden mb-1 group cursor-zoom-in" onClick={() => !isUser && setActiveImageZoom({ url: msg.image_url!, budget: msg.budget })}>
                    <img src={msg.image_url} className="w-full h-auto max-h-[300px] object-cover" alt="Render" />
                    {!isUser && (
                      <>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <Maximize2 size={24} className="text-white" />
                        </div>
                        {msg.budget && (
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                            <span className="text-[10px] font-black text-white italic">R$ {msg.budget}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {msg.text && (
                  <div className={`px-4 py-2 text-sm leading-relaxed ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {msg.text}
                  </div>
                )}
                <div className={`px-3 pb-1 text-[8px] font-bold text-right ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 shadow-md flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input bar */}
      <footer className="bg-card border-t border-border p-3 shrink-0 relative">
        {pendingUpload && (
          <div className="absolute bottom-full left-0 mb-2 ml-3 p-2 bg-card border border-border rounded-2xl shadow-xl flex items-end gap-3 animate-in slide-in-from-bottom-2">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
              <img src={pendingUpload.base64} className="w-full h-full object-cover" alt="Pending" />
              <button onClick={() => setPendingUpload(null)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white"><X size={10}/></button>
            </div>
            <span className="text-[9px] font-black uppercase text-primary tracking-widest pb-1">Alvo Marcado</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="p-3 bg-muted hover:bg-accent rounded-full text-muted-foreground cursor-pointer transition-colors shrink-0">
            <Paperclip size={18} />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
          </label>
          <div className="flex-1 bg-muted border border-border rounded-[1.5rem] flex items-center focus-within:border-primary transition-colors">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={pendingUpload ? "O que deseja materializar nesta área?" : lastContext ? "Como deseja refinar a última imagem?" : "Anexe uma imagem para começar..."}
              className="w-full bg-transparent p-3 outline-none text-sm text-foreground resize-none max-h-[120px] scrollbar-thin"
              rows={1}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button onClick={() => { if(!isListening) recognitionRef.current?.start(); else recognitionRef.current?.stop(); }} className={`p-2.5 mr-1 rounded-full transition-colors shrink-0 ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
          <button onClick={handleSend} disabled={isTyping} className={`p-3 rounded-full shrink-0 transition-all ${(chatInput.trim() || pendingUpload) && !isTyping ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground'}`}>
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </footer>

      {/* Engineering drawer */}
      {isEngineeringOpen && (
        <div className="absolute inset-x-0 top-[52px] bottom-0 bg-card border-t border-border p-6 z-40 overflow-y-auto animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-black uppercase text-foreground tracking-widest flex items-center gap-2"><Settings2 size={18} className="text-primary"/> Matriz Técnica</h4>
            <button onClick={() => setIsEngineeringOpen(false)} className="p-2 bg-muted rounded-full text-muted-foreground"><X size={18}/></button>
          </div>
          <Scene3D factors={factors} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6">
            {Object.keys(factors).map(k => (
              <div key={k} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground"><span>{k==='L'?'Larg':k==='A'?'Alt':k==='P'?'Prof':k}</span><span className="text-foreground">{factors[k as keyof typeof factors]}</span></div>
                <input type="range" min={k==='X'||k==='Y'?'-5':'0.01'} max="5" step="0.001" value={factors[k as keyof typeof factors]} onChange={(e)=>setFactors({...factors, [k]:parseFloat(e.target.value)})} className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6">
            {["Limpo", "Luxo", "Natural"].map(style => (
              <button key={style} onClick={() => setDecorStyle(style)} className={`py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${decorStyle === style ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>{style}</button>
            ))}
          </div>
        </div>
      )}

      {/* Masking overlay */}
      {maskingImage && (
        <div className="fixed inset-0 z-[6000] bg-black flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <header className="p-4 flex items-center justify-between bg-black/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
            <button onClick={() => setMaskingImage(null)} className="p-3 bg-white/10 rounded-full text-white"><X size={20} /></button>
            <p className="text-xs font-black uppercase tracking-widest text-sky-400">Pinte a área do móvel</p>
            <button onClick={confirmMask} className="p-3 bg-green-600 rounded-full text-white shadow-lg"><Check size={20} strokeWidth={3} /></button>
          </header>
          <div className="flex-1 relative flex items-center justify-center mt-16 pb-6 overflow-hidden">
            <img src={maskingImage.src} className="absolute inset-0 w-full h-full object-contain opacity-80" alt="Base" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain cursor-crosshair touch-none mix-blend-screen" onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw} />
          </div>
        </div>
      )}

      {/* Zoom overlay */}
      {activeImageZoom && (
        <div className="fixed inset-0 z-[7000] flex flex-col bg-black animate-in fade-in duration-300">
          <header className="p-6 flex justify-end absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <button onClick={() => setActiveImageZoom(null)} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white"><X size={24} /></button>
          </header>
          <div className="flex-1 flex items-center justify-center p-2">
            <img src={activeImageZoom.url} alt="Zoom" className="max-w-full max-h-full object-contain shadow-2xl" />
          </div>
          <footer className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-6 absolute bottom-0 left-0 right-0">
            {activeImageZoom.budget && (
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Investimento Estimado</p>
                <p className="text-4xl font-black text-white italic tracking-tighter">R$ {activeImageZoom.budget}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => downloadImage(activeImageZoom.url)} className="flex items-center justify-center gap-2 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-black text-xs uppercase"><Download size={18}/> Salvar</button>
              <button onClick={async () => {
                const blob = await (await fetch(activeImageZoom.url)).blob();
                const file = new File([blob], 'render.png', { type: 'image/png' });
                if (navigator.share) await navigator.share({ files: [file], title: 'MARCENAPP 4.0' });
              }} className="flex items-center justify-center gap-2 py-4 bg-primary rounded-2xl text-primary-foreground font-black text-xs uppercase shadow-xl"><Share2 size={18}/> Enviar</button>
            </div>
          </footer>
        </div>
      )}

      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onSuccess={() => setShowAuthDialog(false)}
      />
    </div>
  );
};

export default ModuleChat;
