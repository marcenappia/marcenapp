import React from 'react';
import { CheckCircle2, FolderKanban, UserRound } from 'lucide-react';
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
 * Project-first work surface. Studio remains the existing IARA conversation;
 * this component only establishes the project context around it.
 */
export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject } = props;
  const projectId: string | null = budgetProject?.id ?? null;
  const projectName = budgetProject?.name?.trim() || 'Projeto atual';
  const clientName = budgetProject?.clientName?.trim();
  const environment = budgetProject?.environment?.trim();
  const status = budgetProject?.status?.trim();

  const syncProject = {
    width: budgetProject?.width,
    height: budgetProject?.height,
    depth: budgetProject?.depth,
  };

  const handleIaraProjectChange = (project: { width: number; height: number; depth: number }) => {
    props.setBudgetProject((prev) => {
      if (prev?.width === project.width && prev?.height === project.height && prev?.depth === project.depth) return prev;
      return { ...prev, width: project.width, height: project.height, depth: project.depth };
    });
  };

  return (
    <section className="relative h-full min-h-[calc(100vh-8rem)]" aria-label="Projeto e IARA">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <FolderKanban size={14} aria-hidden="true" />
            Projeto
          </div>
          <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
            {projectName}
          </h1>
          <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {clientName && <span className="inline-flex items-center gap-1.5"><UserRound size={13} aria-hidden="true" />{clientName}</span>}
            {environment && <span>{environment}</span>}
            {status && <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} aria-hidden="true" />{status}</span>}
          </div>
        </div>
        <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          IARA conectada ao projeto
        </div>
      </div>

      <IaraModule
        embedded
        projectId={projectId}
        syncProject={syncProject}
        onProjectChange={handleIaraProjectChange}
        projectName={projectName}
        clientName={clientName}
        environment={environment}
        status={status}
      />
    </section>
  );
};

export default StudioHub;
