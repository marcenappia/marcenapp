import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/runtime-types';

export type IaraProjectArtifact = { type: string; id?: string };
export type IaraProjectDecision = { action: string; domain: string; agent: string; correlationId?: string; at: string };

export interface IaraContext {
  userId: string;
  clientId: string | null;
  projectId: string | null;
  environmentId: string | null;
  versionId: string | null;
  summary: string | null;
  decisions: IaraProjectDecision[];
  artifacts: IaraProjectArtifact[];
  lastCorrelationId: string | null;
}

export interface IaraContextSnapshot {
  summary?: string | null;
  decisions: IaraProjectDecision[];
  artifacts: IaraProjectArtifact[];
  lastCorrelationId?: string | null;
}

export interface IaraProjectContext extends IaraContext {
  projectId: string;
}

export interface IaraProjectContextSnapshot extends IaraContextSnapshot {}

export interface IaraContextScope {
  userId: string;
  clientId: string | null;
  projectId: string | null;
  environmentId: string | null;
  versionId: string | null;
}

export function mergeIaraProjectContext(previous: IaraProjectContext | null, next: IaraProjectContextSnapshot): IaraProjectContextSnapshot {
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

export async function loadIaraContext(scope: IaraContextScope): Promise<IaraContext | null> {
  let query = supabase.from('project_iara_contexts')
    .select('user_id, client_id, project_id, environment_id, version_id, summary, decisions, artifacts, last_correlation_id')
    .eq('user_id', scope.userId);
  query = scope.clientId ? query.eq('client_id', scope.clientId) : query.is('client_id', null);
  query = scope.projectId ? query.eq('project_id', scope.projectId) : query.is('project_id', null);
  query = scope.environmentId ? query.eq('environment_id', scope.environmentId) : query.is('environment_id', null);
  query = scope.versionId ? query.eq('version_id', scope.versionId) : query.is('version_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    userId: data.user_id,
    clientId: data.client_id,
    projectId: data.project_id,
    environmentId: data.environment_id,
    versionId: data.version_id,
    summary: data.summary,
    decisions: Array.isArray(data.decisions) ? data.decisions as unknown as IaraProjectDecision[] : [],
    artifacts: Array.isArray(data.artifacts) ? data.artifacts as unknown as IaraProjectArtifact[] : [],
    lastCorrelationId: data.last_correlation_id,
  };
}

export async function saveIaraContext(scope: IaraContextScope, snapshot: IaraContextSnapshot): Promise<IaraContext> {
  const { data, error } = await supabase.rpc('merge_iara_context', {
    p_user_id: scope.userId,
    p_client_id: scope.clientId,
    p_project_id: scope.projectId,
    p_environment_id: scope.environmentId,
    p_version_id: scope.versionId,
    p_summary: snapshot.summary ?? null,
    p_decisions: snapshot.decisions as unknown as Json,
    p_artifacts: snapshot.artifacts as unknown as Json,
    p_last_correlation_id: snapshot.lastCorrelationId ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error('A IARA não retornou o contexto persistido.');
  const row = data as unknown as {
    user_id: string; client_id: string | null; project_id: string | null; environment_id: string | null; version_id: string | null;
    summary: string | null; decisions: Json; artifacts: Json; last_correlation_id: string | null;
  };
  return {
    userId: row.user_id,
    clientId: row.client_id,
    projectId: row.project_id,
    environmentId: row.environment_id,
    versionId: row.version_id,
    summary: row.summary,
    decisions: Array.isArray(row.decisions) ? row.decisions as unknown as IaraProjectDecision[] : [],
    artifacts: Array.isArray(row.artifacts) ? row.artifacts as unknown as IaraProjectArtifact[] : [],
    lastCorrelationId: row.last_correlation_id,
  };
}

// Compatibility wrappers: old callers remain project-scoped and resolve to the same canonical table.
export async function loadIaraProjectContext(projectId: string): Promise<IaraProjectContext | null> {
  const result = await loadIaraContext({ userId: (await supabase.auth.getUser()).data.user?.id ?? '', clientId: null, projectId, environmentId: null, versionId: null });
  return result ? { ...result, projectId: result.projectId as string } : null;
}

export async function saveIaraProjectContext(userId: string, projectId: string, snapshot: IaraProjectContextSnapshot): Promise<IaraProjectContext> {
  const result = await saveIaraContext({ userId, clientId: null, projectId, environmentId: null, versionId: null }, snapshot);
  return { ...result, projectId: result.projectId as string };
}
