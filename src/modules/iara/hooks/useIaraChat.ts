import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '../components/ChatMessages';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { runIaraConversation } from '@/lib/agents/domain';
import { loadIaraProjectContext, saveIaraProjectContext, type IaraProjectContext } from '../services/iaraProjectContext';
import { advanceIaraExecutionScope, isCurrentIaraExecutionScope, type IaraExecutionScope } from './iaraExecutionScope';

interface SpeechRecognitionResultEventLike { results: ArrayLike<ArrayLike<{ transcript: string }>>; }
interface SpeechRecognitionLike { lang: string; onstart: () => void; onend: () => void; onresult: (event: SpeechRecognitionResultEventLike) => void; start: () => void; stop: () => void; }
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type BrowserWithSpeechRecognition = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
type SmartAction = { id: string; label: string; prompt: string; domain: 'project' | 'production' | 'business' | 'execution' };
type MessageMetadata = NonNullable<ChatMessage['metadata']>;
type UploadPayload = { base64: string; baseRaw: string; maskRaw: string };
type FailedRequest = { text: string; upload: UploadPayload | null; smartAction?: SmartAction; projectId: string | null };

function rawErrorMessage(error: unknown): string { return error instanceof Error ? error.message : ''; }
function humanizeError(error: unknown): string {
  const message = rawErrorMessage(error);
  if (/nenhuma imagem base|imagem base|máscara|mascara/i.test(message)) return 'Para gerar esse render, preciso de uma foto do ambiente. Pode enviar uma foto aqui e eu continuo.';
  if (/supabase|provider|gemini|http|stack|function|exception|rpc|postgres|edge function|failed to fetch/i.test(message)) return 'Não foi possível concluir esta ação. Revise as informações do projeto e tente novamente.';
  return message || 'Não foi possível concluir esta ação. Tente novamente.';
}
function toolFailureMessage(tool: string, error: unknown): string {
  const message = rawErrorMessage(error);
  if (tool === 'gerarRender' || /nenhuma imagem base|imagem base|máscara|mascara/i.test(message)) return 'Para gerar esse render, preciso de uma foto do ambiente. Pode enviar uma foto aqui e eu continuo.';
  return humanizeError(error);
}

