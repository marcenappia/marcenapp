import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '../components/ChatMessages';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { runIaraConversation } from '@/lib/agents/domain';
import { loadMarcenariaContext } from '@/modules/marcenaria/marcenariaContext';
import { isIaraCommandForExecution, isIaraExecutionCurrent, type IaraExecutionIdentity } from './iaraExecutionScope';
import { persistIaraContext, type IaraContext } from '../services/iaraContext';
import { createProjectStateFromConversation, projectStateSummary, type ProjectState } from '../services/projectState';
import { blobToDataUrl, persistIaraPendingUpload, clearIaraPendingUpload } from '../services/pendingUploadStorage';
import { persistIaraChatPhoto } from '../services/photoDestination';

interface SpeechRecognitionResultEventLike { results: ArrayLike<ArrayLike<{ transcript: string }>>; }
interface SpeechRecognitionLike { lang: string; onstart: () => void; onend: () => void; onresult: (event: SpeechRecognitionResultEventLike) => void; start: () => void; stop: () => void; }
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type BrowserWithSpeechRecognition = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
type SmartAction = { id: string; label: string; prompt: string; domain: 'project' | 'production' | 'business' | 'execution' };
type MessageMetadata = NonNullable<ChatMessage['metadata']>;
type UploadKind = 'environment' | 'reference' | 'sketch' | 'plan';
type PendingUpload = { base64?: string; baseRaw?: string; maskRaw?: string; kind: UploadKind; blob?: Blob; previewUrl?: string };
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
  if (tool === 'gerarRender' || /nenhuma imagem base|imagem base|máscara|mascara/i.test(message)) return 'Não foi possível gerar o render com os dados disponíveis. A geração somente por texto está desativada por enquanto; envie uma referência visual ou selecione um ambiente com imagem e tente novamente.';
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
  const publishingCommandIdsRef = useRef(new Set<string>());
  const projectStateRef = useRef<ProjectState>(projectState);
  const commandHistoryRef = useRef(commandHistory);
  const context = useMemo(() => ({
    userId: user?.id ?? null,
    projectId: activeContext?.projectId ?? projectId,
    environmentId: activeContext?.environmentId ?? null,
    versionId: activeContext?.versionId ?? null,
  }), [user?.id, activeContext?.projectId, activeContext?.environmentId, activeContext?.versionId, projectId]);

  const saveMessage = useCallback(async (msg: Partial<ChatMessage>, execution?: IaraExecutionIdentity) => {
    if (!user) return;
    if (execution && (execution.userId !== user.id || !isIaraExecutionCurrent(execution, context, executionGenerationRef.current))) return;
    const targetUserId = execution?.userId ?? user.id;
    const target = execution ? { projectId: execution.projectId, environmentId: execution.environmentId, versionId: execution.versionId } : context;
    const { error: insertError } = await supabase.from('chat_messages').insert({ user_id: targetUserId, project_id: target.projectId, environment_id: target.environmentId, version_id: target.versionId, ...msg });
    if (insertError) throw new Error(`Falha ao salvar mensagem: ${insertError.message}`);
  }, [user, context]);

  useEffect(() => { projectStateRef.current = projectState; }, [projectState]);
  useEffect(() => { commandHistoryRef.current = commandHistory; }, [commandHistory]);

  useEffect(() => {
    const persistedGeneration = commandHistoryRef.current.reduce((latest, command) => {
      const payload = command.payload ?? {};
      const sameContext = payload.userId === context.userId
        && (payload.projectId ?? null) === context.projectId
        && (payload.environmentId ?? null) === context.environmentId
        && (payload.versionId ?? null) === context.versionId;
      return sameContext && typeof payload.generation === 'number' ? Math.max(latest, payload.generation) : latest;
    }, 0);
    executionGenerationRef.current = persistedGeneration > 0 ? persistedGeneration : executionGenerationRef.current + 1;
    const generation = executionGenerationRef.current;
    for (const [correlationId, identity] of pendingExecutionsRef.current) {
      if (!isIaraExecutionCurrent(identity, context, generation - 1)) pendingExecutionsRef.current.delete(correlationId);
    }
    setLastContext(null);
    setProjectState({ intent: null, project: { dimensions: {} }, components: [], pending: [], selectedComponentId: null, sourceTurns: 0 });
  }, [context]);

  useEffect(() => {
    if (commandHistory.length === 0) return;
    const pendingResults = commandHistory.flatMap(command => {
      const correlationId = typeof command.payload?.correlationId === 'string' ? command.payload.correlationId : null;
      let execution = correlationId ? pendingExecutionsRef.current.get(correlationId) : undefined;
      if (!execution && correlationId && typeof command.payload?.userId === 'string' && typeof command.payload?.generation === 'number') {
        const recovered: IaraExecutionIdentity = {
          userId: command.payload.userId,
          projectId: typeof command.payload.projectId === 'string' ? command.payload.projectId : null,
          environmentId: typeof command.payload.environmentId === 'string' ? command.payload.environmentId : null,
          versionId: typeof command.payload.versionId === 'string' ? command.payload.versionId : null,
          correlationId,
          generation: command.payload.generation,
        };
        if (isIaraExecutionCurrent(recovered, context, executionGenerationRef.current)) {
          pendingExecutionsRef.current.set(correlationId, recovered);
          execution = recovered;
        }
      }
      if (!execution || !isIaraCommandForExecution(command, execution) || !isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) return [];
      return [{ command, execution }];
    });
    if (pendingResults.length === 0) return;
    const notifyChat = async () => {
      for (const { command, execution } of pendingResults) {
        if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) continue;
        if (publishingCommandIdsRef.current.has(command.id)) continue;
        if (command.status !== 'completed' && command.status !== 'failed') continue;

        publishingCommandIdsRef.current.add(command.id);
        try {
          let published = false;
          let lastError: unknown = null;
          for (let attempt = 0; attempt < 3 && !published; attempt += 1) {
            try {
              const { data: existingMessage, error: lookupError } = await supabase.from('chat_messages')
                .select('id')
                .eq('user_id', execution.userId)
                .contains('metadata', { commandId: command.id })
                .limit(1)
                .maybeSingle();
              if (lookupError) throw lookupError;

              if (existingMessage?.id) {
                pendingExecutionsRef.current.delete(execution.correlationId);
                setIsTyping(false);
                published = true;
                continue;
              }

              if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) {
                published = true;
                continue;
              }

              if (command.status === 'completed' && command.result?.resultUrl) {
                await saveMessage({
                  sender: 'iara',
                  text: 'O render está pronto.',
                  image_url: command.result.resultUrl,
                  metadata: {
                    commandId: command.id,
                    correlationId: execution.correlationId,
                    projectId: execution.projectId ?? undefined,
                    environmentId: execution.environmentId ?? undefined,
                    versionId: execution.versionId ?? undefined,
                    resultUrl: command.result.resultUrl,
                    imageUrl: command.result.resultUrl,
                    artifact: { type: 'render', id: command.id },
                    actions: [{ id: 'open', label: 'Abrir render', kind: 'open-panel' }],
                    status: 'ready',
                  },
                }, execution);
              } else if (command.status === 'failed') {
                await saveMessage({
                  sender: 'iara',
                  text: 'Não foi possível concluir o render. Revise a imagem e as informações do projeto e tente novamente.',
                  metadata: {
                    commandId: command.id,
                    status: 'error',
                    correlationId: execution.correlationId,
                    projectId: execution.projectId ?? undefined,
                    environmentId: execution.environmentId ?? undefined,
                    versionId: execution.versionId ?? undefined,
                    actions: [{ id: 'retry', label: 'Tentar novamente', kind: 'retry' }],
                  },
                }, execution);
              } else {
                published = true;
                continue;
              }

              pendingExecutionsRef.current.delete(execution.correlationId);
              setIsTyping(false);
              published = true;
            } catch (error) {
              lastError = error;
              if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
            }
          }

          if (!published) {
            console.error('Falha ao publicar resultado do comando IARA:', lastError);
            setError('O render foi concluído, mas não foi possível publicar o resultado na conversa. Tente novamente.');
          }
        } finally {
          publishingCommandIdsRef.current.delete(command.id);
        }
      }
    };
    void notifyChat();
  }, [commandHistory, context, saveMessage]);

  useEffect(() => {
    if (!user) { setMessages([]); setHasOlderMessages(false); chatCursorRef.current = null; return; }
    let cancelled = false;
    setMessages([]); setError(null); setHasOlderMessages(false); chatCursorRef.current = null;
    let query = supabase.from('chat_messages').select('*').eq('user_id', user.id);
    // A conversa da IARA pertence ao projeto. Ambiente e versão são contexto ativo,
    // mas não devem apagar o histórico já construído dentro do mesmo projeto.
    query = context.projectId ? query.eq('project_id', context.projectId) : query.is('project_id', null);
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
    const channel = supabase.channel(`chat_messages_project_${context.projectId ?? 'none'}_${user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${user.id}` }, (payload) => { const msg = payload.new as ChatMessage; if (msg.user_id !== user.id || (msg.project_id ?? null) !== (context.projectId ?? null)) return; setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]); if (msg.sender === 'user' && msg.text) setProjectState(prev => { const next = createProjectStateFromConversation([msg.text!], prev); projectStateRef.current = next; return next; }); }).subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [user, context]);

  const loadOlderMessages = useCallback(async () => {
    if (!user || isLoadingOlderMessages || !hasOlderMessages || !chatCursorRef.current) return;
    setIsLoadingOlderMessages(true);
    const cursor = chatCursorRef.current;
    try {
      let query = supabase.from('chat_messages').select('*').eq('user_id', user.id);
      query = context.projectId ? query.eq('project_id', context.projectId) : query.is('project_id', null);
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
  }, [user, context, hasOlderMessages, isLoadingOlderMessages]);

  const sendPrompt = async (promptText: string, upload: typeof pendingUpload, smartAction?: SmartAction) => {
    if (!user) return;
    setIsTyping(true); setError(null);
    let currentBaseRaw: string | null = null; let currentMaskRaw: string | null = null; let previewImg: string | null = null; let uploadKind: UploadKind | null = null;
    if (upload) {
      if (upload.blob) {
        const dataUrl = await blobToDataUrl(upload.blob);
        upload.base64 = dataUrl;
        upload.baseRaw = dataUrl.split(',')[1] ?? '';
      }
      currentBaseRaw = upload.baseRaw ?? null;
      currentMaskRaw = upload.maskRaw ?? '';
      previewImg = upload.base64 ?? null;
      uploadKind = upload.kind;
      setLastContext({ baseRaw: currentBaseRaw ?? '', maskRaw: currentMaskRaw ?? '', kind: upload.kind });
    } else if (lastContext) {
      currentBaseRaw = lastContext.baseRaw;
      currentMaskRaw = lastContext.maskRaw;
      uploadKind = lastContext.kind;
    }
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
      let persistedImageUrl: string | null = null;
      let persistedStoragePath: string | null = null;
      if (currentBaseRaw && context.projectId) {
        const dataUrl = previewImg?.startsWith('data:') ? previewImg : `data:image/jpeg;base64,${currentBaseRaw}`;
        const persisted = await persistIaraChatPhoto({
          userId: user.id,
          projectId: context.projectId,
          environmentId: context.environmentId,
          dataUrl,
        });
        persistedImageUrl = persisted.signedUrl;
        persistedStoragePath = persisted.storagePath;
      }
      const userMetadata: MessageMetadata = { correlationId, projectId: context.projectId ?? undefined, environmentId: context.environmentId ?? undefined, versionId: context.versionId ?? undefined, status: 'requested', ...(uploadKind ? { uploadKind } : {}), ...(persistedStoragePath ? { storagePath: persistedStoragePath } : {}), ...(smartAction ? { intent: { domain: smartAction.domain, action: smartAction.id, agent: 'IARA' } } : {}), ...(projectStateSummaryText ? { projectStateSummary: projectStateSummaryText } : {}) };
      await saveMessage({ sender: 'user', text: promptText, image_url: persistedImageUrl ?? (previewImg?.startsWith('blob:') ? null : previewImg), metadata: userMetadata }, execution);
      if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) { pendingExecutionsRef.current.delete(correlationId); return; }
      await persistIaraContext(user.id, { ...(activeContext ?? {}), projectId: context.projectId, environmentId: context.environmentId, versionId: context.versionId } as IaraContext, correlationId, execution.generation).catch(() => undefined);
      const conversationMessages: Array<Pick<ChatMessage, 'sender' | 'text' | 'metadata'>> = [...messages, { sender: 'user', text: promptText, metadata: null }];
      const conversation = conversationMessages.filter(message => typeof message.text === 'string' && message.text.trim()).slice(-12).map(message => ({ sender: message.sender === 'user' ? 'user' : 'iara', text: message.text!.trim(), ...(message.metadata?.pendingInput ? { metadata: { pendingInput: message.metadata.pendingInput } } : {}) }));
      const marcenaria = await loadMarcenariaContext(user.id);
       const response = await runIaraConversation({ input: intentInput, intent: promptText, projectId: context.projectId ?? undefined, environmentId: context.environmentId ?? undefined, versionId: context.versionId ?? undefined, correlationId, execution: { userId: user.id, projectId: context.projectId ?? undefined, environmentId: context.environmentId ?? undefined, versionId: context.versionId ?? undefined, correlationId, generation: execution.generation, decorStyle, lastImageBase: currentBaseRaw ?? undefined, lastImageMask: currentMaskRaw ?? undefined }, context: { decorStyle, clientId: activeContext?.clientId ?? undefined, projectId: context.projectId ?? undefined, environmentId: context.environmentId ?? undefined, versionId: context.versionId ?? undefined, currentProject: { id: context.projectId, largura: factors.L, altura: factors.A }, conversation, marcenaria, projectState: nextProjectState, projectStateSummary: projectStateSummaryText } });
      if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) { pendingExecutionsRef.current.delete(correlationId); return; }
      const lines = response.run.results.map(({ tool, result }) => { if (result.ok === false) return toolFailureMessage(tool, result.error); const data = result.data as Record<string, unknown>; switch (tool) { case 'createCliente': return `Cliente **${String(data.nome ?? 'sem nome')}** cadastrado.`; case 'createProjeto': { const width = Number(data.width); const height = Number(data.height); const depth = Number(data.depth); if (Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(depth)) hooks?.onProjectCreated?.({ width, height, depth }); return `Projeto **${String(data.nome ?? 'Projeto')}** criado.`; } case 'gerarRender': return typeof data.imageUrl === 'string' && data.imageUrl ? 'O render foi gerado e está pronto.' : 'A solicitação de render foi recebida. Aviso quando estiver pronto.'; case 'calcularOrcamento': { const precoVenda = Number(data.precoVenda); const materiais = Number(data.materiais); const ferragens = Number(data.ferragens); const maoDeObra = Number(data.maoDeObra); const outros = Number(data.outros); const lucro = Number(data.lucro); const margemPct = Number(data.margemPct); return `Orçamento atualizado: **R$ ${precoVenda.toLocaleString('pt-BR')}**. Custos: R$ ${materiais.toLocaleString('pt-BR')} em materiais, R$ ${ferragens.toLocaleString('pt-BR')} em ferragens, R$ ${maoDeObra.toLocaleString('pt-BR')} de mão de obra e R$ ${outros.toLocaleString('pt-BR')} em outros custos. Lucro: R$ ${lucro.toLocaleString('pt-BR')} (${margemPct.toLocaleString('pt-BR')}%).`; } case 'gerarContrato': return `Documento preparado para **${String(data.cliente ?? 'cliente')}**.`; case 'operationalIntelligence': return 'Informações operacionais do projeto atualizadas.'; default: return 'Ação concluída.'; } });
      const directRenderResult = response.run.results.find(({ tool, result }) => tool === 'gerarRender' && result.ok === true)?.result;
      const directRenderImageUrl = directRenderResult && 'data' in directRenderResult && typeof (directRenderResult.data as Record<string, unknown>)?.imageUrl === 'string' ? String((directRenderResult.data as Record<string, unknown>)?.imageUrl) : null;
      const renderQueued = response.run.results.some(({ tool, result }) => {
        if (tool !== 'gerarRender' || result.ok === false) return false;
        const data = result.data as Record<string, unknown>;
        return data.status === 'queued' && typeof data.imageUrl !== 'string';
      });
      const artifact = response.artifacts[0];
      const responseStatus = renderQueued ? 'processing' : response.run.status === 'completed' ? 'ready' : response.run.status;
      const metadata: MessageMetadata = { domain: response.domain, action: response.action, agent: response.domainAgent, correlationId: response.correlationId, clientId: activeContext?.clientId ?? undefined, projectId: context.projectId ?? undefined, environmentId: context.environmentId ?? undefined, versionId: context.versionId ?? undefined, status: responseStatus, ...(uploadKind ? { uploadKind } : {}), artifacts: response.artifacts, panel: response.panel, ...(artifact ? { artifact: { type: artifact.type, id: artifact.id } } : {}), ...(response.run.pendingInput ? { pendingInput: response.run.pendingInput } : {}), ...(artifact && !renderQueued ? { actions: [{ id: 'open', label: artifact.type === 'render' ? 'Abrir render' : 'Abrir artefato', kind: 'open-panel' }] } : {}), ...(directRenderImageUrl ? { resultUrl: directRenderImageUrl, imageUrl: directRenderImageUrl } : {}) };
      const header = response.run.status === 'needs_input' ? 'Preciso confirmar uma informação antes de continuar.' : response.run.status === 'failed' ? 'Não foi possível concluir esta ação.' : directRenderImageUrl ? 'Pronto.' : renderQueued ? 'Render em processamento.' : response.action === 'render' ? 'Render solicitado.' : 'Pronto.';
      const needsInputDetail = response.run.status === 'needs_input' ? (response.run.error ?? response.run.summary ?? '') : '';
      const body = needsInputDetail || (lines.length ? lines.join('\n') : renderQueued ? 'A imagem foi colocada na fila. A IARA só vai informar que o render está pronto quando a imagem realmente estiver disponível.' : 'Pode me dizer o que você quer fazer no projeto?');
      if (!isIaraExecutionCurrent(execution, context, executionGenerationRef.current)) { pendingExecutionsRef.current.delete(correlationId); return; }
      await saveMessage({ sender: 'iara', text: `${header}\n\n${body}`, ...(directRenderImageUrl ? { image_url: directRenderImageUrl } : {}), metadata }, execution);
      // Keep the execution identity alive until the asynchronous Studio command
      // finishes. The commandHistory effect publishes the final image (or failure).
      if (!renderQueued) pendingExecutionsRef.current.delete(correlationId);
      lastFailedRef.current = null;
    } catch (error: unknown) { lastFailedRef.current = { text: promptText, upload, smartAction }; if (execution) pendingExecutionsRef.current.delete(execution.correlationId); setError(humanizeError(error)); } finally { setIsTyping(false); }
  };

  const handleSend = async (textOverride?: string) => {
    if (!textOverride?.trim() && !chatInput.trim() && !pendingUpload) return;
    if (!user) { setShowAuthDialog(true); return; }
    const promptText = textOverride?.trim() || chatInput.trim() || 'Analise a imagem anexada e me diga como podemos seguir.';
    const upload = pendingUpload;
    setChatInput('');
    await sendPrompt(promptText, upload);
    if (upload?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(upload.previewUrl);
    setPendingUpload(null);
    void clearIaraPendingUpload().catch(() => undefined);
  };
  const handleSmartAction = async (action: SmartAction) => { if (!user) { setShowAuthDialog(true); return; } setChatInput(''); await sendPrompt(action.prompt, null, action); };
  const retryLast = async () => { const failed = lastFailedRef.current; if (!failed) { setError(null); return; } await sendPrompt(failed.text, failed.upload, failed.smartAction); };
  const dismissError = () => setError(null);
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, kind: UploadKind = 'environment') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const previewUrl = URL.createObjectURL(file);
    const immediateUpload: PendingUpload = {
      blob: file,
      previewUrl,
      base64: previewUrl,
      baseRaw: '',
      maskRaw: '',
      kind,
    };

    setPendingUpload(immediateUpload);
    void persistIaraPendingUpload(file, kind).catch(() => {
      setError('A foto foi capturada, mas não foi possível garantir o armazenamento local. Tente novamente.');
    });

    void (async () => {
      try {
        const img = new Image();
        img.src = previewUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Falha ao decodificar a foto.'));
        });
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        if (scale >= 1) return;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        if (!blob) return;
        await persistIaraPendingUpload(blob, kind);
        setPendingUpload(prev => prev?.previewUrl === previewUrl ? { ...prev, blob, baseRaw: '' } : prev);
      } catch {
        // The original Blob remains the durable capture.
      }
    })();
  };
  useEffect(() => { const browserWindow = window as BrowserWithSpeechRecognition; const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition; if (!SpeechRecognition) return; const r = new SpeechRecognition(); r.lang = 'pt-BR'; r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false); r.onresult = (event) => setChatInput(prev => `${prev} ${event.results[0][0].transcript}`.trim()); recognitionRef.current = r; return () => { r.stop(); recognitionRef.current = null; }; }, []);
  const toggleRecording = () => { if (!recognitionRef.current) { setError('Seu navegador não disponibilizou reconhecimento de voz. Você pode continuar pelo texto.'); return; } if (isListening) recognitionRef.current.stop(); else recognitionRef.current.start(); };
  return { messages, hasOlderMessages, isLoadingOlderMessages, loadOlderMessages, chatInput, setChatInput, isTyping, isListening, handleSend, handleSmartAction, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload, error, retryLast, dismissError, projectState, projectStateSummary: projectStateSummary(projectState) };
};
