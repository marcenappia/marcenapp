import React, { useState } from 'react';
import { Studio } from './StudioView';
import IaraModule from '@/modules/iara';
import { useDebouncedValue } from '@/hooks/useDebounce';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<any>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  budgetProject: any;
}

export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject, ...studioProps } = props;
  const [description, setDescription] = useState('');
  // Textarea responde na hora; a IARA recebe o texto com debounce (evita sync a cada tecla)
  const debouncedDescription = useDebouncedValue(description, 300);
  const projectId: string | null = budgetProject?.id ?? null;

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
    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Estúdio + IARA — projeto sincronizado
          <span className="ml-2 text-indigo-600">
            {budgetProject?.width}×{budgetProject?.height}×{budgetProject?.depth}m
          </span>
        </div>
      </div>

      {/* Descrição do Projeto — sincronizada bidirecionalmente com o chat da IARA */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <label
          htmlFor="studio-description"
          className="text-xs font-bold text-slate-400 uppercase mb-2 block"
        >
          Descrição do Projeto
          <span className="ml-2 text-[9px] text-indigo-400 normal-case tracking-normal font-normal">
            (sincronizado com IARA)
          </span>
        </label>
        <textarea
          id="studio-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Cozinha estilo industrial 3.2×2.6m com ilha central..."
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm h-24 outline-none focus:border-indigo-500 resize-none text-white placeholder:text-slate-500"
        />
      </div>

      <Studio
        {...studioProps}
        descriptionSlot={
          <IaraModule
            embedded
            projectId={projectId}
            syncProject={syncProject}
            onProjectChange={handleIaraProjectChange}
            syncDescription={debouncedDescription}
            onDescriptionChange={setDescription}
          />
        }
      />
    </div>
  );
};

export default StudioHub;
