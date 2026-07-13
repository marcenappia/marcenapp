import React from 'react';
import { Studio } from './index';
import IaraModule from '@/modules/iara';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<any>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  budgetProject: any;
}

export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject, ...studioProps } = props;

  const syncProject = {
    width: budgetProject?.width,
    height: budgetProject?.height,
    depth: budgetProject?.depth,
  };

  const handleIaraProjectChange = (p: { width: number; height: number; depth: number }) => {
    props.setBudgetProject((prev: any) => {
      if (prev?.width === p.width && prev?.height === p.height && prev?.depth === p.depth) return prev;
      return { ...prev, width: p.width, height: p.height, depth: p.depth };
    });
  };

  return (
    <div className="relative">
      <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
        Estúdio + IARA — projeto sincronizado
        <span className="ml-2 text-indigo-600">
          {budgetProject?.width}×{budgetProject?.height}×{budgetProject?.depth}m
        </span>
      </div>

      <Studio
        {...studioProps}
        descriptionSlot={
          <IaraModule
            embedded
            syncProject={syncProject}
            onProjectChange={handleIaraProjectChange}
          />
        }
      />
    </div>
  );
};

export default StudioHub;
