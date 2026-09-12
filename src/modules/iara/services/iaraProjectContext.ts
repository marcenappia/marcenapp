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

export async function saveIaraProjectContext(
  userId: string,
  projectId: string,
  snapshot: IaraProjectContextSnapshot,
): Promise<void> {
  const { error } = await supabase.from('project_iara_contexts').upsert({
    user_id: userId,
    project_id: projectId,
    summary: snapshot.summary ?? null,
    decisions: snapshot.decisions as unknown as Json,
    artifacts: snapshot.artifacts as unknown as Json,
    last_correlation_id: snapshot.lastCorrelationId ?? null,
  }, { onConflict: 'project_id' });

  if (error) throw error;
}
