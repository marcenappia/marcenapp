import { supabase } from '@/integrations/supabase/client';

export type IaraContext = {
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  environmentId: string | null;
  environmentName: string | null;
  versionId: string | null;
  versionNumber: number | null;
};

export const emptyIaraContext: IaraContext = {
  clientId: null,
  clientName: null,
  projectId: null,
  projectName: null,
  environmentId: null,
  environmentName: null,
  versionId: null,
  versionNumber: null,
};

export function contextIdentity(context: Pick<IaraContext, 'projectId' | 'environmentId' | 'versionId'>): string {
  return [context.projectId ?? '', context.environmentId ?? '', context.versionId ?? ''].join(':');
}

export function isIaraContextCompatible(expected: Pick<IaraContext, 'projectId' | 'environmentId' | 'versionId'>, received: Pick<IaraContext, 'projectId' | 'environmentId' | 'versionId'>): boolean {
  return expected.projectId === received.projectId && expected.environmentId === received.environmentId && expected.versionId === received.versionId;
}

export async function loadIaraContext(userId: string, projectId: string | null): Promise<IaraContext> {
  if (!projectId) return emptyIaraContext;
  const [{ data: project }, { data: environments }, { data: persisted }] = await Promise.all([
    supabase.from('projects').select('id,nome,name,cliente_id,clientes(nome)').eq('user_id', userId).eq('id', projectId).maybeSingle(),
    supabase.from('project_environments').select('id,project_id,name,position').eq('project_id', projectId).order('position', { ascending: true }),
    supabase.from('project_iara_contexts').select('id,client_id,project_id,environment_id,version_id').eq('user_id', userId).eq('project_id', projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!project) return { ...emptyIaraContext, projectId };

  const client = Array.isArray(project.clientes) ? project.clientes[0] : project.clientes;
  const environmentId = persisted?.environment_id ?? environments?.[0]?.id ?? null;
  const environment = environments?.find(item => item.id === environmentId) ?? environments?.[0] ?? null;
  let version: { id: string; version_number: number; environment_id: string } | null = null;
  if (environment?.id) {
    const { data } = await supabase.from('project_versions').select('id,version_number,environment_id').eq('user_id', userId).eq('project_id', projectId).eq('environment_id', environment.id).order('version_number', { ascending: false });
    version = (data?.find(item => item.id === persisted?.version_id) ?? data?.[0] ?? null) as typeof version;
  }

  return {
    clientId: project.cliente_id ?? persisted?.client_id ?? null,
    clientName: typeof client?.nome === 'string' ? client.nome : null,
    projectId: project.id,
    projectName: project.nome || project.name || null,
    environmentId: environment?.id ?? null,
    environmentName: environment?.name ?? null,
    versionId: version?.id ?? null,
    versionNumber: version?.version_number ?? null,
  };
}

export async function persistIaraContext(userId: string, context: IaraContext, correlationId?: string): Promise<void> {
  if (!context.projectId) return;
  const { data: existing } = await supabase.from('project_iara_contexts').select('id').eq('user_id', userId).eq('project_id', context.projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const payload = {
    user_id: userId,
    client_id: context.clientId,
    project_id: context.projectId,
    environment_id: context.environmentId,
    version_id: context.versionId,
    ...(correlationId ? { last_correlation_id: correlationId } : {}),
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    await supabase.from('project_iara_contexts').update(payload).eq('id', existing.id).eq('user_id', userId);
  } else {
    await supabase.from('project_iara_contexts').insert(payload);
  }
}
