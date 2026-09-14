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
  const commandQueue = useMemo(
    () => commandHistory.filter(cmd => cmd.target === 'studio' && cmd.payload?.userId === user?.id),
    [commandHistory, user?.id],
  );
  const isRendering = useStudioStore(state => state.isRendering);
  const startProcessing = useStudioStore(state => state.startProcessing);
  const completeCommand = useStudioStore(state => state.completeCommand);
  const failCommand = useStudioStore(state => state.failCommand);
  const currentlyProcessing = useRef<string | null>(null);

  useEffect(() => {
    const nextCommand = commandQueue.find(cmd => cmd.status === 'pending');
    if (nextCommand && !isRendering && currentlyProcessing.current !== nextCommand.id) void processCommand(nextCommand);
  }, [commandQueue, isRendering]);

  const readCurrentContext = async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('project_iara_contexts')
      .select('project_id,environment_id,version_id,last_correlation_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[StudioWorker] failed to read IARA context', error);
      return null;
    }
    return data as {
      project_id: string | null;
      environment_id: string | null;
      version_id: string | null;
      last_correlation_id: string | null;
    } | null;
  };

  const isCurrentContext = async (payload: Record<string, unknown>) => {
    if (!user || payload.userId !== user.id) return false;

    const hasScopedContext = [payload.projectId, payload.environmentId, payload.versionId]
      .some(value => typeof value === 'string' && value.length > 0);

    // A render requested without a project/environment/version is a valid
    // text-only render. It must not depend on project persistence existing.
    if (!hasScopedContext) return true;

    const current = await readCurrentContext();
    if (!current) return false;

    const sameScope = (payload.projectId ?? null) === current.project_id
      && (payload.environmentId ?? null) === current.environment_id
      && (payload.versionId ?? null) === current.version_id;
    if (!sameScope) return false;

    // project_iara_contexts persists the latest correlation id, but not the
    // in-memory execution generation. Correlation ids are unique per request
    // and therefore provide the durable stale-command guard here.
    return typeof payload.correlationId !== 'string'
      || payload.correlationId === current.last_correlation_id;
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
      const message = 'Comando de render descartado: o contexto persistido do projeto não corresponde à execução atual.';
      updateOSStatus(osCommand.id, 'failed', undefined, message);
      const { studioCommandId } = resolveRenderCommand(osCommand);
      if (studioCommandId) failCommand(studioCommandId, message);
      currentlyProcessing.current = null;
      return;
    }

    const { command, studioCommandId } = resolveRenderCommand(osCommand);
    const storeCommandId = studioCommandId ?? osCommand.id;
    const fail = (message: string) => {
      failCommand(storeCommandId, message);
      updateOSStatus(osCommand.id, 'failed', undefined, message);
    };
    if (!command.prompt) { fail('Comando inválido: falta o prompt de geração.'); return; }
    currentlyProcessing.current = osCommand.id;
    startProcessing(storeCommandId);
    updateOSStatus(osCommand.id, 'processing');
    try {
      const idempotencyKey = typeof payload.correlationId === 'string' ? payload.correlationId : undefined;
      const result = await studioService.generateVisual(command.prompt, command.images, command.style, command.decor, idempotencyKey);
      if (!result) throw new Error('O serviço de IA não retornou uma imagem válida.');
      if (!(await isCurrentContext(payload))) {
        fail('Resultado descartado: a identidade de execução mudou durante a geração.');
        return;
      }

      // The render is already successful at this point. Gallery persistence is
      // auxiliary and must not turn a valid generated image into a failed render.
      completeCommand(storeCommandId, result);
      updateOSStatus(osCommand.id, 'completed', { resultUrl: result });

      const { error } = await supabase.from('gallery_images').insert({
        user_id: user.id,
        image_url: result,
        prompt: command.prompt,
      });
      if (error) console.warn('[StudioWorker] gallery persistence failed after successful render', error);
    } catch (error: unknown) {
      console.error('StudioWorker Error:', error);
      fail(error instanceof Error ? error.message : 'Erro desconhecido na geração.');
    } finally { currentlyProcessing.current = null; }
  };

  return null;
};
