import React, { useState } from 'react';
import { MessageSquare, X, PanelRightOpen } from 'lucide-react';
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
  const [iaraOpen, setIaraOpen] = useState(true);
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
      {/* Toolbar do Estúdio */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Estúdio + IARA — projeto sincronizado
          <span className="ml-2 text-indigo-600">
            {budgetProject?.width}×{budgetProject?.height}×{budgetProject?.depth}m
          </span>
        </div>
        <button
          onClick={() => setIaraOpen(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
            iaraOpen
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          aria-pressed={iaraOpen}
          aria-label="Alternar painel IARA"
        >
          {iaraOpen ? <X size={14} /> : <PanelRightOpen size={14} />}
          <MessageSquare size={14} />
          IARA
        </button>
      </div>

      {/* Grid: Estúdio + painel IARA embutido */}
      <div className={`grid gap-4 ${iaraOpen ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          <Studio {...studioProps} />
        </div>

        {iaraOpen && (
          <aside
            className="hidden lg:block h-[calc(100vh-10rem)] sticky top-4"
            aria-label="Assistente IARA"
          >
            <IaraModule embedded syncProject={syncProject} onProjectChange={handleIaraProjectChange} />
          </aside>
        )}
      </div>

      {/* Drawer mobile/tablet */}
      {iaraOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIaraOpen(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-background border-l border-border shadow-2xl animate-in slide-in-from-right"
            onClick={e => e.stopPropagation()}
          >
            <IaraModule embedded syncProject={syncProject} onProjectChange={handleIaraProjectChange} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioHub;
