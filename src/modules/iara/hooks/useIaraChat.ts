import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { callAIImage } from '@/services/ai';
import { compressImage } from '@/utils/format';
import { ChatMessage } from '../components/ChatMessages';

export const useIaraChat = (factors: any, decorStyle: string, setShowAuthDialog: (val: boolean) => void) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [maskingImage, setMaskingImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ base64: string; baseRaw: string; maskRaw: string } | null>(null);
  const [lastContext, setLastContext] = useState<{ baseRaw: string; maskRaw: string } | null>(null);
  
  const recognitionRef = useRef<any>(null);

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

    let baseVal = 1200;
    if (promptText.toLowerCase().includes("cozinha")) baseVal = 6000;
    if (promptText.toLowerCase().includes("guarda-roupa")) baseVal = 3000;
    const finalBudget = (baseVal * factors.L * factors.A * (decorStyle === "Luxo" ? 1.5 : 1)).toFixed(2);

    try {
      const finalPrompt = `MARCENAPP 4.0: Crie um móvel de estilo ${decorStyle}. REFINAMENTO DO MESTRE: ${promptText}. Dimensões: L:${factors.L} A:${factors.A}. Fotorrealismo máximo.`;
      const images = [
        { mimeType: 'image/jpeg', data: currentBaseRaw! },
        { mimeType: 'image/png', data: currentMaskRaw! },
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
    messages,
    chatInput,
    setChatInput,
    isTyping,
    isListening,
    handleSend,
    handleImageSelect,
    toggleRecording,
    maskingImage,
    setMaskingImage,
    pendingUpload,
    setPendingUpload
  };
};
