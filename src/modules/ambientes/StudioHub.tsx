import React from 'react';
import IaraModule from '@/modules/iara';
import type { ProjectData } from '@/modules/projetos/types';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  budgetProject: ProjectData;
}

/** IARA is the work surface; the surrounding frame stays quiet so conversation remains primary. */
export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject } = props;
  const projectId: string | null = budgetProject?.id ?? null;
  const syncProject = { width: budgetProject?.width, height: budgetProject?.height, depth: budgetProject?.depth };

  const handleIaraProjectChange = (project: { width: number; height: number; depth: number }) => {
    props.setBudgetProject(prev => {
      if (prev?.width === project.width && prev?.height === project.height && prev?.depth === project.depth) return prev;
      return { ...prev, width: project.width, height: project.height, depth: project.depth };
    });
  };

  return (
    <section className="relative min-h-[calc(100vh-9rem)] w-full rounded-2xl bg-slate-100/70 p-1 sm:p-2 md:p-3" aria-label="IARA — trabalho no projeto atual">
      <div className="h-full min-h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <IaraModule embedded projectId={projectId} syncProject={syncProject} onProjectChange={handleIaraProjectChange} />
      </div>
    </section>
  );
};

export default StudioHub;
