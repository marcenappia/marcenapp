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
      if (lastCommand.status === 'completed') {
        // IARA não recebe mais a imagem. Ela apenas confirma que o Estúdio concluiu.
        await saveMessage({
          sender: 'iara',
          text: `A materialização foi concluída com sucesso no Estúdio! Você pode visualizar o resultado agora acessando o módulo de Materialização.`,
        });
        setIsTyping(false);
      } else if (lastCommand.status === 'failed') {
        await saveMessage({
          sender: 'iara',
          text: `Desculpe, o Estúdio encontrou um problema ao processar sua solicitação: ${lastCommand.error}.`,
        });
        setIsTyping(false);
      } else if (lastCommand.status === 'processing') {
        await saveMessage({
          sender: 'iara',
          text: `O Estúdio já está trabalhando na sua visualização. Estou acompanhando o progresso por aqui.`,
        });
      }
    };
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
      
      if (decision.type === 'RENDER_REQUEST') {
        const budget = iaraService.calculateSmartBudget(promptText, factors, decorStyle);
        
        // ENVIA PARA A FILA DO ESTÚDIO
        enqueueCommand({
          prompt: `MARCENAPP 4.0: Crie um móvel de estilo ${decorStyle}. REFINAMENTO: ${promptText}. Dimensões: L:${factors.L} A:${factors.A}.`,
          images: [
            { mimeType: 'image/jpeg', data: currentBaseRaw! },
            { mimeType: 'image/png', data: currentMaskRaw! },
          ],
          decor: decorStyle
        });
        
        await saveMessage({ 
          sender: 'iara', 
          text: `Entendido. Coloquei sua solicitação na fila de processamento do Estúdio. (Orçamento estimado: R$ ${budget}). Vou te avisar assim que terminar!` 
        });
      } else {
        await saveMessage({ sender: 'iara', text: 'Entendido. Estou processando sua dúvida técnica...' });
        setIsTyping(false);
      }
    } catch (e: any) {
      await saveMessage({ sender: 'iara', text: `Erro no processamento: ${e?.message || 'Tente novamente.'}` });
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
