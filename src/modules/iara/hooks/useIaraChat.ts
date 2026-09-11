import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '../components/ChatMessages';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { runOrchestrator } from '@/core/orchestrator';

interface SpeechRecognitionResultEventLike { results: ArrayLike<ArrayLike<{ transcript: string }>>; }
interface SpeechRecognitionLike { lang: string; onstart: () => void; onend: () => void; onresult: (event: SpeechRecognitionResultEventLike) => void; start: () => void; stop: () => void; }
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type BrowserWithSpeechRecognition = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };

export const useIaraChat = (factors: { L: number; A: number }, decorStyle: string, setShowAuthDialog: (val: boolean) => void, hooks?: { onProjectCreated?: (p: { width: number; height: number; depth: number }) => void }, projectId: string | null = null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [maskingImage, setMaskingImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ base64: string; baseRaw: string; maskRaw: string } | null>(null);
  const [lastContext, setLastContext] = useState<{ baseRaw: string; maskRaw: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastFailedRef = useRef<{ text: string; upload: typeof pendingUpload } | null>(null);
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (commandHistory.length === 0) return;
    const lastCommand = commandHistory[0];
    const notifyChat = async () => {
      const lastProcessedId = localStorage.getItem('last_processed_command_id');
      if (lastProcessedId === lastCommand.id && lastCommand.status === 'completed') return;
      if (lastCommand.status === 'completed' && lastCommand.result?.resultUrl) {
        localStorage.setItem('last_processed_command_id', lastCommand.id);
        await saveMessage({ sender: 'iara', text: `A materialização foi concluída com sucesso no Estúdio! (Ref: ${lastCommand.id})`, image_url: lastCommand.result.resultUrl, metadata: { commandId: lastCommand.id, resultUrl: lastCommand.result.resultUrl } });
        setIsTyping(false);
      } else if (lastCommand.status === 'failed') {
        await saveMessage({ sender: 'iara', text: `Desculpe, o Estúdio encontrou um problema ao processar sua solicitação: ${lastCommand.error}.` });
        setIsTyping(false);
      }
    };
    void notifyChat();
  }, [commandHistory]);

  useEffect(() => {
    if (!user) { setMessages([]); return; }
    let cancelled = false;
    setMessages([]); setError(null);
    let query = supabase.from('chat_messages').select('*').eq('user_id', user.id);
    query = projectId ? query.eq('project_id', projectId) : query.is('project_id', null);
    query.order('created_at', { ascending: true }).then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) { setError('Não foi possível carregar o histórico. Verifique sua conexão.'); return; }
      if (data) setMessages(data as ChatMessage[]);
    });
    const channel = supabase.channel(`chat_messages_${projectId ?? 'none'}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${user.id}` }, (payload) => {
      const msg = payload.new as ChatMessage;
      if ((msg.project_id ?? null) !== (projectId ?? null)) return;
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    }).subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [user, projectId]);

  const saveMessage = async (msg: Partial<ChatMessage>) => {
    if (!user) return;
    const { error: insertError } = await supabase.from('chat_messages').insert({ user_id: user.id, project_id: projectId, ...msg });
    if (insertError) throw new Error(`Falha ao salvar mensagem: ${insertError.message}`);
  };

  const sendPrompt = async (promptText: string, upload: typeof pendingUpload) => {
    if (!user) return;
    setIsTyping(true); setError(null);
    let currentBaseRaw: string | null = null;
    let currentMaskRaw: string | null = null;
    let previewImg: string | null = null;
    if (upload) { currentBaseRaw = upload.baseRaw; currentMaskRaw = upload.maskRaw; previewImg = upload.base64; setLastContext({ baseRaw: currentBaseRaw, maskRaw: currentMaskRaw }); }
    else if (lastContext) { currentBaseRaw = lastContext.baseRaw; currentMaskRaw = lastContext.maskRaw; }
    try {
      await saveMessage({ sender: 'user', text: promptText, image_url: previewImg });
      const conversation = [...messages, { sender: 'user', text: promptText }]
        .filter(message => typeof message.text === 'string' && message.text.trim())
        .slice(-12)
        .map(message => ({ sender: message.sender === 'user' ? 'user' : 'iara', text: message.text!.trim() }));
      const run = await runOrchestrator(promptText, { userId: user.id, projectId: projectId ?? undefined, decorStyle, lastImageBase: currentBaseRaw ?? undefined, lastImageMask: currentMaskRaw ?? undefined }, { decorStyle, currentProject: { id: projectId, largura: factors.L, altura: factors.A }, conversation });
      if (run.plan.length === 0) { await saveMessage({ sender: 'iara', text: run.summary || 'Pode detalhar melhor? Não identifiquei uma ação a executar.' }); lastFailedRef.current = null; return; }
      const linhas = run.results.map(({ tool, result }) => {
        if (result.ok === false) return `❌ ${tool}: ${result.error}`;
        const data = result.data as Record<string, unknown>;
        switch (tool) {
          case 'createCliente': return `✅ Cliente **${String(data.nome ?? 'sem nome')}** cadastrado.`;
          case 'createProjeto': { const width = Number(data.width); const height = Number(data.height); const depth = Number(data.depth); if (Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(depth)) hooks?.onProjectCreated?.({ width, height, depth }); return `✅ Projeto **${String(data.nome ?? 'Projeto')}** criado (${width}×${height}×${depth}m).`; }
          case 'gerarRender': return `🎨 Render enfileirado no Estúdio (ref: ${String(data.studioCommandId ?? '')}). Aviso quando ficar pronto.`;
          case 'calcularOrcamento': { const precoVenda = Number(data.precoVenda); const materiais = Number(data.materiais); const ferragens = Number(data.ferragens); const maoDeObra = Number(data.maoDeObra); const outros = Number(data.outros); const lucro = Number(data.lucro); const margemPct = Number(data.margemPct); return `💰 Orçamento real: **R$ ${precoVenda.toLocaleString('pt-BR')}** (custos R$ ${materiais.toLocaleString('pt-BR')} + ferragens R$ ${ferragens.toLocaleString('pt-BR')} + mão de obra R$ ${maoDeObra.toLocaleString('pt-BR')} + outros R$ ${outros.toLocaleString('pt-BR')}). Lucro: R$ ${lucro.toLocaleString('pt-BR')} (${margemPct.toLocaleString('pt-BR')}%).`; }
          case 'gerarContrato': return `📄 Contrato preparado para **${String(data.cliente ?? 'cliente')}**${data.valor ? ` (R$ ${Number(data.valor).toLocaleString('pt-BR')})` : ''}. ${Number(data.clausulasGeradas ?? 0)} cláusula(s) via IA.`;
          default: return `✅ ${tool} executado.`;
        }
      });
      const footer = run.usedFallback ? '\n\n_(interpretação por fallback keyword)_' : '';
      const header = run.summary ? `${run.summary}\n\n` : '';
      await saveMessage({ sender: 'iara', text: `${header}${linhas.join('\n')}${footer}` });
      lastFailedRef.current = null;
    } catch (error: unknown) {
      lastFailedRef.current = { text: promptText, upload };
      setError(error instanceof Error ? error.message : 'Falha ao falar com a IARA. Tente novamente.');
    } finally { setIsTyping(false); }
  };

  const handleSend = async () => { if (!chatInput.trim() && !pendingUpload) return; if (!user) { setShowAuthDialog(true); return; } const promptText = chatInput.trim(); const upload = pendingUpload; setChatInput(''); setPendingUpload(null); await sendPrompt(promptText, upload); };
  const retryLast = async () => { const failed = lastFailedRef.current; if (!failed) { setError(null); return; } await sendPrompt(failed.text, failed.upload); };
  const dismissError = () => setError(null);
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (r) => { const result = r.target?.result; if (typeof result !== 'string') return; const img = new Image(); img.onload = () => setMaskingImage({ src: result, img }); img.src = result; }; reader.readAsDataURL(file); };
  useEffect(() => { const browserWindow = window as BrowserWithSpeechRecognition; const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition; if (!SpeechRecognition) return; const r = new SpeechRecognition(); r.lang = 'pt-BR'; r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false); r.onresult = (event) => setChatInput(prev => `${prev} ${event.results[0][0].transcript}`); recognitionRef.current = r; }, []);
  const toggleRecording = () => { if (isListening) recognitionRef.current?.stop(); else recognitionRef.current?.start(); };
  return { messages, chatInput, setChatInput, isTyping, isListening, handleSend, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload, error, retryLast, dismissError };
};
