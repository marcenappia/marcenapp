import { useEffect } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { studioService } from '../services/studioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Componente "Headless" que processa comandos do estúdio em segundo plano
 */
export const StudioWorker = () => {
  const { user } = useAuth();
  const pendingCommand = useStudioStore(state => state.pendingCommand);
  const clearCommand = useStudioStore(state => state.clearCommand);
  const setStoreResult = useStudioStore(state => state.setResult);
  const setStoreRendering = useStudioStore(state => state.setRendering);
  const setGeneratedImage = useStudioStore(state => state.setGeneratedImage);

  useEffect(() => {
    if (pendingCommand) {
      processCommand(pendingCommand);
    }
  }, [pendingCommand]);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    await supabase.from('gallery_images').insert({
      user_id: user.id,
      image_url: imageUrl,
      prompt: promptText,
    });
  };

  const processCommand = async (command: any) => {
    setStoreRendering(true);
    try {
      const result = await studioService.generateVisual(
        command.prompt, 
        command.images,
        command.style,
        command.decor
      );

      if (result) {
        setStoreResult(result);
        setGeneratedImage(result);
        await saveToGallery(result, command.prompt);
      }
    } catch (error) {
      console.error("StudioWorker Error:", error);
    } finally {
      setStoreRendering(false);
      clearCommand();
    }
  };

  return null; // Não renderiza nada visualmente
};
