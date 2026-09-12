import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/runtime-types';

export type IaraProjectArtifact = { type: string; id?: string };
export type IaraProjectDecision = { action: string; domain: string; agent: string; correlationId?: string; at: string };

export interface IaraProjectContext {
  projectId: string;
  summary: string | null;
  decisions: IaraProjectDecision[];
  artifacts: IaraProjectArtifact[];
  lastCorrelationId: string | null;
}

export interface IaraProjectContextSnapshot {
  summary?: string | null;
  decisions: IaraProjectDecision[];
  artifacts: IaraProjectArtifact[];
  lastCorrelationId?: string | null;
}

export function mergeIaraProjectContext(
  previous: IaraProjectContext | null,
  next: IaraProjectContextSnapshot,
): IaraProjectContextSnapshot {
  const decisions = [...(previous?.decisions ?? []), ...next.decisions].slice(-50);
  const artifactKey = (artifact: IaraProjectArtifact) => `${artifact.type}:${artifact.id ?? ''}`;
  const artifacts = [...(previous?.artifacts ?? []), ...next.artifacts]
    .filter((artifact, index, list) => list.findIndex(item => artifactKey(item) === artifactKey(artifact)) === index)
    .slice(-100);

  return {
    summary: next.summary ?? previous?.summary ?? null,
    decisions,
    artifacts,
    lastCorrelationId: next.lastCorrelationId ?? previous?.lastCorrelationId ?? null,
  };
}

export async function loadIaraProjectContext(projectId: string): Promise<IaraProjectContext | null> {
  const { data, error } = await supabase
    .from('project_iara_contexts')
    .select('project_id, summary, decisions, artifacts, last_correlation_id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    projectId: data.project_id,
    summary: data.summary,
    decisions: Array.isArray(data.decisions) ? data.decisions as unknown as IaraProjectDecision[] : [],
    artifacts: Array.isArray(data.artifacts) ? data.artifacts as unknown as IaraProjectArtifact[] : [],
    lastCorrelationId: data.last_correlation_id,
  };
}

/**
 * Persist only the delta produced by one IARA execution.
 * The database RPC merges that delta against the current row, so two concurrent
 * executions cannot overwrite each other's decisions/artifacts from stale reads.
 */
export async function saveIaraProjectContext(
  userId: string,
  projectId: string,
  snapshot: IaraProjectContextSnapshot,
): Promise<IaraProjectContext> {
  const { data, error } = await supabase.rpc('merge_iara_project_context', {
    p_user_id: userId,
    p_project_id: projectId,
    p_summary: snapshot.summary ?? null,
    p_decisions: snapshot.decisions as unknown as Json,
    p_artifacts: snapshot.artifacts as unknown as Json,
    p_last_correlation_id: snapshot.lastCorrelationId ?? null,
  });

  if (error) throw error;
  if (!data) throw new Error('A IARA não retornou o contexto persistido do projeto.');

  const row = data as unknown as {
    project_id: string;
    summary: string | null;
    decisions: Json;
    artifacts: Json;
    last_correlation_id: string | null;
  };

  return {
    projectId: row.project_id,
    summary: row.summary,
    decisions: Array.isArray(row.decisions) ? row.decisions as unknown as IaraProjectDecision[] : [],
    artifacts: Array.isArray(row.artifacts) ? row.artifacts as unknown as IaraProjectArtifact[] : [],
    lastCorrelationId: row.last_correlation_id,
  };
}