export const useIaraChat = (factors: { L: number; A: number }, decorStyle: string, setShowAuthDialog: (val: boolean) => void, hooks?: { onProjectCreated?: (p: { width: number; height: number; depth: number }) => void }, projectId: string | null = null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [maskingImage, setMaskingImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<UploadPayload | null>(null);
  const [lastContext, setLastContext] = useState<{ baseRaw: string; maskRaw: string } | null>(null);
  const [projectContext, setProjectContext] = useState<IaraProjectContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastFailedRef = useRef<FailedRequest | null>(null);
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scopeRef = useRef<IaraExecutionScope>({ userId: user?.id ?? null, projectId, generation: 0 });

  scopeRef.current = advanceIaraExecutionScope(scopeRef.current, user?.id ?? null, projectId);

  const commandProjectId = (command: { payload?: Record<string, unknown> }) => typeof command.payload?.projectId === 'string' ? command.payload.projectId : null;

  useEffect(() => {
    if (commandHistory.length === 0 || !user) return;
    const lastCommand = commandHistory[0];
    if (lastCommand.source !== 'iara' || lastCommand.target !== 'studio') return;
    if (commandProjectId(lastCommand) !== (projectId ?? null)) return;

    const notifyChat = async () => {
      const lastProcessedId = localStorage.getItem('last_processed_command_id');
      if (lastProcessedId === lastCommand.id && lastCommand.status === 'completed') return;
      const commandScope = scopeRef.current;
      if (lastCommand.status === 'completed' && lastCommand.result?.resultUrl) {
        localStorage.setItem('last_processed_command_id', lastCommand.id);
        await saveMessage({ sender: 'iara', text: 'O render está pronto.', image_url: lastCommand.result.resultUrl, metadata: { commandId: lastCommand.id, resultUrl: lastCommand.result.resultUrl, artifact: { type: 'render', id: lastCommand.id }, actions: [{ id: 'open', label: 'Abrir render', kind: 'open-panel' }], status: 'ready' });
        if (scopeRef.current.projectId === commandScope.projectId && scopeRef.current.userId === commandScope.userId) setIsTyping(false);
      } else if (lastCommand.status === 'failed') {
        await saveMessage({ sender: 'iara', text: 'Não foi possível concluir o render. Revise a imagem e as informações do projeto e tente novamente.', metadata: { status: 'error', actions: [{ id: 'retry', label: 'Tentar novamente', kind: 'retry' }] } });
        if (scopeRef.current.projectId === commandScope.projectId && scopeRef.current.userId === commandScope.userId) setIsTyping(false);
      }
    };
    void notifyChat().catch((commandError: unknown) => setError(humanizeError(commandError)));
  }, [commandHistory, projectId, user]);

  useEffect(() => {
    const capturedScope = scopeRef.current;
    const isCurrentScope = () => isCurrentIaraExecutionScope(scopeRef.current, capturedScope);

    if (!user) {
      setMessages([]); setProjectContext(null); setLastContext(null); setPendingUpload(null); setError(null);
      return;
    }

    setMessages([]); setProjectContext(null); setLastContext(null); setPendingUpload(null); setError(null);
    const load = async () => {
      const messageQuery = projectId
        ? supabase.from('chat_messages').select('*').eq('user_id', user.id).eq('project_id', projectId)
        : supabase.from('chat_messages').select('*').eq('user_id', user.id).is('project_id', null);
      const [{ data, error: loadError }, contextResult] = await Promise.all([
        messageQuery.order('created_at', { ascending: true }),
        projectId ? loadIaraProjectContext(projectId) : Promise.resolve(null),
      ]);
      if (!isCurrentScope()) return;
      if (loadError) { setError('Não foi possível carregar o histórico. Verifique sua conexão.'); return; }
      if (data) setMessages(data as ChatMessage[]);
      setProjectContext(contextResult);
    };
    void load().catch((loadError: unknown) => { if (isCurrentScope()) setError(humanizeError(loadError)); });

    const channel = supabase.channel(`chat_messages_${projectId ?? 'none'}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${user.id}` }, (payload) => {
      if (!isCurrentScope()) return;
      const msg = payload.new as ChatMessage;
      if ((msg.project_id ?? null) !== (projectId ?? null)) return;
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, projectId]);

  const saveMessage = async (msg: Partial<ChatMessage>) => {
    if (!user) return;
    const { error: insertError } = await supabase.from('chat_messages').insert({ user_id: user.id, project_id: projectId, ...msg });
    if (insertError) throw new Error(`Falha ao salvar mensagem: ${insertError.message}`);
  };

  const sendPrompt = async (promptText: string, upload: UploadPayload | null, smartAction?: SmartAction) => {
    if (!user) return;
    const capturedScope = scopeRef.current;
    const scopedUserId = user.id;
    const scopedProjectId = projectId;
    const isCurrentScope = () => isCurrentIaraExecutionScope(scopeRef.current, capturedScope);

    if (isCurrentScope()) { setIsTyping(true); setError(null); }
    let currentBaseRaw: string | null = null;
    let currentMaskRaw: string | null = null;
    let previewImg: string | null = null;
    if (upload) { currentBaseRaw = upload.baseRaw; currentMaskRaw = upload.maskRaw; previewImg = upload.base64; if (isCurrentScope()) setLastContext({ baseRaw: currentBaseRaw, maskRaw: currentMaskRaw }); }
    else if (lastContext) { currentBaseRaw = lastContext.baseRaw; currentMaskRaw = lastContext.maskRaw; }
    try {
      const correlationId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const intentInput = { message: promptText, projectId: scopedProjectId, ...(smartAction ? { domain: smartAction.domain, action: smartAction.id } : {}) } as Record<string, unknown>;
      await saveMessage({ sender: 'user', text: promptText, image_url: previewImg, metadata: smartAction ? { intent: { domain: smartAction.domain, action: smartAction.id, agent: 'IARA' }, correlationId, status: 'requested' } : { correlationId, status: 'requested' } });
      const conversation = [...messages, { sender: 'user', text: promptText }].filter(message => typeof message.text === 'string' && message.text.trim()).slice(-12).map(message => ({ sender: message.sender === 'user' ? 'user' : 'iara', text: message.text!.trim() }));
      const response = await runIaraConversation({ input: intentInput, intent: promptText, projectId: scopedProjectId ?? undefined, correlationId, execution: { userId: scopedUserId, projectId: scopedProjectId ?? undefined, decorStyle, lastImageBase: currentBaseRaw ?? undefined, lastImageMask: currentMaskRaw ?? undefined }, context: { decorStyle, currentProject: { id: scopedProjectId, largura: factors.L, altura: factors.A }, projectIaraContext: projectContext, conversation } });
      const lines = response.run.results.map(({ tool, result }) => {
        if (result.ok === false) return toolFailureMessage(tool, result.error);
        const data = result.data as Record<string, unknown>;
        switch (tool) {
          case 'createCliente': return `Cliente **${String(data.nome ?? 'sem nome')}** cadastrado.`;
          case 'createProjeto': { const width = Number(data.width); const height = Number(data.height); const depth = Number(data.depth); if (Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(depth) && isCurrentScope()) hooks?.onProjectCreated?.({ width, height, depth }); return `Projeto **${String(data.nome ?? 'Projeto')}** criado.`; }
          case 'gerarRender': return 'Estou preparando o render. Aviso quando estiver pronto.';
          case 'calcularOrcamento': { const precoVenda = Number(data.precoVenda); const materiais = Number(data.materiais); const ferragens = Number(data.ferragens); const maoDeObra = Number(data.maoDeObra); const outros = Number(data.outros); const lucro = Number(data.lucro); const margemPct = Number(data.margemPct); return `Orçamento atualizado: **R$ ${precoVenda.toLocaleString('pt-BR')}**. Custos: R$ ${materiais.toLocaleString('pt-BR')} em materiais, R$ ${ferragens.toLocaleString('pt-BR')} em ferragens, R$ ${maoDeObra.toLocaleString('pt-BR')} de mão de obra e R$ ${outros.toLocaleString('pt-BR')} em outros custos. Lucro: R$ ${lucro.toLocaleString('pt-BR')} (${margemPct.toLocaleString('pt-BR')}%).`; }
          case 'gerarContrato': return `Documento preparado para **${String(data.cliente ?? 'cliente')}**.`;
          case 'operationalIntelligence': return 'Informações operacionais do projeto atualizadas.';
          default: return 'Ação concluída.';
        }
      });
      const artifact = response.artifacts[0];
      const metadata: MessageMetadata = { domain: response.domain, action: response.action, agent: response.domainAgent, correlationId: response.correlationId, status: response.run.status === 'completed' ? 'ready' : response.run.status, artifacts: response.artifacts, panel: response.panel, ...(artifact ? { artifact: { type: artifact.type, id: artifact.id } } : {}), ...(artifact ? { actions: [{ id: 'open', label: artifact.type === 'render' ? 'Abrir render' : 'Abrir artefato', kind: 'open-panel' }] } : {}) };
      const header = response.run.status === 'needs_input' ? 'Preciso confirmar uma informação antes de continuar.' : response.run.status === 'failed' ? 'Não foi possível concluir esta ação.' : 'Pronto.';
      const body = lines.length ? lines.join('\n') : 'Pode me dizer o que você quer fazer no projeto?';
      await saveMessage({ sender: 'iara', text: `${header}\n\n${body}`, metadata });

      if (scopedProjectId) {
        const persisted = await saveIaraProjectContext(scopedUserId, scopedProjectId, {
          summary: body.slice(0, 1000),
          decisions: [{ action: response.action, domain: response.domain, agent: response.domainAgent, correlationId: response.correlationId, at: new Date().toISOString() }],
          artifacts: response.artifacts,
          lastCorrelationId: response.correlationId,
        });
        if (isCurrentScope()) setProjectContext(persisted);
      }
      if (isCurrentScope()) lastFailedRef.current = null;
    } catch (error: unknown) {
      if (isCurrentScope()) {
        lastFailedRef.current = { text: promptText, upload, smartAction, projectId: scopedProjectId };
        setError(humanizeError(error));
      }
    } finally {
      if (isCurrentScope()) setIsTyping(false);
    }
  };

  const handleSend = async () => { if (!chatInput.trim() && !pendingUpload) return; if (!user) { setShowAuthDialog(true); return; } const promptText = chatInput.trim() || 'Analise a imagem anexada e me diga como podemos seguir.'; const upload = pendingUpload; setChatInput(''); setPendingUpload(null); await sendPrompt(promptText, upload); };
  const handleSmartAction = async (action: SmartAction) => { if (!user) { setShowAuthDialog(true); return; } setChatInput(''); await sendPrompt(action.prompt, null, action); };
  const retryLast = async () => { const failed = lastFailedRef.current; if (!failed || failed.projectId !== projectId) { setError(null); return; } await sendPrompt(failed.text, failed.upload, failed.smartAction); };
  const dismissError = () => setError(null);
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (r) => { const result = r.target?.result; if (typeof result !== 'string') return; const img = new Image(); img.onload = () => setMaskingImage({ src: result, img }); img.src = result; }; reader.readAsDataURL(file); };
  useEffect(() => { const browserWindow = window as BrowserWithSpeechRecognition; const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition; if (!SpeechRecognition) return; const r = new SpeechRecognition(); r.lang = 'pt-BR'; r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false); r.onresult = (event) => setChatInput(prev => `${prev} ${event.results[0][0].transcript}`); recognitionRef.current = r; }, []);
  const toggleRecording = () => { if (isListening) recognitionRef.current?.stop(); else recognitionRef.current?.start(); };
  return { messages, chatInput, setChatInput, isTyping, isListening, handleSend, handleSmartAction, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload, error, retryLast, dismissError };
};
