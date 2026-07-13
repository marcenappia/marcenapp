import React, { useState } from 'react';
import { Wand2, MessageSquare } from 'lucide-react';
import { Studio } from './index';
import IaraModule from '@/modules/iara';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<any>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
}

type TabId = 'studio' | 'iara';

export const StudioHub = (props: StudioHubProps) => {
  const [tab, setTab] = useState<TabId>('studio');

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'studio', label: 'Estúdio 3D', icon: Wand2 },
    { id: 'iara', label: 'IARA Chat', icon: MessageSquare },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Estúdio e IARA"
        className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800"
      >
        {tabs.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === 'studio' ? <Studio {...props} /> : <IaraModule />}
      </div>
    </div>
  );
};

export default StudioHub;
