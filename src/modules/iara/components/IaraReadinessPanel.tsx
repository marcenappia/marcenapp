import React from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, ShieldCheck } from 'lucide-react';
import type { IaraMemory } from '@/core/iaraMemory';

interface IaraReadinessPanelProps {
  memory: IaraMemory;
  onResolveConflict: (conflictId: string, choice: 'confirmed' | 'new') => void;
}

export const IaraReadinessPanel = ({ memory, onResolveConflict }: IaraReadinessPanelProps) => {
  const openConflicts = memory.conflicts.filter(conflict => !conflict.resolved);
  const measurements = ['width', 'height', 'depth'].map(key => memory.facts.find(fact => fact.key === key));
  const missing = measurements.filter(fact => !fact || fact.status !== 'CONFIRMADO').length;
  const ready = openConflicts.length === 0 && missing === 0;

  return (
    <section className="mx-4 my-3 rounded-xl border border-border bg-card/80 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wide text-foreground">Prontidão técnica</p>
            <span className={`text-[9px] font-black uppercase ${ready ? 'text-emerald-600' : 'text-amber-600'}`}>
              {ready ? 'Pronto para decisões críticas' : 'Conferência pendente'}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {ready ? 'Medidas principais confirmadas e sem conflitos abertos.' : `${missing} medida(s) principal(is) ainda não confirmada(s)${openConflicts.length ? ` · ${openConflicts.length} conflito(s)` : ''}.`}
          </p>
        </div>
      </div>

      {openConflicts.length > 0 && (
        <div className="mt-3 space-y-2">
          {openConflicts.slice(0, 5).map(conflict => (
            <div key={conflict.id} className="rounded-lg border border-red-200 bg-red-50/60 p-3 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="flex gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-foreground">Conflito: {conflict.label}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Anterior confirmado: <strong>{String(conflict.confirmedValue)}</strong> · Novo valor: <strong>{String(conflict.newValue)}</strong></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => onResolveConflict(conflict.id, 'confirmed')} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide hover:bg-muted"><CheckCircle2 size={12} /> Manter anterior</button>
                    <button onClick={() => onResolveConflict(conflict.id, 'new')} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-primary-foreground hover:opacity-90"><CircleHelp size={12} /> Aceitar novo</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
