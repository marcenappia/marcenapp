import { useEffect, useMemo, useRef } from 'react';
import { useStudioStore, type RenderCommand } from '@/store/useStudioStore';
import { OSCommand, useMarcenappOS } from '@/store/useMarcenappOS';
import { studioService } from '../services/studioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const StudioWorker = () => {
  const { user } = useAuth();
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const updateOSStatus = useMarcenappOS(state => state.updateCommandStatus);
  const commandQueue = useMemo(() => commandHistory.filter(cmd => cmd.target === 'studio' && cmd.payload?.userId === user?.id), [commandHistory, user?.id]);
  const isRendering = useStudioStore(state => state.isRendering);
  const startProcessing = useStudioStore(state => state.startProcessing);
  const completeCommand = useStudioStore(state => state.completeCommand);
  const failCommand = useStudioStore(state => state.failCommand);
  const currentlyProcessing = useRef<string | null>(null);

  useEffect(() => {
    const nextCommand = commandQueue.find(cmd => cmd.status === 'pending');
    if (nextCommand && !isRendering && currentlyProcessing.current !== nextCommand.id) void processCommand(nextCommand);
  }, [commandQueue, isRendering]);

  const saveToGallery = async (imageUrl: string, promptText: string) => {
    if (!user) return;
    const { error } = await supabase.from('gallery_images').insert({ user_id: user.id, image_url: imageUrl, prompt: promptText });
    if (error) console.error('Erro ao salvar na galeria:', error.message);
  };

  const isCurrentContext = async (payload: Record<string, unknown>) => {
    if (!user || payload.userId !== user.id) return false;
    const { data } = await supabase.from('project_iara_contexts').select('project_id,environment_id,version_id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    const current = data as { project_id: string | null; environment_id: string | null; version_id: string | null } | null;
    return (payload.projectId ?? null) === (current?.project_id ?? null)
      && (payload.environmentId ?? null) === (current?.environment_id ?? null)
      && (payload.versionId ?? null) === (current?.version_id ?? null);
  };

  const resolveRenderCommand = (osCommand: OSCommand) => {
    const payload = (osCommand.payload ?? {}) as Partial<RenderCommand> & { studioCommandId?: string; userId?: string };
    const studioCommandId = payload.studioCommandId;
    if (studioCommandId) {
      const studioCmd = useStudioStore.getState().commandQueue.find(c => c.id === studioCommandId);
      if (studioCmd) return { command: studioCmd, studioCommandId };
    }
    return { command: payload, studioCommandId: undefined };
  };

  const processCommand = async (osCommand: OSCommand) => {
    if (osCommand.status === 'cancelled' || !user) { currentlyProcessing.current = null; return; }
    const payload = (osCommand.payload ?? {}) as Record<string, unknown>;
    if (!(await isCurrentContext(payload))) {
      updateOSStatus(osCommand.id, 'cancelled', undefined, 'Comando descartado: contexto do projeto mudou antes da execução.');
      currentlyProcessing.current = null;
      return;
    }
    const { command, studioCommandId } = resolveRenderCommand(osCommand);
    const storeCommandId = studioCommandId ?? osCommand.id;
    const fail = (message: string) => { failCommand(storeCommandId, message); updateOSStatus(osCommand.id, 'failed', undefined, message); };
    if (!command.prompt) { fail('Comando inválido: falta o prompt de geração.'); return; }
    currentlyProcessing.current = osCommand.id;
    startProcessing(storeCommandId);
    updateOSStatus(osCommand.id, 'processing');
    try {
      const result = await studioService.generateVisual(command.prompt, command.images, command.style, command.decor, osCommand.id);
      if (!result) throw new Error('O serviço de IA não retornou uma imagem válida.');
      completeCommand(storeCommandId, result);
      updateOSStatus(osCommand.id, 'completed', { resultUrl: result });
      await saveToGallery(result, command.prompt);
    } catch (error: unknown) {
      console.error('StudioWorker Error:', error);
      fail(error instanceof Error ? error.message : 'Erro desconhecido na geração.');
    } finally { currentlyProcessing.current = null; }
  };

  return null;
};
