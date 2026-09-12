import React from 'react';
import { CheckCircle2, FolderKanban } from 'lucide-react';
import IaraModule from '@/modules/iara';
import type { ProjectData } from '@/modules/projetos/types';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  budgetProject: ProjectData;
}

/**
 * Studio remains an implementation work surface. IARA owns the primary project experience.
 * No project persistence or navigation is introduced here.
 */
export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject } = props;
  const projectId = budgetProject?.id ?? null;
  const projectName = budgetProject?.name?.trim() || (projectId ? 'Projeto em trabalho' : 'Novo projeto');
  const syncProject = { width: budgetProject?.width, height: budgetProject?.height, depth: budgetProject?.depth };

  const handleIaraProjectChange = (project: { width: number; height: number; depth: number }) => {
    props.setBudgetProject((prev) => {
      if (prev?.width === project.width && prev?.height === project.height && prev?.depth === project.depth) return prev;
      return { ...prev, width: project.width, height: project.height, depth: project.depth };
    });
  };

  return (
    <section className="relative h-full min-h-[calc(100vh-9rem)]" aria-label="Projeto e IARA">
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col px-2 sm:px-4 lg:px-6">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border/70 py-2.5" aria-label="Contexto do projeto">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderKanban size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Projeto</span>
                {budgetProject?.status && <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground sm:inline">{budgetProject.status}</span>}
              </div>
              <p className="truncate text-sm font-semibold text-foreground">{projectName}</p>
              {(budgetProject?.clientName || budgetProject?.environmentName) && (
                <p className="truncate text-[10px] text-muted-foreground">
                  {[budgetProject.clientName, budgetProject.environmentName].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {projectId && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.04] px-2.5 py-1 text-[10px] font-medium text-primary">
              <CheckCircle2 size={12} aria-hidden="true" />
              <span className="hidden xs:inline">IARA conectada</span>
              <span className="xs:hidden">IARA</span>
            </div>
          )}
        </header>
        <div className="min-h-0 flex-1 pt-1 sm:pt-2">
          <IaraModule embedded projectId={projectId} syncProject={syncProject} onProjectChange={handleIaraProjectChange} />
        </div>
      </div>
    </section>
  );
};

export default StudioHub;
