import { supabase } from '@/integrations/supabase/client';
import type { ProjectData } from '@/modules/projetos/types';
import {
  buildTechnicalStructure,
  type TechnicalStructure,
} from './projectTechnicalModel';

type PersistedVersion = {
  id: string;
  version_number: number;
  status: string;
  snapshot: Record<string, unknown> | null;
};

export async function persistProjectTechnicalStructure(args: {
  project: ProjectData;
  userId: string;
  environmentId?: string | null;
}): Promise<{ versionId: string; versionNumber: number; structure: TechnicalStructure }> {
  if (!args.project.id) throw new Error('Projeto sem id não pode ter estrutura técnica persistida.');

  const structure = buildTechnicalStructure(args.project);
  const { data: existing, error: readError } = await supabase
    .from('project_versions')
    .select('id,version_number,status,snapshot')
    .eq('user_id', args.userId)
    .eq('project_id', args.project.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;

  const snapshot = {
    ...((existing?.snapshot && typeof existing.snapshot === 'object') ? existing.snapshot : {}),
    technicalStructure: structure,
    technicalStructureUpdatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('project_versions')
      .update({
        snapshot,
        ...(args.environmentId ? { environment_id: args.environmentId } : {}),
      })
      .eq('id', existing.id)
      .eq('user_id', args.userId);
    if (error) throw error;
    return { versionId: existing.id, versionNumber: existing.version_number, structure };
  }

  const { data: created, error: createError } = await supabase
    .from('project_versions')
    .insert({
      project_id: args.project.id,
      user_id: args.userId,
      version_number: 1,
      status: 'draft',
      snapshot,
      environment_id: args.environmentId ?? null,
    })
    .select('id,version_number,status,snapshot')
    .single();

  if (createError) throw createError;
  const version = created as PersistedVersion;
  return { versionId: version.id, versionNumber: version.version_number, structure };
}
