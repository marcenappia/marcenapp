import React from 'react';
import { CheckCircle2, Circle, FileImage, Ruler, ClipboardList, Factory } from 'lucide-react';

interface StudioStatusBarProps {
  hasEnvironment: boolean;
  environmentConfirmed: boolean;
  hasResult: boolean;
  hasDocumentation: boolean;
}

const Step = ({ done, active, icon: Icon, label }: { done: boolean; active: boolean; icon: React.ElementType; label: string }) => (
  <div className="flex min-w-0 items-center gap-1.5">
    {done ? <CheckCircle2 size={14} className="shrink-0 text-emerald-600" /> : active ? <Icon size={14} className="shrink-0 text-indigo-600" /> : <Circle size={14} className="shrink-0 text-slate-300" />}
    <span className={`truncate text-[9px] font-bold ${done ? 'text-emerald-700' : active ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export const StudioStatusBar = ({ hasEnvironment, environmentConfirmed, hasResult, hasDocumentation }: StudioStatusBarProps) => (
  <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 py-2">
    <div className="flex min-w-max items-center gap-3">
      <Step done={hasEnvironment} active={!hasEnvironment} icon={FileImage} label="Ambiente" />
      <span className="text-slate-200">→</span>
      <Step done={environmentConfirmed} active={hasEnvironment && !environmentConfirmed} icon={Ruler} label="Medidas confirmadas" />
      <span className="text-slate-200">→</span>
      <Step done={hasResult} active={environmentConfirmed && !hasResult} icon={FileImage} label="Projeto visual" />
      <span className="text-slate-200">→</span>
      <Step done={hasDocumentation} active={hasResult && !hasDocumentation} icon={ClipboardList} label="Documentação 2D" />
      <span className="text-slate-200">→</span>
      <Step done={false} active={hasDocumentation} icon={Factory} label="Orçamento / produção" />
    </div>
  </div>
);
