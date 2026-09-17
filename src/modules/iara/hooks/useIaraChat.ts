import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '../components/ChatMessages';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { runIaraConversation } from '@/lib/agents/domain';
import { loadMarcenariaContext } from '@/modules/marcenaria/marcenariaContext';
import { isIaraCommandForExecution, isIaraExecutionCurrent, type IaraExecutionIdentity } from './iaraExecutionScope';
import { persistIaraContext, type IaraContext } from '../services/iaraContext';
import { createProjectStateFromConversation, projectStateSummary, type ProjectState } from '../services/projectState';

interface SpeechRecognitionResultEventLike { results: ArrayLike<ArrayLike<{ transcript: string }>>; }
interface SpeechRecognitionLike { lang: string; onstart: () => void; onend: () => void; onresult: (event: SpeechRecognitionResultEventLike) => void; start: () => void; stop: () => void; }
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type BrowserWithSpeechRecognition = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
type SmartAction = { id: string; label: string; prompt: string; domain: 'project' | 'production' | 'business' | 'execution' };
type MessageMetadata = NonNullable<ChatMessage['metadata']>;
type UploadKind = 'environment' | 'reference' | 'sketch' | 'plan';
type PendingUpload = { base64: string; baseRaw: string; maskRaw: string; kind: UploadKind };
const CHAT_PAGE_SIZE = 50;

type ChatCursor = { createdAt: string; id: string };

function rawErrorMessage(error: unknown): string { return error instanceof Error ? error.message : ''; }
function humanizeError(error: unknown): string {
  const message = rawErrorMessage(error);
  if (/nenhuma imagem base|imagem base|máscara|mascara/i.test(message)) return 'Não foi possível concluir essa ação com o contexto de imagem disponível. Se você quiser preservar um ambiente existente, envie uma foto do ambiente e eu continuo.';
  if (/supabase|provider|gemini|http|stack|function|exception|rpc|postgres|edge function|failed to fetch/i.test(message)) return 'Revise as informações do projeto e tente novamente.';
  return message || 'Tente novamente.';
}
function toolFailureMessage(tool: string, error: unknown): string {
  const message = rawErrorMessage(error);
  if (tool === 'gerarRender' || /nenhuma imagem base|imagem base|máscara|mascara/i.test(message)) return 'Não foi possível gerar o render com os dados disponíveis. Você pode gerar um render somente com texto ou, se quiser preservar um ambiente existente, enviar uma foto e tentar novamente.';
  return humanizeError(error);
}

