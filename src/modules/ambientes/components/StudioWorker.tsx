import { useEffect, useMemo, useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { studioService } from '../services/studioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Componente "Headless" que processa comandos do estúdio em segundo plano seguindo uma fila
 */
export const StudioWorker = () => {
  const { user } = useAuth();
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const commandQueue = useMemo(
    () => commandHistory.filter(cmd => cmd.target === 'studio'),
    [commandHistory]
  );
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

  const processCommand = async (osCommand: any) => {
    const command = osCommand.payload;
    
    // Verifica se o comando foi cancelado antes de iniciar
    if (osCommand.status === 'cancelled') {
      currentlyProcessing.current = null;
      return;
    }

    // Validação de Contrato/Schema
    if (!command.prompt || (!command.images?.length && command.metadata?.origin === 'iara')) {
      failCommand(osCommand.id, "Comando inválido: Faltam parâmetros obrigatórios ou contexto visual.");
      return;
    }

    currentlyProcessing.current = osCommand.id;
    startProcessing(osCommand.id);
    
    try {
      const result = await studioService.generateVisual(
        command.prompt, 
        command.images,
        command.style,
        command.decor
      );

      // Verifica se foi cancelado DURANTE o processamento
      const checkCancel = useMarcenappOS.getState().commandHistory.find(c => c.id === osCommand.id);
      if (checkCancel?.status === 'cancelled') {
        return;
      }

      if (result) {
        await completeCommand(osCommand.id, result);
        await saveToGallery(result, command.prompt);
      } else {
        throw new Error("O serviço de IA não retornou uma imagem válida.");
      }
    } catch (error: any) {
      console.error("StudioWorker Error:", error);
      failCommand(osCommand.id, error?.message || "Erro desconhecido na geração.");
    } finally {
      currentlyProcessing.current = null;
    }
  };

  return null;
};
