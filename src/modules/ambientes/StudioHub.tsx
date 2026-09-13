import React, { createPortal, useEffect } from 'react';
import { CheckCircle2, FolderKanban } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import IaraModule from '@/modules/iara';
import type { ProjectData } from '@/modules/projetos/types';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  budgetProject: ProjectData;
}

export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject } = props;
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedProjectId = searchParams.get('projeto');
  const projectId = requestedProjectId || budgetProject?.id || null;

  useEffect(() => {
    if (!user || !requestedProjectId || requestedProjectId === budgetProject?.id) return;
    let cancelled = false;
    const loadRequestedProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, nome, name, status, width, height, depth, modules, drawers, doors, internal_material, external_material, back_material, handle_type, profit_margin, labor_rate, clientes(nome)')
        .eq('id', requestedProjectId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || error || !data) {
        if (error) console.error('[studio-workspace] requested project load failed', error);
        return;
      }
      const client = Array.isArray(data.clientes) ? data.clientes[0] : data.clientes;
      props.setBudgetProject({
        id: data.id,
        name: data.nome || data.name || 'Projeto em trabalho',
        clientName: client?.nome ?? null,
        status: data.status ?? null,
        width: Number(data.width ?? 0),
        height: Number(data.height ?? 0),
        depth: Number(data.depth ?? 0),
        modules: Number(data.modules ?? 0),
        drawers: Number(data.drawers ?? 0),
        doors: Number(data.doors ?? 0),
        internalMaterial: data.internal_material ?? '',
        externalMaterial: data.external_material ?? '',
        backMaterial: data.back_material ?? '',
        handleType: data.handle_type ?? '',
        profitMargin: Number(data.profit_margin ?? 0),
        laborRate: Number(data.labor_rate ?? 0),
      });
    };
    void loadRequestedProject();
    return () => { cancelled = true; };
  }, [user, requestedProjectId, budgetProject?.id, props.setBudgetProject]);

  const projectName = budgetProject?.name?.trim() || (projectId ? 'Projeto em trabalho' : 'Novo projeto');
  const syncProject = { width: budgetProject?.width, height: budgetProject?.height, depth: budgetProject?.depth };
  const handleIaraProjectChange = (project: { width: number; height: number; depth: number }) => {
    props.setBudgetProject(prev => {
      if (prev?.width === project.width && prev?.height === project.height && prev?.depth === project.depth) return prev;
      return { ...prev, width: project.width, height: project.height, depth: project.depth };
    });
  };

  return createPortal(
    <section className="fixed inset-0 z-[9999] flex min-h-0 w-full bg-background" aria-label="Projeto e IARA">
      <div className="flex h-full min-h-0 w-full flex-col">
        <header className="flex min-h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8" aria-label="Contexto do projeto">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FolderKanban size={17} aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Projeto</p>
              <p className="truncate text-base font-semibold text-foreground sm:text-lg">{projectName}</p>
              {(budgetProject?.clientName || budgetProject?.environmentName) && <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{[budgetProject.clientName, budgetProject.environmentName].filter(Boolean).join(' · ')}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold text-primary sm:text-xs"><CheckCircle2 size={13} aria-hidden="true" /><span>IARA conectada</span></div>
        </header>
        <div className="min-h-0 flex-1 px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
          <IaraModule embedded projectId={projectId} syncProject={syncProject} onProjectChange={handleIaraProjectChange} />
        </div>
      </div>
    </section>,
    document.body
  );
};

export default StudioHub;
