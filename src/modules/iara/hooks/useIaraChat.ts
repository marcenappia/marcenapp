import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '../components/ChatMessages';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { runOrchestrator } from '@/core/orchestrator';
import { assessIaraRequest } from '@/core/iaraBrain';
import { assessIaraJourneyReadiness, type IaraJourneyReadiness, type IaraJourneyTarget } from '@/core/iaraJourneyReadiness';
import { createIaraMemory, getConfirmedMeasurements, getMeasurementEvidence, IaraMemory, normalizeIaraMemory, rememberEvent, rememberMeasurements, resolveIaraConflict } from '@/core/iaraMemory';
import { syncIaraOperationalMemory } from '@/core/iaraOperationalMemory';
import { carregarDiario } from '@/modules/projetos/services/diarioStorage';

interface SpeechRecognitionResultLike { transcript: string; }
interface SpeechRecognitionEventLike { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>; }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onstart?: () => void;
  onresult?: (event: SpeechRecognitionEventLike) => void;
  onend?: () => void;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };

export const useIaraChat = (
  factors: { L: number, A: number, P?: number },
  decorStyle: string,
  setShowAuthDialog: (val: boolean) => void,
  hooks?: { onProjectCreated?: (p: { width: number; height: number; depth: number }) => void },
  projectId: string | null = null,
) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [maskingImage, setMaskingImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ base64: string; baseRaw: string; maskRaw: string } | null>(null);
  const [lastContext, setLastContext] = useState<{ baseRaw: string; maskRaw: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<IaraMemory>(createIaraMemory());
  const lastFailedRef = useRef<{ text: string; upload: typeof pendingUpload } | null>(null);
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const errorMessage = (value: unknown, fallback: string) => value instanceof Error && value.message ? value.message : fallback;

  useEffect(() => {
    if (!commandHistory.length) return;
    const lastCommand = commandHistory[0];
    const notifyChat = async () => {
      const lastProcessedId = localStorage.getItem('last_processed_command_id');
      if (lastProcessedId === lastCommand.id && lastCommand.status === 'completed') return;
      const resultUrl = typeof (lastCommand.result as { resultUrl?: unknown } | undefined)?.resultUrl === 'string'
        ? String((lastCommand.result as { resultUrl?: string }).resultUrl)
        : '';
      if (lastCommand.status === 'completed' && resultUrl) {
        localStorage.setItem('last_processed_command_id', lastCommand.id);
        await saveMessage({ sender: 'iara', text: `A materialização foi concluída com sucesso no Estúdio! (Ref: ${lastCommand.id})`, image_url: resultUrl, metadata: { commandId: lastCommand.id, resultUrl } });
        setIsTyping(false);
      } else if (lastCommand.status === 'failed') {
        await saveMessage({ sender: 'iara', text: `Desculpe, o Estúdio encontrou um problema ao processar sua solicitação: ${lastCommand.error}.` });
        setIsTyping(false);
      }
    };
    notifyChat();
  }, [commandHistory]);

  useEffect(() => {
    if (!user) { setMessages([]); setMemory(createIaraMemory()); return; }
    let cancelled = false;
    setMessages([]);
    setMemory(createIaraMemory());
    setError(null);
    let query = supabase.from('chat_messages').select('*').eq('user_id', user.id);
    query = projectId ? query.eq('project_id', projectId) : query.is('project_id', null);
    query.order('created_at', { ascending: true }).then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) { setError('Não foi possível carregar o histórico. Verifique sua conexão.'); return; }
      if (data) setMessages(data as ChatMessage[]);
    });
    if (projectId) {
      supabase.from('projects').select('jornada,internal_material,external_material,back_material').eq('id', projectId).eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (cancelled || !data) return;
        const jornadaData = data.jornada && typeof data.jornada === 'object' && !Array.isArray(data.jornada) ? data.jornada as Record<string, unknown> : {};
        const rawMemory = normalizeIaraMemory(jornadaData.iaraMemory);
        const project = {
          jornada: data.jornada,
          internalMaterial: data.internal_material,
          externalMaterial: data.external_material,
          backMaterial: data.back_material,
        };
        const diary = carregarDiario(projectId);
        const synced = syncIaraOperationalMemory(rawMemory, project, diary);
        setMemory(synced);
        if (synced.updatedAt !== rawMemory.updatedAt || synced.lastEvent?.type !== rawMemory.lastEvent?.type) {
          supabase.from('projects').update({ jornada: { ...jornadaData, iaraMemory: synced } }).eq('id', projectId).eq('user_id', user.id);
        }
      });
    }
    const channel = supabase.channel(`chat_messages_${projectId ?? 'none'}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${user.id}` }, (payload) => {
      const msg = payload.new as ChatMessage;
      if ((msg.project_id ?? null) !== (projectId ?? null)) return;
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    }).subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, projectId]);

  const saveMessage = async (msg: Partial<ChatMessage>) => {
    if (!user) return;
    const { error: insertError } = await supabase.from('chat_messages').insert({ user_id: user.id, project_id: projectId, ...msg, metadata: msg.metadata ?? null });
    if (insertError) throw new Error(`Falha ao salvar mensagem: ${insertError.message}`);
  };

  const persistMemory = async (next: IaraMemory, targetProjectId = projectId) => {
    setMemory(next);
    if (!user || !targetProjectId) return;
    const { data } = await supabase.from('projects').select('jornada').eq('id', targetProjectId).eq('user_id', user.id).maybeSingle();
    if (!data) return;
    const jornada = (data.jornada ?? {}) as Record<string, unknown>;
    await supabase.from('projects').update({ jornada: { ...jornada, iaraMemory: next } }).eq('id', targetProjectId).eq('user_id', user.id);
  };

  const targetFromPrompt = (prompt: string): IaraJourneyTarget | null => {
    const lower = prompt.toLocaleLowerCase('pt-BR');
    if (/(corte|cortar|seccionadora|cnc)/i.test(lower)) return 'corte';
    if (/(produ[cç][aã]o|fabricar|fabric[aç][aã]o|liberar)/i.test(lower)) return 'producao';
    if (/(or[cç]amento|pre[cç]o|valor|quanto custa|fechar)/i.test(lower)) return 'orcamento';
    return null;
  };

  const readiness = (target: IaraJourneyTarget): IaraJourneyReadiness => assessIaraJourneyReadiness(target, memory);

  const sendPrompt = async (promptText: string, upload: typeof pendingUpload) => {
    if (!user) return;
    setIsTyping(true);
    setError(null);
    let currentBaseRaw: string | null = null;
    let currentMaskRaw: string | null = null;
    let previewImg: string | null = null;
    if (upload) { currentBaseRaw = upload.baseRaw; currentMaskRaw = upload.maskRaw; previewImg = upload.base64; setLastContext({ baseRaw: currentBaseRaw, maskRaw: currentMaskRaw }); }
    else if (lastContext) { currentBaseRaw = lastContext.baseRaw; currentMaskRaw = lastContext.maskRaw; }

    try {
      await saveMessage({ sender: 'user', text: promptText, image_url: previewImg });
      const evidence = getMeasurementEvidence(memory);
      const confirmed = getConfirmedMeasurements(memory);
      const brain = assessIaraRequest(promptText, { width: confirmed.width ?? factors.L, height: confirmed.height ?? factors.A, depth: confirmed.depth ?? factors.P, hasImage: Boolean(currentBaseRaw), measurementEvidence: evidence });
      if (!brain.allow) {
        await saveMessage({ sender: 'iara', text: `🛡️ **Conferência necessária**\n\n${brain.reason}\n\n${brain.question}`, metadata: { brain: true, status: brain.status, blocked: true, projectId, memoryEvidence: evidence } });
        lastFailedRef.current = null;
        return;
      }

      const target = targetFromPrompt(promptText);
      if (target) {
        const gate = readiness(target);
        if (!gate.ready) {
          await saveMessage({ sender: 'iara', text: `🧭 **Ainda não é hora de ${target}.**\n\n${gate.blockers.map(blocker => `• ${blocker}`).join('\n')}\n\nQuando esses pontos estiverem conferidos, eu continuo sem refazer o trabalho.`, metadata: { journeyReadiness: gate, blocked: true, projectId } });
          lastFailedRef.current = null;
          return;
        }
      }

      const run = await runOrchestrator(
        promptText,
        { userId: user.id, decorStyle, lastImageBase: currentBaseRaw ?? undefined, lastImageMask: currentMaskRaw ?? undefined },
        { decorStyle, currentProject: { largura: confirmed.width ?? factors.L, altura: confirmed.height ?? factors.A, profundidade: confirmed.depth ?? factors.P }, iaraBrain: { evidenceStatus: brain.status, criticalRequest: brain.critical, imageIsEvidenceOnly: Boolean(currentBaseRaw) }, iaraMemory: { evidenceStatus: evidence, confirmedMeasurements: confirmed, conflicts: memory.conflicts.filter(c => !c.resolved).slice(0, 10) }, journeyReadiness: target ? readiness(target) : undefined },
      );

      if (run.plan.length === 0) {
        await saveMessage({ sender: 'iara', text: run.summary || 'Pode detalhar melhor? Não identifiquei uma ação a executar.' });
        lastFailedRef.current = null;
        return;
      }

      let nextMemory = rememberEvent(memory, 'pedido-processado', promptText.slice(0, 180));
      const linhas = run.results.map(({ tool, result }) => {
        if (result.ok === false) return `❌ ${tool}: ${result.error}`;
        const data = (result.data ?? {}) as Record<string, unknown>;
        const texto = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
        const numero = (v: unknown) => (v === null || v === undefined || v === '' ? 0 : Number(v));
        switch (tool) {
          case 'createCliente': return `✅ Cliente **${texto(data.nome)}** cadastrado.`;
          case 'createProjeto':
            if (data.width && data.height && data.depth) {
              const measurements = { width: numero(data.width), height: numero(data.height), depth: numero(data.depth) };
              hooks?.onProjectCreated?.(measurements);
              nextMemory = rememberMeasurements(nextMemory, measurements, 'CONFIRMADO', 'usuario');
              nextMemory = rememberEvent(nextMemory, 'medidas-confirmadas', `${measurements.width} × ${measurements.height} × ${measurements.depth} m`);
            }
            return `✅ Projeto **${texto(data.nome)}** criado (${texto(data.width)}×${texto(data.height)}×${texto(data.depth)}m).`;
          case 'gerarRender': return `🎨 Render enfileirado no Estúdio (ref: ${texto(data.studioCommandId)}). Aviso quando ficar pronto.`;
          case 'calcularOrcamento': return `💰 Orçamento estimado: **R$ ${numero(data.total).toLocaleString('pt-BR')}** (materiais R$ ${numero(data.materiais).toLocaleString('pt-BR')} + mão de obra R$ ${numero(data.maoDeObra).toLocaleString('pt-BR')}).`;
          case 'gerarContrato': return `📄 Contrato preparado para **${texto(data.cliente)}**${data.valor ? ` (R$ ${numero(data.valor).toLocaleString('pt-BR')})` : ''}. ${texto(data.clausulasGeradas)} cláusula(s) via IA.`;
          default: return `✅ ${tool} executado.`;
        }
      });
      if (nextMemory.updatedAt !== memory.updatedAt || nextMemory.lastEvent?.type !== memory.lastEvent?.type) await persistMemory(nextMemory);
      const footer = run.usedFallback ? '\n\n_(interpretação por fallback keyword)_' : '';
      const header = run.summary ? `${run.summary}\n\n` : '';
      await saveMessage({ sender: 'iara', text: `${header}${linhas.join('\n')}${footer}`, metadata: { memoryEvidence: getMeasurementEvidence(nextMemory), memoryUpdatedAt: nextMemory.updatedAt, journeyReadiness: target ? readiness(target) : undefined } });
      lastFailedRef.current = null;
    } catch (error) {
      lastFailedRef.current = { text: promptText, upload };
      setError(errorMessage(error, 'Falha ao falar com a IARA. Tente novamente.'));
    } finally { setIsTyping(false); }
  };

  const handleSend = async () => {
    if (!chatInput.trim() && !pendingUpload) return;
    if (!user) { setShowAuthDialog(true); return; }
    const promptText = chatInput.trim();
    const upload = pendingUpload;
    setChatInput(""); setPendingUpload(null);
    await sendPrompt(promptText, upload);
  };

  const retryLast = async () => { const failed = lastFailedRef.current; if (!failed) { setError(null); return; } await sendPrompt(failed.text, failed.upload); };
  const dismissError = () => setError(null);
  const resolveMemoryConflict = async (conflictId: string, choice: 'confirmed' | 'new') => {
    const next = resolveIaraConflict(memory, conflictId, choice);
    if (next === memory) return;
    await persistMemory(next);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (r) => { const img = new Image(); img.onload = () => setMaskingImage({ src: r.target!.result as string, img }); img.src = r.target!.result as string; };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = "pt-BR";
      r.onstart = () => setIsListening(true);
      r.onend = () => setIsListening(false);
      r.onresult = (event) => setChatInput(prev => `${prev} ${event.results[0]?.[0]?.transcript ?? ''}`.trim());
      recognitionRef.current = r;
    }
  }, []);
  const toggleRecording = () => { if (isListening) recognitionRef.current?.stop(); else recognitionRef.current?.start(); };

  const memoryEvidence = getMeasurementEvidence(memory);
  const memoryConflictCount = memory.conflicts.filter(c => !c.resolved).length;
  return { messages, chatInput, setChatInput, isTyping, isListening, handleSend, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload, error, retryLast, dismissError, memoryEvidence, memoryConflictCount, memory, resolveMemoryConflict, readiness };
};
