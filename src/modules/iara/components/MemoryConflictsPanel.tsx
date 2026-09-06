import React from 'react';
import { AlertTriangle, Check, Shield } from 'lucide-react';
import type { IaraMemory } from '@/core/iaraMemory';

interface Props {
  memory: IaraMemory;
  onResolve: (conflictId: string, choice: 'confirmed' | 'new') => Promise<void>;
}

export const MemoryConflictsPanel = ({ memory, onResolve }: Props) => {
  const conflicts = memory.conflicts.filter(conflict => !conflict.resolved).slice(0, 5);
  if (!conflicts.length) return null;

  return (
    <div className="mx-4 mb-3 rounded-2xl border border-red-200 bg-red-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-red-800">Conferência pendente</p>
          <p className="mt-1 text-[11px] text-red-700">A IARA encontrou informação confirmada diferente. Escolha qual valor deve permanecer antes de uma decisão crítica.</p>
          <div className="mt-3 space-y-2">
            {conflicts.map(conflict => (
              <div key={conflict.id} className="rounded-xl border border-red-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Shield size={13} className="text-red-500" />{conflict.label}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <button onClick={() => onResolve(conflict.id, 'confirmed')} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-left hover:bg-slate-100"><span className="block text-[9px] font-bold uppercase text-slate-500">Valor anterior confirmado</span><strong>{String(conflict.confirmedValue)}</strong></button>
                  <button onClick={() => onResolve(conflict.id, 'new')} className="rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-left hover:bg-indigo-100"><span className="block text-[9px] font-bold uppercase text-indigo-600">Novo valor</span><strong>{String(conflict.newValue)}</strong></button>
                </div>
                <p className="mt-2 flex items-center gap-1 text-[9px] text-slate-500"><Check size={11} /> A escolha fica registrada como confirmação do usuário.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