export const useIaraChat = (factors: { L: number; A: number; P?: number }, decorStyle: string, setShowAuthDialog: (val: boolean) => void, hooks?: { onProjectCreated?: (p: { width: number; height: number; depth: number }) => void }, projectId: string | null = null, activeContext?: IaraContext) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [maskingImage, setMaskingImage] = useState<{ src: string; img: HTMLImageElement; kind: UploadKind } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [lastContext, setLastContext] = useState<{ baseRaw: string; maskRaw: string; kind: UploadKind } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectState, setProjectState] = useState<ProjectState>({ intent: null, project: { dimensions: {} }, components: [], pending: [], selectedComponentId: null, sourceTurns: 0 });
  const lastFailedRef = useRef<{ text: string; upload: typeof pendingUpload; smartAction?: SmartAction } | null>(null);
  const chatCursorRef = useRef<ChatCursor | null>(null);
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const executionGenerationRef = useRef(0);
  const pendingExecutionsRef = useRef(new Map<string, IaraExecutionIdentity>());
  const projectStateRef = useRef<ProjectState>(projectState);
  const context = { userId: user?.id ?? null, projectId: activeContext?.projectId ?? projectId, environmentId: activeContext?.environmentId ?? null, versionId: activeContext?.versionId ?? null };

  useEffect(() => { projectStateRef.current = projectState; }, [projectState]);

  useEffect(() => {
    executionGenerationRef.current += 1;
    const generation = executionGenerationRef.current;
    for (const [correlationId, identity] of pendingExecutionsRef.current) {
      if (!isIaraExecutionCurrent(identity, context, generation - 1)) pendingExecutionsRef.current.delete(correlationId);
    }
    setLastContext(null);
    setProjectState({ intent: null, project: { dimensions: {} }, components: [], pending: [], selectedComponentId: null, sourceTurns: 0 });
  }, [context.userId, context.projectId, context.environmentId, context.versionId]);

  useEffect(() => {
    if (commandHistory.length === 0) return;
    const pendingResults = commandHistory.flatMap(command => {
      const correlationId = typeof command.payload?.correlationId === 'string' ? command.payload.correlationId : null;
      const execution = correlationId ? pendingExecutionsRef.current.get(correlationId) : undefined;
      if (!execution || !isIaraCommandForExecution(command, execution) || !isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) return [];
      return [{ command, execution }];
    });
    if (pendingResults.length === 0) return;
    const notifyChat = async () => {
      for (const { command, execution } of pendingResults) {
        if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) continue;
        const lastProcessedId = localStorage.getItem('last_processed_command_id');
        if (lastProcessedId === command.id && command.status === 'completed') continue;
        if (command.status === 'completed' && command.result?.resultUrl) {
          if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) continue;
          localStorage.setItem('last_processed_command_id', command.id);
          await saveMessage({ sender: 'iara', text: 'O render está pronto.', image_url: command.result.resultUrl, metadata: { commandId: command.id, correlationId: execution.correlationId, projectId: execution.projectId ?? undefined, environmentId: execution.environmentId ?? undefined, versionId: execution.versionId ?? undefined, resultUrl: command.result.resultUrl, imageUrl: command.result.resultUrl, artifact: { type: 'render', id: command.id }, actions: [{ id: 'open', label: 'Abrir render', kind: 'open-panel' }], status: 'ready' } }, execution);
          pendingExecutionsRef.current.delete(execution.correlationId); setIsTyping(false);
        } else if (command.status === 'failed') {
          if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) continue;
          await saveMessage({ sender: 'iara', text: 'Não foi possível concluir o render. Revise a imagem e as informações do projeto e tente novamente.', metadata: { status: 'error', correlationId: execution.correlationId, projectId: execution.projectId ?? undefined, environmentId: execution.environmentId ?? undefined, versionId: execution.versionId ?? undefined, actions: [{ id: 'retry', label: 'Tentar novamente', kind: 'retry' }] } }, execution);
          pendingExecutionsRef.current.delete(execution.correlationId); setIsTyping(false);
        }
      }
    };
    void notifyChat();
  }, [commandHistory, context.userId, context.projectId, context.environmentId, context.versionId]);

  useEffect(() => {
    if (!user) { setMessages([]); setHasOlderMessages(false); chatCursorRef.current = null; return; }
    let cancelled = false;
    setMessages([]); setError(null); setHasOlderMessages(false); chatCursorRef.current = null;
    let query = supabase.from('chat_messages').select('*').eq('user_id', user.id);
    query = context.projectId ? query.eq('project_id', context.projectId) : query.is('project_id', null);
    query = context.environmentId ? query.eq('environment_id', context.environmentId) : query.is('environment_id', null);
    query = context.versionId ? query.eq('version_id', context.versionId) : query.is('version_id', null);
    query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(CHAT_PAGE_SIZE).then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) { setError('Não foi possível carregar o histórico. Verifique sua conexão.'); return; }
      const page = (data ?? []) as ChatMessage[];
      if (page.length > 0) {
        const oldest = page[page.length - 1];
        chatCursorRef.current = { createdAt: oldest.created_at, id: oldest.id };
      }
      setHasOlderMessages(page.length === CHAT_PAGE_SIZE);
      const chronological = page.reverse();
      setMessages(chronological);
      setProjectState(createProjectStateFromConversation(chronological.map(message => message.sender === 'user' ? message.text ?? '' : '').filter(Boolean).slice(-50)));
    });
    const channel = supabase.channel(`chat_messages_${context.projectId ?? 'none'}_${context.environmentId ?? 'none'}_${context.versionId ?? 'none'}_${user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${user.id}` }, (payload) => { const msg = payload.new as ChatMessage; if (msg.user_id !== user.id || (msg.project_id ?? null) !== (context.projectId ?? null) || (msg.environment_id ?? null) !== (context.environmentId ?? null) || (msg.version_id ?? null) !== (context.versionId ?? null)) return; setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]); if (msg.sender === 'user' && msg.text) setProjectState(prev => { const next = createProjectStateFromConversation([msg.text!], prev); projectStateRef.current = next; return next; }); }).subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [user, context.projectId, context.environmentId, context.versionId]);

  const loadOlderMessages = useCallback(async () => {
    if (!user || isLoadingOlderMessages || !hasOlderMessages || !chatCursorRef.current) return;
    setIsLoadingOlderMessages(true);
    const cursor = chatCursorRef.current;
    try {
      let query = supabase.from('chat_messages').select('*').eq('user_id', user.id);
      query = context.projectId ? query.eq('project_id', context.projectId) : query.is('project_id', null);
      query = context.environmentId ? query.eq('environment_id', context.environmentId) : query.is('environment_id', null);
      query = context.versionId ? query.eq('version_id', context.versionId) : query.is('version_id', null);
      const { data, error: loadError } = await query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(CHAT_PAGE_SIZE);
      if (loadError) throw loadError;
      const page = (data ?? []) as ChatMessage[];
      if (page.length > 0) {
        const oldest = page[page.length - 1];
        chatCursorRef.current = { createdAt: oldest.created_at, id: oldest.id };
        setMessages(prev => [...page.reverse(), ...prev.filter(existing => !page.some(older => older.id === existing.id))]);
      }
      setHasOlderMessages(page.length === CHAT_PAGE_SIZE);
    } catch { setError('Não foi possível carregar mensagens anteriores. Tente novamente.'); } finally { setIsLoadingOlderMessages(false); }
  }, [user, context.projectId, context.environmentId, context.versionId, hasOlderMessages, isLoadingOlderMessages]);

  const saveMessage = async (msg: Partial<ChatMessage>, execution?: IaraExecutionIdentity) => {
    if (!user) return;
    if (execution && (execution.userId !== user.id || !isIaraExecutionCurrent(execution, context, executionGenerationRef.current))) return;
    const targetUserId = execution?.userId ?? user.id;
    const target = execution ? { projectId: execution.projectId, environmentId: execution.environmentId, versionId: execution.versionId } : context;
    const { error: insertError } = await supabase.from('chat_messages').insert({ user_id: targetUserId, project_id: target.projectId, environment_id: target.environmentId, version_id: target.versionId, ...msg });
    if (insertError) throw new Error(`Falha ao salvar mensagem: ${insertError.message}`);
  };

  const sendPrompt = async (promptText: string, upload: typeof pendingUpload, smartAction?: SmartAction) => {
    if (!user) return;
    setIsTyping(true); setError(null);
    let currentBaseRaw: string | null = null; let currentMaskRaw: string | null = null; let previewImg: string | null = null; let uploadKind: UploadKind | null = null;
    if (upload) { currentBaseRaw = upload.baseRaw; currentMaskRaw = upload.maskRaw; previewImg = upload.base64; uploadKind = upload.kind; setLastContext({ baseRaw: currentBaseRaw, maskRaw: currentMaskRaw, kind: upload.kind }); } else if (lastContext) { currentBaseRaw = lastContext.baseRaw; currentMaskRaw = lastContext.maskRaw; uploadKind = lastContext.kind; }
    let execution: IaraExecutionIdentity | null = null;
    try {
      const correlationId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      execution = { userId: user.id, projectId: context.projectId, environmentId: context.environmentId, versionId: context.versionId, correlationId, generation: executionGenerationRef.current };
      pendingExecutionsRef.current.set(correlationId, execution);
      const nextProjectState = createProjectStateFromConversation([promptText], projectStateRef.current);
      projectStateRef.current = nextProjectState;
      setProjectState(nextProjectState);
      const projectStateSummaryText = projectStateSummary(nextProjectState);
      const intentInput = { message: promptText, projectId: context.projectId, environmentId: context.environmentId, versionId: context.versionId, ...(uploadKind ? { uploadKind } : {}), ...(projectStateSummaryText ? { projectState: nextProjectState, projectStateSummary: projectStateSummaryText } : {}), ...(smartAction ? { domain: smartAction.domain, action: smartAction.id } : {}) } as Record<string, unknown>;
      const userMetadata: MessageMetadata = { correlationId, projectId: context.projectId ?? undefined, environmentId: context.environmentId ?? undefined, versionId: context.versionId ?? undefined, status: 'requested', ...(uploadKind ? { uploadKind } : {}), ...(smartAction ? { intent: { domain: smartAction.domain, action: smartAction.id, agent: 'IARA' } } : {}), ...(projectStateSummaryText ? { projectStateSummary: projectStateSummaryText } : {}) };
      await saveMessage({ sender: 'user', text: promptText, image_url: previewImg, metadata: userMetadata }, execution);
      if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) { pendingExecutionsRef.current.delete(correlationId); return; }
      await persistIaraContext(user.id, { ...(activeContext ?? {}), projectId: context.projectId, environmentId: context.environmentId, versionId: context.versionId } as IaraContext, correlationId).catch(() => undefined);
      const conversation = [...messages, { sender: 'user', text: promptText }].filter(message => typeof message.text === 'string' && message.text.trim()).slice(-12).map(message => ({ sender: message.sender === 'user' ? 'user' : 'iara', text: message.text!.trim() }));
      const marcenaria = await loadMarcenariaContext(user.id);
      const response = await runIaraConversation({ ...intentInput, userId: user.id, factors, decorStyle, baseImage: currentBaseRaw, maskImage: currentMaskRaw, correlationId, marcenaria, conversation });
      if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) return;
      if (response.error) throw new Error(response.error);
      const toolFailure = response.results?.find(({ result }) => !result.ok);
      if (toolFailure) {
        const message = toolFailureMessage(toolFailure.tool, toolFailure.result.ok === false ? toolFailure.result.error : undefined);
        throw new Error(message);
      }
      if (response.status === 'failed') throw new Error(response.error ?? 'A IARA não conseguiu concluir a solicitação.');
      if (response.results?.some(({ tool }) => tool === 'gerarRender')) { setIsTyping(true); return; }
      const assistantText = response.summary || 'Entendi. Vou seguir com o próximo passo.';
      await saveMessage({ sender: 'iara', text: assistantText, metadata: { correlationId, projectId: context.projectId ?? undefined, environmentId: context.environmentId ?? undefined, versionId: context.versionId ?? undefined, status: 'completed' } }, execution);
      pendingExecutionsRef.current.delete(correlationId); setIsTyping(false); setPendingUpload(null); setMaskingImage(null);
    } catch (e) {
      const message = humanizeError(e); setError(message); if (execution) pendingExecutionsRef.current.delete(execution.correlationId); setIsTyping(false); lastFailedRef.current = { text: promptText, upload: upload ?? pendingUpload, smartAction };
      try { await saveMessage({ sender: 'iara', text: message, metadata: { status: 'error', ...(execution ? { correlationId: execution.correlationId } : {}) } }, execution ?? undefined); } catch { /* keep the original user-facing error */ }
    }
  };

  const retryLast = () => { if (!lastFailedRef.current) return; const retry = lastFailedRef.current; setError(null); void sendPrompt(retry.text, retry.upload, retry.smartAction); };
  const handleSend = () => { const text = chatInput.trim(); if (!text || isTyping) return; setChatInput(''); void sendPrompt(text, pendingUpload ?? lastContext ? pendingUpload : null); };
  const handleSuggestion = (text: string) => { if (isTyping) return; setChatInput(text); };
  const handleSmartAction = (action: SmartAction) => { if (isTyping) return; setChatInput(action.prompt); void sendPrompt(action.prompt, pendingUpload ?? lastContext ? pendingUpload : null, action); };
  const handleImageSelected = (file: File, kind: UploadKind = 'environment') => {
    if (!user) { setShowAuthDialog(true); return; }
    const reader = new FileReader();
    reader.onload = () => { const src = String(reader.result ?? ''); const img = new Image(); img.onload = () => setMaskingImage({ src, img, kind }); img.src = src; };
    reader.readAsDataURL(file);
  };
  const confirmMask = (baseRaw: string, maskRaw: string, base64: string, kind: UploadKind) => { setPendingUpload({ base64, baseRaw, maskRaw, kind }); setMaskingImage(null); };
  const cancelMask = () => setMaskingImage(null);
  const toggleListening = () => {
    const browser = window as BrowserWithSpeechRecognition;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) { setError('O reconhecimento de voz não está disponível neste navegador.'); return; }
    const recognition = new Recognition(); recognition.lang = 'pt-BR'; recognition.onstart = () => setIsListening(true); recognition.onend = () => setIsListening(false); recognition.onresult = event => { const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').trim(); if (transcript) setChatInput(prev => `${prev}${prev ? ' ' : ''}${transcript}`); }; recognitionRef.current = recognition; recognition.start();
  };
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);
  const onSend = () => handleSend();
  const send = (text: string) => void sendPrompt(text, pendingUpload ?? lastContext ? pendingUpload : null);
  return { messages, chatInput, setChatInput, isTyping, isListening, toggleListening, onSend, send, handleSend, handleSuggestion, handleSmartAction, handleImageSelected, confirmMask, cancelMask, maskingImage, pendingUpload, setPendingUpload, error, setError, retryLast, loadOlderMessages, hasOlderMessages, isLoadingOlderMessages, projectState };
};
