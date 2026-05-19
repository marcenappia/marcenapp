import { useEffect, useRef } from 'react';
import { useStudioStore, RenderCommand } from '@/store/useStudioStore';
import { studioService } from '../services/studioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Componente "Headless" que processa comandos do estúdio em segundo plano seguindo uma fila
 */
export const StudioWorker = () => {
  const { user } = useAuth();
  const commandQueue = useStudioStore(state => state.commandQueue);
  const isRendering = useStudioStore(state => state.isRendering);
  const startProcessing = useStudioStore(state => state.startProcessing);
  const completeCommand = useStudioStore(state => state.completeCommand);
  const failCommand = useStudioStore(state => state.failCommand);
  const cancelCommand = useStudioStore(state => state.cancelCommand);

  
  // Ref para evitar processamento duplo se o estado mudar rápido demais
  const currentlyProcessing = useRef<string | null>(null);

  useEffect(() => {
    // Busca o primeiro comando pendente na fila
    const nextCommand = commandQueue.find(cmd => cmd.status === 'pending');
    
    if (nextCommand && !isRendering && currentlyProcessing.current !== nextCommand.id) {
      processCommand(nextCommand);
    }
  }, [commandQueue, isRendering]);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    try {
      await supabase.from('gallery_images').insert({
        user_id: user.id,
        image_url: imageUrl,
        prompt: promptText,
      });
    } catch (err) {
      console.error("Erro ao salvar na galeria:", err);
    }
  };

  const processCommand = async (command: RenderCommand) => {
    // Verifica se o comando foi cancelado antes de iniciar
    const currentCmd = useStudioStore.getState().commandQueue.find(c => c.id === command.id);
    if (currentCmd?.status === 'cancelled') {
      currentlyProcessing.current = null;
      return;
    }

    // Validação de Contrato/Schema
    if (!command.prompt || (!command.images?.length && command.metadata?.origin === 'iara')) {
      failCommand(command.id, "Comando inválido: Faltam parâmetros obrigatórios ou contexto visual.");
      return;
    }

    currentlyProcessing.current = command.id;
    startProcessing(command.id);
    
    try {
      // Simulação de interrupção (AbortController poderia ser usado aqui se o service suportasse)
      const result = await studioService.generateVisual(
        command.prompt, 
        command.images,
        command.style,
        command.decor
      );

      // Verifica se foi cancelado DURANTE o processamento
      const checkCancel = useStudioStore.getState().commandQueue.find(c => c.id === command.id);
      if (checkCancel?.status === 'cancelled') {
        return;
      }

      if (result) {
        await completeCommand(command.id, result);
        await saveToGallery(result, command.prompt);
      } else {

        throw new Error("O serviço de IA não retornou uma imagem válida.");
      }
    } catch (error: any) {
      console.error("StudioWorker Error:", error);
      failCommand(command.id, error?.message || "Erro desconhecido na geração.");
    } finally {
      currentlyProcessing.current = null;
    }
  };

  return null;
};
