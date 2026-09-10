import { useEffect, useMemo, useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { OSCommand, useMarcenappOS } from '@/store/useMarcenappOS';
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
  const currentlyProcessing = useRef<string | null>(null);

  useEffect(() => {
    const nextCommand = commandQueue.find(cmd => cmd.status === 'pending');
    if (nextCommand && !isRendering && currentlyProcessing.current !== nextCommand.id) {
      void processCommand(nextCommand);
    }
  }, [commandQueue, isRendering]);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    const { error } = await supabase.from('gallery_images').insert({
      user_id: user.id,
      image_url: imageUrl,
      prompt: promptText,
    });
    if (error) console.error('Erro ao salvar na galeria:', error.message);
  };

  const resolveRenderCommand = (osCommand: OSCommand) => {
    const payload = osCommand.payload ?? {};
    const studioCommandId: string | undefined = payload.studioCommandId;
    if (studioCommandId) {
      const studioCmd = useStudioStore.getState().commandQueue.find(c => c.id === studioCommandId);
      if (studioCmd) return { command: studioCmd, studioCommandId };
    }
    return { command: payload, studioCommandId: undefined };
  };

  const processCommand = async (osCommand: OSCommand) => {
    if (osCommand.status === 'cancelled') {
      currentlyProcessing.current = null;
      return;
    }

    const { command, studioCommandId } = resolveRenderCommand(osCommand);
    const storeCommandId = studioCommandId ?? osCommand.id;

    const fail = (message: string) => {
      failCommand(storeCommandId, message);
      updateOSStatus(osCommand.id, 'failed', undefined, message);
    };

    if (!command.prompt || (!command.images?.length && command.metadata?.origin === 'iara')) {
      fail('Comando inválido: Faltam parâmetros obrigatórios ou contexto visual.');
      return;
    }

    currentlyProcessing.current = osCommand.id;
    startProcessing(storeCommandId);
    updateOSStatus(osCommand.id, 'processing');

    try {
      const result = await studioService.generateVisual(
        command.prompt,
        command.images,
        command.style,
        command.decor
      );

      if (!result) throw new Error('O serviço de IA não retornou uma imagem válida.');

      completeCommand(storeCommandId, result);
      updateOSStatus(osCommand.id, 'completed', { resultUrl: result });
      await saveToGallery(result, command.prompt);
    } catch (error: any) {
      console.error('StudioWorker Error:', error);
      fail(error?.message || 'Erro desconhecido na geração.');
    } finally {
      currentlyProcessing.current = null;
    }
  };

  return null;
};
