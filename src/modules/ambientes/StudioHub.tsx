import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import IaraModule from '@/modules/iara';
import type { ProjectData } from '@/modules/projetos/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { emptyIaraContext, loadIaraContext, persistIaraContext, type IaraContext } from '@/modules/iara/services/iaraContext';

interface StudioHubProps { setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>; navigateTo: (id: string) => void; gallery: string[]; setGallery: React.Dispatch<React.SetStateAction<string[]>>; budgetProject: ProjectData; projectId?: string | null; }
type EnvironmentOption = { id: string; name: string; position: number };
type VersionOption = { id: string; version_number: number; environment_id: string };

export const StudioHub = (props: StudioHubProps) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const projectId = props.projectId ?? searchParams.get('projeto') ?? props.budgetProject?.id ?? null;
  const [context, setContext] = useState<IaraContext>({ ...emptyIaraContext, projectId });
  const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!user || !projectId) { setContext({ ...emptyIaraContext, projectId }); setEnvironments([]); setVersions([]); return; }
    void Promise.all([loadIaraContext(user.id, projectId), supabase.from('project_environments').select('id,name,position').eq('project_id', projectId).order('position', { ascending: true })]).then(async ([loaded, envResult]) => {
      if (cancelled) return;
      const next = { ...loaded, projectId };
      setContext(next);
      setEnvironments((envResult.data ?? []) as EnvironmentOption[]);
      if (loaded.projectName && props.budgetProject.id !== projectId) {
        const { data: project } = await supabase.from('projects').select('id,width,height,depth,modules,drawers,doors,internal_material,external_material,back_material,handle_type,profit_margin,labor_rate').eq('user_id', user.id).eq('id', projectId).maybeSingle();
        if (!cancelled && project) props.setBudgetProject({ id: project.id, width: Number(project.width ?? 0), height: Number(project.height ?? 0), depth: Number(project.depth ?? 0), modules: Number(project.modules ?? 0), drawers: Number(project.drawers ?? 0), doors: Number(project.doors ?? 0), internalMaterial: project.internal_material ?? '', externalMaterial: project.external_material ?? '', backMaterial: project.back_material ?? '', handleType: project.handle_type ?? '', profitMargin: Number(project.profit_margin ?? 0), laborRate: Number(project.labor_rate ?? 0) });
      }
    });
    return () => { cancelled = true; };
  }, [user?.id, projectId]);

  useEffect(() => {
    let cancelled = false;
    if (!user || !projectId || !context.environmentId) { setVersions([]); return; }
    supabase.from('project_versions').select('id,version_number,environment_id').eq('user_id', user.id).eq('project_id', projectId).eq('environment_id', context.environmentId).order('version_number', { ascending: false }).then(({ data }) => { if (!cancelled) setVersions((data ?? []) as VersionOption[]); });
    return () => { cancelled = true; };
  }, [user?.id, projectId, context.environmentId]);

  const selectEnvironment = async (environmentId: string) => { if (!user || !projectId) return; const environment = environments.find(item => item.id === environmentId); if (!environment) return; const next = { ...context, projectId, environmentId, environmentName: environment.name, versionId: null, versionNumber: null }; setContext(next); await persistIaraContext(user.id, next); };
  const selectVersion = async (versionId: string) => { if (!user || !projectId) return; const version = versions.find(item => item.id === versionId); if (!version) return; const next = { ...context, projectId, versionId, versionNumber: version.version_number }; setContext(next); await persistIaraContext(user.id, next); };
  const syncProject = { width: props.budgetProject?.width, height: props.budgetProject?.height, depth: props.budgetProject?.depth };
  const handleIaraProjectChange = (project: { width: number; height: number; depth: number }) => props.setBudgetProject((prev) => prev?.width === project.width && prev?.height === project.height && prev?.depth === project.depth ? prev : { ...prev, width: project.width, height: project.height, depth: project.depth });

  return <section className="relative h-full min-h-[calc(100vh-9rem)]" aria-label="IARA — trabalho no contexto atual"><IaraModule embedded projectId={projectId} syncProject={syncProject} onProjectChange={handleIaraProjectChange} activeContext={context} environments={environments} versions={versions} onEnvironmentChange={selectEnvironment} onVersionChange={selectVersion} /></section>;
};
export default StudioHub;
