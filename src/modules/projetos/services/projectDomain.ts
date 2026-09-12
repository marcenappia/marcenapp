import { supabase } from '@/integrations/supabase/client';

export interface ProjectEnvironment {
  id: string;
  project_id: string;
  name: string;
  slug: string | null;
  type: string | null;
  position: number;
  metadata: Record<string, unknown>;
}

export async function listProjectEnvironments(projectId: string): Promise<ProjectEnvironment[]> {
  const { data, error } = await supabase
    .from('project_environments')
    .select('id,project_id,name,slug,type,position,metadata')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ProjectEnvironment[];
}

export async function createProjectEnvironment(input: {
  projectId: string;
  name: string;
  slug?: string | null;
  type?: string | null;
  position?: number;
}): Promise<ProjectEnvironment> {
  const { data, error } = await supabase
    .from('project_environments')
    .insert({ project_id: input.projectId, name: input.name.trim(), slug: input.slug ?? null, type: input.type ?? null, position: input.position ?? 0 })
    .select('id,project_id,name,slug,type,position,metadata')
    .single();
  if (error) throw error;
  return data as unknown as ProjectEnvironment;
}

export async function renameProjectEnvironment(environmentId: string, name: string): Promise<void> {
  const { error } = await supabase.from('project_environments').update({ name: name.trim() }).eq('id', environmentId);
  if (error) throw error;
}

export async function confirmPlanEnvironmentSuggestion(suggestionId: string, name?: string): Promise<ProjectEnvironment> {
  const { data: suggestion, error: suggestionError } = await supabase
    .from('project_plan_environment_suggestions')
    .select('id,project_id,name,type,position,status')
    .eq('id', suggestionId)
    .single();
  if (suggestionError) throw suggestionError;
  if (suggestion.status === 'rejected') throw new Error('Esta sugestão de ambiente foi rejeitada.');

  const environment = await createProjectEnvironment({
    projectId: suggestion.project_id,
    name: name?.trim() || suggestion.name,
    type: suggestion.type,
    position: suggestion.position,
  });

  const { error: updateError } = await supabase
    .from('project_plan_environment_suggestions')
    .update({ status: name && name.trim() !== suggestion.name ? 'renamed' : 'confirmed', confirmed_environment_id: environment.id })
    .eq('id', suggestionId);
  if (updateError) throw updateError;
  return environment;
}

export async function rejectPlanEnvironmentSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from('project_plan_environment_suggestions')
    .update({ status: 'rejected' })
    .eq('id', suggestionId);
  if (error) throw error;
}
