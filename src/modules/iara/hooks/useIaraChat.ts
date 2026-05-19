import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/utils/format';
import { ChatMessage } from '../components/ChatMessages';
import { iaraService } from '../services/iaraService';
import { useStudioStore, RenderCommand } from '@/store/useStudioStore';

export const useIaraChat = (factors: { L: number, A: number }, decorStyle: string, setShowAuthDialog: (val: boolean) => void) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [maskingImage, setMaskingImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ base64: string; baseRaw: string; maskRaw: string } | null>(null);
  const [lastContext, setLastContext] = useState<{ baseRaw: string; maskRaw: string } | null>(null);
  
  const enqueueCommand = useStudioStore(state => state.enqueueCommand);
  const commandQueue = useStudioStore(state => state.commandQueue);
  const recognitionRef = useRef<any>(null);

  // Monitora mudanças de status na fila de comandos para notificar o usuário
  useEffect(() => {
    if (commandQueue.length === 0) return;

    // Pega o comando mais recente para verificar se houve mudança significativa de status
    const lastCommand = commandQueue[commandQueue.length - 1];
    
    const notifyChat = async () => {
      // Evita loops infinitos ou notificações duplicadas
      const lastProcessedId = localStorage.getItem('last_processed_command_id');
      if (lastProcessedId === lastCommand.id && lastCommand.status === 'completed') return;

      if (lastCommand.status === 'completed' && lastCommand.resultUrl) {
        localStorage.setItem('last_processed_command_id', lastCommand.id);
        
        // Validação rigorosa: Vincular resultado ao ID do comando no chat
        await saveMessage({
          sender: 'iara',
          text: `A materialização foi concluída com sucesso no Estúdio! (Ref: ${lastCommand.id})`,
          image_url: lastCommand.resultUrl, // Exibe o resultado se presente
          metadata: {
            commandId: lastCommand.id,
            resultUrl: lastCommand.resultUrl
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
  }, [commandQueue]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

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
      await saveMessage({ sender: 'iara', text: 'Por favor, anexe uma imagem do ambiente para iniciar a materialização.' });
      return;
    }

    await saveMessage({ sender: 'user', text: promptText, image_url: previewImg });

    try {
      const decision = await iaraService.interpretCommand(promptText);
      
      if (decision.type === 'RENDER_REQUEST' && decision.command) {
        const budget = iaraService.calculateSmartBudget(promptText, factors, decorStyle);
        
        // Hash estável e determinístico para idempotência
        const hashPayload = `${promptText}-${decorStyle}-${factors.L}-${factors.A}-${currentBaseRaw?.substring(0, 500)}`;
        let hash = 0;
        for (let i = 0; i < hashPayload.length; i++) {
          const char = hashPayload.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        const idempotencyKey = `iara-${Math.abs(hash).toString(36)}`;

        // ENVIA PARA A FILA DO ESTÚDIO VIA COMMAND BUS (Contrato Tipado)

        enqueueCommand({
          prompt: `MARCENAPP 4.0: Crie um móvel de estilo ${decorStyle}. REFINAMENTO: ${promptText}.`,
          idempotencyKey,
          images: [
            { mimeType: 'image/jpeg', data: currentBaseRaw! },
            { mimeType: 'image/png', data: currentMaskRaw! },
          ],
          decor: decorStyle,
          metadata: {
            origin: 'iara',
            originalPrompt: promptText,
            targetModule: 'studio'
          }
        });
        
        await saveMessage({ 
          sender: 'iara', 
          text: `Comando orquestrado para o Estúdio! (Orçamento: R$ ${budget}). Vou te notificar assim que a materialização for concluída.` 
        });
      } else if (decision.type === 'BUDGET_REQUEST' && decision.command) {
        const budget = iaraService.calculateSmartBudget(promptText, factors, decorStyle);
        await saveMessage({ 
          sender: 'iara', 
          text: `Cálculo financeiro orquestrado via Estela. O valor estimado para este projeto é de R$ ${budget}.` 
        });
        setIsTyping(false);
      } else {
        await saveMessage({ sender: 'iara', text: 'Analisando sua solicitação técnica...' });
        // Lógica de chat normal delegada à IA
        setIsTyping(false);
      }
    } catch (e: any) {
      await saveMessage({ sender: 'iara', text: `Erro na orquestração: ${e?.message || 'Tente novamente.'}` });
      setIsTyping(false);
    }
  };

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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR(); r.lang = "pt-BR";
      r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false);
      r.onresult = (e: any) => setChatInput(prev => `${prev} ${e.results[0][0].transcript}`);
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
    messages, chatInput, setChatInput, isTyping, isListening, handleSend, handleImageSelect, toggleRecording, maskingImage, setMaskingImage, pendingUpload, setPendingUpload
  };
};
