import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '../components/ChatMessages';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { runOrchestrator } from '@/core/orchestrator';

interface SpeechRecognitionLike {
  start: () => void;
  stop: () => void;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

export const useIaraChat = (
  factors: { L: number, A: number },
  decorStyle: string,
  setShowAuthDialog: (val: boolean) => void,
  hooks?: { onProjectCreated?: (p: { width: number; height: number; depth: number }) => void },
  /** Projeto ativo — histórico é isolado por projeto (null = sem projeto salvo) */
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
  const lastFailedRef = useRef<{ text: string; upload: typeof pendingUpload } | null>(null);
  
  const commandHistory = useMarcenappOS(state => state.commandHistory);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const saveMessage = useCallback(async (msg: Partial<ChatMessage>) => {
    if (!user) return;
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, project_id: projectId, ...msg });
    if (insertError) throw new Error(`Falha ao salvar mensagem: ${insertError.message}`);
  }, [user, projectId]);

  // Monitora mudanças de status na fila de comandos para notificar o usuário
  useEffect(() => {
    if (commandHistory.length === 0) return;
    const lastCommand = commandHistory[0];
    
    const notifyChat = async () => {
      // Evita loops infinitos ou notificações duplicadas
      const lastProcessedId = localStorage.getItem('last_processed_command_id');
      if (lastProcessedId === lastCommand.id && lastCommand.status === 'completed') return;

      const resultUrl = lastCommand.result?.resultUrl;
      if (lastCommand.status === 'completed' && typeof resultUrl === 'string' && resultUrl.length > 0) {
        localStorage.setItem('last_processed_command_id', lastCommand.id);
        
        // Validação rigorosa: Vincular resultado ao ID do comando no chat
        await saveMessage({
          sender: 'iara',
          text: `A materialização foi concluída com sucesso no Estúdio! (Ref: ${lastCommand.id})`,
          image_url: resultUrl,
          metadata: {
            commandId: lastCommand.id,
            resultUrl
          }
        });
        setIsTyping(false);
      } else if (lastCommand.status === 'failed') {
        await saveMessage({
          sender: 'iara',
          text: `Desculpe, o Estúdio encontrou um problema ao processar sua solicitação: ${lastCommand.error}.`,
        });
        setIsTyping(false);
      }
    };

    notifyChat();
  }, [commandHistory, saveMessage]);

  useEffect(() => {
    if (!user) { setMessages([]); return; }
    let cancelled = false;
    setMessages([]);
    setError(null);

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id);
    query = projectId ? query.eq('project_id', projectId) : query.is('project_id', null);
    query.order('created_at', { ascending: true }).then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) { setError('Não foi possível carregar o histórico. Verifique sua conexão.'); return; }
      if (data) setMessages(data as ChatMessage[]);
    });

    const channel = supabase
      .channel(`chat_messages_${projectId ?? 'none'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if ((msg.project_id ?? null) !== (projectId ?? null)) return;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, projectId]);

  const sendPrompt = async (promptText: string, upload: typeof pendingUpload) => {
    if (!user) return;
    setIsTyping(true);
    setError(null);

    let currentBaseRaw: string | null = null;
    let currentMaskRaw: string | null = null;
    let previewImg: string | null = null;

    if (upload) {
      currentBaseRaw = upload.baseRaw;
      currentMaskRaw = upload.maskRaw;
      previewImg = upload.base64;
      setLastContext({ baseRaw: currentBaseRaw, maskRaw: currentMaskRaw });
    } else if (lastContext) {
      currentBaseRaw = lastContext.baseRaw;
      currentMaskRaw = lastContext.maskRaw;
    }

    try {
      await saveMessage({ sender: 'user', text: promptText, image_url: previewImg });

      const run = await runOrchestrator(
        promptText,
        {
          userId: user.id,
          decorStyle,
          lastImageBase: currentBaseRaw ?? undefined,
          lastImageMask: currentMaskRaw ?? undefined,
        },
        {
          decorStyle,
          currentProject: { largura: factors.L, altura: factors.A },
        },
      );

      // Sem plano → conversa/pedido de esclarecimento
      if (run.plan.length === 0) {
        await saveMessage({
          sender: 'iara',
          text: run.summary || 'Pode detalhar melhor? Não identifiquei uma ação a executar.',
        });
        lastFailedRef.current = null;
        return;
      }

      // Consolida resposta com resultado de cada tool call
      const linhas = run.results.map(({ tool, result }) => {
        if (result.ok === false) return `❌ ${tool}: ${result.error}`;
        switch (tool) {
          case 'createCliente':
            return `✅ Cliente **${(result.data as { nome: string }).nome}** cadastrado.`;
          case 'createProjeto': {
            const projeto = result.data as { nome: string; width: number; height: number; depth: number };
            if (projeto.width && projeto.height && projeto.depth) {
              hooks?.onProjectCreated?.({
                width: Number(projeto.width),
                height: Number(projeto.height),
                depth: Number(projeto.depth),
              });
            }
            return `✅ Projeto **${projeto.nome}** criado (${projeto.width}×${projeto.height}×${projeto.depth}m).`;
          }
          case 'gerarRender':
            return `🎨 Render enfileirado no Estúdio (ref: ${(result.data as { studioCommandId: string }).studioCommandId}). Aviso quando ficar pronto.`;
          case 'calcularOrcamento':
            { const orcamento = result.data as { total: number; materiais: number; maoDeObra: number };
            return `💰 Orçamento estimado: **R$ ${orcamento.total.toLocaleString('pt-BR')}** (materiais R$ ${orcamento.materiais.toLocaleString('pt-BR')} + mão de obra R$ ${orcamento.maoDeObra.toLocaleString('pt-BR')}).`; }
          case 'gerarContrato':
            { const contrato = result.data as { cliente: string; valor: number | null; clausulasGeradas: number };
            return `📄 Contrato preparado para **${contrato.cliente}**${contrato.valor ? ` (R$ ${contrato.valor.toLocaleString('pt-BR')})` : ''}. ${contrato.clausulasGeradas} cláusula(s) via IA.`; }
          default:
            return `✅ ${tool} executado.`;
        }
      });

      const footer = run.usedFallback ? '\n\n_(interpretação por fallback keyword)_' : '';
      const header = run.summary ? `${run.summary}\n\n` : '';
      await saveMessage({
        sender: 'iara',
        text: `${header}${linhas.join('\n')}${footer}`,
      });
      lastFailedRef.current = null;
    } catch (e: unknown) {
      // Guarda o envio para permitir "Tentar novamente" sem redigitar
      lastFailedRef.current = { text: promptText, upload };
      setError(e instanceof Error ? e.message : 'Falha ao falar com a IARA. Tente novamente.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!chatInput.trim() && !pendingUpload) return;
    if (!user) { setShowAuthDialog(true); return; }

    const promptText = chatInput.trim();
    const upload = pendingUpload;
    setChatInput("");
    setPendingUpload(null);
    await sendPrompt(promptText, upload);
  };

  const retryLast = async () => {
    const failed = lastFailedRef.current;
    if (!failed) { setError(null); return; }
    await sendPrompt(failed.text, failed.upload);
  };

  const dismissError = () => setError(null);



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

  useEffect(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (SR) {
      const r = new SR(); r.lang = "pt-BR";
      r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false);
      r.onresult = (e) => setChatInput(prev => `${prev} ${e.results[0][0].transcript}`);
      recognitionRef.current = r;
    }
  }, []);

  const toggleRecording = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  return {
    messages, chatInput, setChatInput, isTyping, isListening, handleSend, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload, error, retryLast, dismissError
  };
};
