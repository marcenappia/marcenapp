import React, { useEffect, useState } from 'react';
import { FolderOpen, MessageCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import IaraModule from '@/modules/iara';
import type { ProjectData } from '@/modules/projetos/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { emptyIaraContext, loadIaraContext, persistIaraContext, type IaraContext } from '@/modules/iara/services/iaraContext';

interface StudioHubProps { setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>; navigateTo: (id: string, params?: Record<string, string>) => void; gallery: string[]; setGallery: React.Dispatch<React.SetStateAction<string[]>>; budgetProject: ProjectData; projectId?: string | null; }
type EnvironmentOption = { id: string; name: string; position: number };
type VersionOption = { id: string; version_number: number; environment_id: string };
type ProjectOption = { id: string; nome: string };

/** IARA is the work surface; the surrounding frame stays quiet so conversation remains primary. */
export const StudioHub = (props: StudioHubProps) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const projectId = props.projectId ?? searchParams.get('projeto') ?? props.budgetProject?.id ?? null;
  const [context, setContext] = useState<IaraContext>({ ...emptyIaraContext, projectId });
  const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    if (!user || projectId) { setProjects([]); setProjectsLoading(false); return; }
    setProjectsLoading(true);
    supabase.from('projects').select('id,nome,name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20).then(({ data }) => {
      if (cancelled) return;
      setProjects((data ?? []).map((item: { id: string; nome?: string | null; name?: string | null }) => ({ id: item.id, nome: item.nome || item.name || 'Obra sem nome' })));
      setProjectsLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id, projectId]);

  const openProject = (id: string) => {
    props.navigateTo('studio', { projeto: id });
  };

  const selectEnvironment = async (environmentId: string) => { if (!user || !projectId) return; const environment = environments.find(item => item.id === environmentId); if (!environment) return; const next = { ...context, projectId, environmentId, environmentName: environment.name, versionId: null, versionNumber: null }; setContext(next); await persistIaraContext(user.id, next); };
  const selectVersion = async (versionId: string) => { if (!user || !projectId) return; const version = versions.find(item => item.id === versionId); if (!version) return; const next = { ...context, projectId, versionId, versionNumber: version.version_number }; setContext(next); await persistIaraContext(user.id, next); };
  const syncProject = { width: props.budgetProject?.width, height: props.budgetProject?.height, depth: props.budgetProject?.depth };
  const handleIaraProjectChange = (project: { width: number; height: number; depth: number }) => props.setBudgetProject((prev) => prev?.width === project.width && prev?.height === project.height && prev?.depth === project.depth ? prev : { ...prev, width: project.width, height: project.height, depth: project.depth });

  return (
    <section className="relative h-full min-h-[calc(100vh-9rem)]" aria-label="IARA — trabalho no contexto atual">
      {!projectId && <div className="mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4" role="region" aria-label="Selecionar obra para a IARA">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 border border-indigo-100"><MessageCircle size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">Conversa livre com a IARA</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Você pode começar falando normalmente ou abrir uma obra para manter a conversa vinculada ao projeto certo.</p>
            {projectsLoading ? <div className="mt-3 text-xs font-semibold text-slate-500">Carregando suas obras…</div> : projects.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{projects.map(project => <button key={project.id} type="button" onClick={() => openProject(project.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><FolderOpen size={14} /> {project.nome}</button>)}</div> : <p className="mt-3 text-xs font-semibold text-slate-500">Nenhuma obra encontrada. Você pode pedir à IARA para criar o projeto.</p>}
          </div>
        </div>
      </div>}
      <IaraModule embedded projectId={projectId} syncProject={syncProject} onProjectChange={handleIaraProjectChange} activeContext={context} environments={environments} versions={versions} onEnvironmentChange={selectEnvironment} onVersionChange={selectVersion} />
    </section>
  );
};

export default StudioHub;
