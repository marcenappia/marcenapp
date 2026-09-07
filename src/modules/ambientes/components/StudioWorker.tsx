import { useEffect, useMemo } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { studioService } from '../services/studioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Componente "Headless" que processa comandos do estúdio em segundo plano seguindo uma fila.
 * Fonte de verdade da fila: núcleo OS (useMarcenappOS). Os dados de render (prompt, imagens)
 * vivem em useStudioStore, referenciados por payload.studioCommandId.
 */
export const StudioWorker = () => {
  const { user } = useAuth();
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const updateOSStatus = useMarcenappOS(state => state.updateCommandStatus);
  const commandQueue = useMemo(
    () => commandHistory.filter(cmd => cmd.target === 'studio'),
    [commandHistory]
  );
  const isRendering = useStudioStore(state => state.isRendering);
  const startProcessing = useStudioStore(state => state.startProcessing);
  const completeCommand = useStudioStore(state => state.completeCommand);
  const failCommand = useStudioStore(state => state.failCommand);
  
  // Ref para evitar processamento duplo se o estado mudar rápido demais
  const currentlyProcessing = { current: null as string | null };

  useEffect(() => {
    // Busca o primeiro comando pendente na fila
    const nextCommand = commandQueue.find(cmd => cmd.status === 'pending');
    
    if (nextCommand && !isRendering && currentlyProcessing.current !== nextCommand.id) {
      processCommand(nextCommand);
    }
  }, [commandQueue, isRendering]);


  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    const { error } = await supabase.from('gallery_images').insert({
      user_id: user.id,
      image_url: imageUrl,
      prompt: promptText,
    });
    if (error) console.error("Erro ao salvar na galeria:", error.message);
  };

  /** Resolve os dados de render: comando do Estúdio (por studioCommandId) ou o próprio payload. */
  const resolveRenderCommand = (osCommand: { payload?: any }) => {
    const payload = osCommand.payload ?? {};
    const studioId: string | undefined = payload.studioCommandId;
    if (studioId) {
      const studioCmd = useStudioStore.getState().commandQueue.find(c => c.id === studioId);
      if (studioCmd) return { ...studioCmd };
    }
    return { ...payload };
  };

  const processCommand = async (osCommand: OSCommand) => {
    // Verifica se o comando foi cancelado antes de iniciar
    if (osCommand.status === 'cancelled') {
      currentlyProcessing.current = null;
      return;
    }

    const command = resolveRenderCommand(osCommand);

    const fail = (message: string) => {
      failCommand(osCommand.id, message);
      updateOSStatus(osCommand.id, 'failed', undefined, message);
    };

    // Validação de Contrato/Schema
    if (!command.prompt || (!command.images?.length && command.metadata?.origin === 'iara')) {
      fail("Comando inválido: Faltam parâmetros obrigatórios ou contexto visual.");
      return;
    }

    currentlyProcessing.current = osCommand.id;
    startProcessing(studioId);
    updateOSStatus(osCommand.id, 'processing');
    
    try {
      const result = await studioService.generateVisual(
        command.prompt,
        command.images,
        command.style,
        command.decor
      );

      if (result) {
        completeCommand(osCommand.id, result);
        updateOSStatus(osCommand.id, 'completed', { resultUrl: result });
        await saveToGallery(result, command.prompt);
      } else {
        throw new Error("O serviço de IA não retornou uma imagem válida.");
      }
    } catch (error: any) {
      console.error("StudioWorker Error:", error);
      fail(error?.message || "Erro desconhecido na geração.");
    } finally {
      currentlyProcessing.current = null;
    }
  };

  return null;
};
