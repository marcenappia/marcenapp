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
    currentlyProcessing.current = command.id;
    startProcessing(command.id);
    
    try {
      const result = await studioService.generateVisual(
        command.prompt, 
        command.images,
        command.style,
        command.decor
      );

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
