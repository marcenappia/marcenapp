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

/**
 * Studio is a work surface inside the IARA experience, not a second prompt + render workspace.
 * Keep project synchronization here while leaving conversation, actions and artifacts to IARA.
 */
export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject } = props;
  const projectId: string | null = budgetProject?.id ?? null;

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
    <section className="relative h-full min-h-[calc(100vh-9rem)]" aria-label="IARA — trabalho no projeto atual">
      <IaraModule
        embedded
        projectId={projectId}
        syncProject={syncProject}
        onProjectChange={handleIaraProjectChange}
      />
    </section>
  );
};

export default StudioHub;
