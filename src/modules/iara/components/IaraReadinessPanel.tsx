import React from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, ShieldCheck } from 'lucide-react';
import type { IaraMemory } from '@/core/iaraMemory';

interface IaraReadinessPanelProps {
  memory: IaraMemory;
  onResolveConflict: (conflictId: string, choice: 'confirmed' | 'new') => void;
}

const isConfirmed = (memory: IaraMemory, key: string) => memory.facts.some(fact => fact.key === key && fact.status === 'CONFIRMADO');

export const IaraReadinessPanel = ({ memory, onResolveConflict }: IaraReadinessPanelProps) => {
  const openConflicts = memory.conflicts.filter(conflict => !conflict.resolved);
  const measurements = ['width', 'height', 'depth'];
  const missingMeasurements = measurements.filter(key => !isConfirmed(memory, key)).length;
  const materials = ['material-interno', 'material-externo', 'material-fundo'];
  const missingMaterials = materials.filter(key => !isConfirmed(memory, key)).length;
  const budgetApproved = isConfirmed(memory, 'orcamento-aprovado');
  const productionReleased = isConfirmed(memory, 'producao-status');

  let nextStep = 'Conferir medidas';
  if (missingMeasurements === 0 && missingMaterials > 0) nextStep = 'Definir materiais';
  else if (missingMeasurements === 0 && missingMaterials === 0 && !budgetApproved) nextStep = 'Preparar orçamento';
  else if (budgetApproved && !productionReleased) nextStep = 'Liberar produção';
  else if (productionReleased) nextStep = 'Executar produção e corte';

  const criticalReady = openConflicts.length === 0 && missingMeasurements === 0;

  const items = [
    { label: 'Medidas principais', done: missingMeasurements === 0 },
    { label: 'Materiais', done: missingMaterials === 0 },
    { label: 'Orçamento aprovado', done: budgetApproved },
    { label: 'Produção liberada', done: productionReleased },
  ];

  return (
    <section className="mx-4 my-3 rounded-xl border border-border bg-card/80 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wide text-foreground">Prontidão da jornada</p>
            <span className={`text-[9px] font-black uppercase ${criticalReady ? 'text-emerald-600' : 'text-amber-600'}`}>
              {criticalReady ? 'Base técnica conferida' : 'Conferência pendente'}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Próxima etapa: <strong className="text-foreground">{nextStep}</strong></p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {items.map(item => (
              <div key={item.label} className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5 text-[9px] font-bold text-muted-foreground">
                {item.done ? <CheckCircle2 size={12} className="text-emerald-600" /> : <CircleHelp size={12} className="text-amber-600" />}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          {openConflicts.length > 0 && (
            <p className="mt-2 text-[9px] font-bold text-red-600">{openConflicts.length} conflito(s) precisam ser resolvidos antes de uma decisão crítica.</p>
          )}
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
