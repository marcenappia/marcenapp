import React from 'react';
import { CheckCircle2, Circle, FileImage, Ruler, ClipboardList, Factory } from 'lucide-react';

interface StudioStatusBarProps {
  hasEnvironment: boolean;
  environmentConfirmed: boolean;
  hasResult: boolean;
  hasDocumentation: boolean;
}

const Step = ({ number, done, active, icon: Icon, label }: { number: number; done: boolean; active: boolean; icon: React.ElementType; label: string }) => (
  <div className="flex min-w-[120px] flex-1 items-center gap-2">
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : active ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
      {done ? <CheckCircle2 size={15} aria-hidden="true" /> : active ? <Icon size={14} aria-hidden="true" /> : number}
    </div>
    <div className="min-w-0">
      <p className={`truncate text-[10px] font-extrabold ${done ? 'text-emerald-700' : active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</p>
      <p className="text-[8px] font-medium text-slate-400">{done ? 'Concluído' : active ? 'Próxima etapa' : 'Pendente'}</p>
    </div>
  </div>
);

export const StudioStatusBar = ({ hasEnvironment, environmentConfirmed, hasResult, hasDocumentation }: StudioStatusBarProps) => (
  <section aria-label="Progresso do projeto" className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="mb-2 flex items-center justify-between gap-2">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-indigo-600">Progresso</p>
        <p className="text-[10px] text-slate-500">Siga as etapas até liberar orçamento e produção.</p>
      </div>
      <span className="rounded-full bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
        {[hasEnvironment, environmentConfirmed, hasResult, hasDocumentation].filter(Boolean).length}/4
      </span>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Step number={1} done={hasEnvironment} active={!hasEnvironment} icon={FileImage} label="Ambiente" />
      <Step number={2} done={environmentConfirmed} active={hasEnvironment && !environmentConfirmed} icon={Ruler} label="Medidas" />
      <Step number={3} done={hasResult} active={environmentConfirmed && !hasResult} icon={FileImage} label="Projeto visual" />
      <Step number={4} done={hasDocumentation} active={hasResult && !hasDocumentation} icon={ClipboardList} label="Documentação" />
      <Step number={5} done={false} active={hasDocumentation} icon={Factory} label="Orçamento e produção" />
    </div>
  </section>
);
