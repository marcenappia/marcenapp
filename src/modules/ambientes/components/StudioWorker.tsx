import { useEffect, useMemo, useRef } from 'react';
import { useStudioStore, type RenderCommand } from '@/store/useStudioStore';
import { OSCommand, useMarcenappOS } from '@/store/useMarcenappOS';
import { studioService } from '../services/studioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isIaraCommandExecutionCurrent } from '@/modules/iara/hooks/iaraExecutionScope';

export const StudioWorker = () => {
  const { user } = useAuth();
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const updateOSStatus = useMarcenappOS(state => state.updateCommandStatus);
  const commandQueue = useMemo(() => commandHistory.filter(cmd => cmd.target === 'studio' && cmd.payload?.userId === user?.id), [commandHistory, user?.id]);
  const isRendering = useStudioStore(state => state.isRendering);
  const startProcessing = useStudioStore(state => state.startProcessing);
  const completeCommand = useStudioStore(state => state.completeCommand);
  const failCommand = useStudioStore(state => state.failCommand);
  const cancelCommand = useStudioStore(state => state.cancelCommand);
  const currentlyProcessing = useRef<string | null>(null);

  useEffect(() => {
    const nextCommand = commandQueue.find(cmd => cmd.status === 'pending');
    if (nextCommand && !isRendering && currentlyProcessing.current !== nextCommand.id) void processCommand(nextCommand);
  }, [commandQueue, isRendering]);

  const readCurrentContext = async () => {
    if (!user) return null;
    const { data } = await supabase.from('project_iara_contexts')
      .select('project_id,environment_id,version_id,last_correlation_id,last_execution_generation')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as {
      project_id: string | null;
      environment_id: string | null;
      version_id: string | null;
      last_correlation_id: string | null;
      last_execution_generation: number | null;
    } | null;
  };

  const isCurrentContext = async (payload: Record<string, unknown>) => {
    if (!user || payload.userId !== user.id) return false;
    const current = await readCurrentContext();
    if (typeof payload.correlationId === 'string' || typeof payload.generation === 'number') {
      return isIaraCommandExecutionCurrent({ payload }, {
        userId: user.id,
        projectId: current?.project_id ?? null,
        environmentId: current?.environment_id ?? null,
        versionId: current?.version_id ?? null,
        correlationId: current?.last_correlation_id ?? null,
        generation: current?.last_execution_generation ?? null,
      });
    }
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
    if (currentlyProcessing.current && currentlyProcessing.current !== osCommand.id) return;
    currentlyProcessing.current = osCommand.id;
    const payload = (osCommand.payload ?? {}) as Record<string, unknown>;
    if (!(await isCurrentContext(payload))) {
      cancelCommand((payload.studioCommandId as string | undefined) ?? osCommand.id);
      updateOSStatus(osCommand.id, 'cancelled', undefined, 'Comando descartado: identidade de execução não é mais válida.');
      currentlyProcessing.current = null;
      return;
    }
    const { command, studioCommandId } = resolveRenderCommand(osCommand);
    const storeCommandId = studioCommandId ?? osCommand.id;
    const fail = (message: string) => { failCommand(storeCommandId, message); updateOSStatus(osCommand.id, 'failed', undefined, message); };
    if (!command.prompt) { fail('Comando inválido: falta o prompt de geração.'); currentlyProcessing.current = null; return; }
    startProcessing(storeCommandId);
    updateOSStatus(osCommand.id, 'processing');
    try {
      const result = await studioService.generateVisual(command.prompt, command.images, command.style, command.decor, command.idempotencyKey);
      if (!result) throw new Error('O serviço de IA não retornou uma imagem válida.');
      if (!(await isCurrentContext(payload))) {
        cancelCommand(storeCommandId);
        updateOSStatus(osCommand.id, 'cancelled', undefined, 'Resultado descartado: a identidade de execução mudou durante a geração.');
        return;
      }
      completeCommand(storeCommandId, result);
      updateOSStatus(osCommand.id, 'completed', { resultUrl: result });
      const context = await readCurrentContext();
      const { error } = await supabase.from('gallery_images').insert({
        user_id: user.id,
        image_url: result,
        prompt: command.prompt,
        project_id: typeof payload.projectId === 'string' ? payload.projectId : context?.project_id ?? null,
        environment_id: typeof payload.environmentId === 'string' ? payload.environmentId : context?.environment_id ?? null,
        version_id: typeof payload.versionId === 'string' ? payload.versionId : context?.version_id ?? null,
        correlation_id: typeof payload.correlationId === 'string' ? payload.correlationId : null,
        execution_generation: typeof payload.generation === 'number' ? payload.generation : null,
      });
      if (error) console.error('Falha ao salvar o render na galeria após conclusão:', error);
    } catch (error: unknown) {
      console.error('StudioWorker Error:', error);
      fail(error instanceof Error ? error.message : 'Erro desconhecido na geração.');
    } finally { currentlyProcessing.current = null; }
  };

  return null;
};
