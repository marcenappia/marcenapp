import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStudioStore, type RenderCommand } from '@/store/useStudioStore';
import { OSCommand, useMarcenappOS } from '@/store/useMarcenappOS';
import { studioService } from '../services/studioService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isIaraCommandExecutionCurrent } from '@/modules/iara/hooks/iaraExecutionScope';

export const StudioWorker = () => {
  const { user } = useAuth();

  // The worker is an application-level execution worker, not a Studio-screen worker.
  // IARA can enqueue a render while the user remains in the conversation, so render
  // execution must not depend on the Studio route being active.
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const updateOSStatus = useMarcenappOS(state => state.updateCommandStatus);
  const commandQueue = useMemo(
    () => commandHistory.filter(cmd => cmd.target === 'studio' && cmd.payload?.userId === user?.id),
    [commandHistory, user?.id]
  );
  const isRendering = useStudioStore(state => state.isRendering);
  const startProcessing = useStudioStore(state => state.startProcessing);
  const completeCommand = useStudioStore(state => state.completeCommand);
  const failCommand = useStudioStore(state => state.failCommand);
  const cancelCommand = useStudioStore(state => state.cancelCommand);
  const currentlyProcessing = useRef<string | null>(null);

  const readCurrentContext = useCallback(async (payload?: Record<string, unknown>) => {
    if (!user) return null;

    // A user can have several projects. Never compare a command carrying an
    // explicit project identity against whichever project was edited most
    // recently; that can cancel a valid render before the image service runs.
    const payloadProjectId = typeof payload?.projectId === 'string' ? payload.projectId : null;
    const payloadEnvironmentId = typeof payload?.environmentId === 'string' ? payload.environmentId : null;
    const payloadVersionId = typeof payload?.versionId === 'string' ? payload.versionId : null;

    let query = supabase.from('project_iara_contexts')
      .select('project_id,environment_id,version_id,last_correlation_id,last_execution_generation')
      .eq('user_id', user.id);

    if (payloadProjectId) query = query.eq('project_id', payloadProjectId);
    if (payloadEnvironmentId) query = query.eq('environment_id', payloadEnvironmentId);
    if (payloadVersionId) query = query.eq('version_id', payloadVersionId);

    const { data } = await query
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
  }, [user]);

  const isCurrentContext = useCallback(async (payload: Record<string, unknown>) => {
    if (!user || payload.userId !== user.id) return false;
    const payloadProjectId = (payload.projectId as string | null | undefined) ?? null;
    const payloadEnvironmentId = (payload.environmentId as string | null | undefined) ?? null;
    const payloadVersionId = (payload.versionId as string | null | undefined) ?? null;
    // A render explicitly created without project/environment/version context is
    // intentionally global. Do not compare it against the user's last persisted
    // project context, otherwise a text-only render is incorrectly cancelled.
    if (!payloadProjectId && !payloadEnvironmentId && !payloadVersionId) return true;
    const current = await readCurrentContext(payload);
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
    return payloadProjectId === (current?.project_id ?? null)
      && payloadEnvironmentId === (current?.environment_id ?? null)
      && payloadVersionId === (current?.version_id ?? null);
  }, [user, readCurrentContext]);

  const resolveRenderCommand = useCallback((osCommand: OSCommand) => {
    const payload = (osCommand.payload ?? {}) as Partial<RenderCommand> & { studioCommandId?: string; userId?: string };
    const studioCommandId = payload.studioCommandId;
    if (studioCommandId) {
      const studioCmd = useStudioStore.getState().commandQueue.find(c => c.id === studioCommandId);
      if (studioCmd) return { command: studioCmd, studioCommandId };
    }
    return { command: payload, studioCommandId: undefined };
  }, []);

  const processCommand = useCallback(async (osCommand: OSCommand) => {
    if (osCommand.status === 'cancelled' || !user) { currentlyProcessing.current = null; return; }
    if (currentlyProcessing.current && currentlyProcessing.current !== osCommand.id) return;
    currentlyProcessing.current = osCommand.id;
    console.info('[IARA_START]', JSON.stringify({ status: 'started', commandId: osCommand.id }));
    const payload = (osCommand.payload ?? {}) as Record<string, unknown>;
    const { command, studioCommandId } = resolveRenderCommand(osCommand);
    const storeCommandId = studioCommandId ?? osCommand.id;
    if (!(await isCurrentContext(payload))) {
      cancelCommand(storeCommandId);
      updateOSStatus(osCommand.id, 'cancelled', undefined, 'Comando descartado: identidade de execução não é mais válida.');
      currentlyProcessing.current = null;
      return;
    }
    const fail = (message: string) => { failCommand(storeCommandId, message); updateOSStatus(osCommand.id, 'failed', undefined, message); };
    if (!command.prompt) { fail('Comando inválido: falta o prompt de geração.'); currentlyProcessing.current = null; return; }
    if (osCommand.source === 'iara' && (!Array.isArray(command.images) || command.images.length === 0)) {
      fail('Render da IARA bloqueado: falta uma referência visual incorporada. A geração somente por texto está desativada.');
      currentlyProcessing.current = null;
      return;
    }
    startProcessing(storeCommandId);
    updateOSStatus(osCommand.id, 'processing');
    console.info('[GENERAR_RENDER]', JSON.stringify({ status: 'processing', commandId: osCommand.id, studioCommandId: storeCommandId, referenceCount: Array.isArray(command.images) ? command.images.length : 0 }));
    try {
      const result = await studioService.generateVisual(
        command.prompt,
        command.images,
        command.style,
        command.decor,
        command.idempotencyKey,
        osCommand.source === 'iara'
          ? {
              projectId: typeof payload.projectId === 'string' ? payload.projectId : null,
              environmentId: typeof payload.environmentId === 'string' ? payload.environmentId : null,
              versionId: typeof payload.versionId === 'string' ? payload.versionId : null,
              correlationId: typeof payload.correlationId === 'string' ? payload.correlationId : null,
              generation: typeof payload.generation === 'number' ? payload.generation : null,
            }
          : undefined,
      );
      if (!result) throw new Error('O serviço de IA não retornou uma imagem válida.');
      if (osCommand.source !== 'iara' && !(await isCurrentContext(payload))) {
        cancelCommand(storeCommandId);
        updateOSStatus(osCommand.id, 'cancelled', undefined, 'Resultado descartado: a identidade de execução mudou durante a geração.');
        return;
      }
      completeCommand(storeCommandId, result);
      updateOSStatus(osCommand.id, 'completed', { resultUrl: result });
      console.info('[IMAGE_RENDERED]', JSON.stringify({ status: 'success', commandId: osCommand.id, studioCommandId: storeCommandId }));

    } catch (error: unknown) {
      console.error('StudioWorker Error:', error);
      fail(error instanceof Error ? error.message : 'Erro desconhecido na geração.');
    } finally { currentlyProcessing.current = null; }
  }, [user, readCurrentContext, isCurrentContext, resolveRenderCommand, cancelCommand, updateOSStatus, failCommand, startProcessing, completeCommand]);

  useEffect(() => {
    const nextCommand = commandQueue.find(cmd => cmd.status === 'pending');
    if (nextCommand && !isRendering && currentlyProcessing.current !== nextCommand.id) void processCommand(nextCommand);
  }, [commandQueue, isRendering, processCommand]);

  return null;
};
