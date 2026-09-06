import React from 'react';
import { Check } from 'lucide-react';
import { ETAPAS_OBRA, EtapaId, percentualObra } from '../types';

interface Props {
  etapa: EtapaId;
  compacto?: boolean;
}

/** Barra de progresso da obra em linguagem simples. */
export const ProgressoObra = ({ etapa, compacto }: Props) => {
  const pct = percentualObra(etapa);
  const atual = ETAPAS_OBRA.find((e) => e.id === etapa);
  return (
    <div aria-label={`Progresso da obra: ${pct}%`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-slate-600">
          Passo {etapa} de {ETAPAS_OBRA.length} — {atual?.label}
        </span>
        <span className="text-xs font-bold text-indigo-600">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
      {!compacto && (
        <ol className="hidden md:flex justify-between mt-3 gap-1">
          {ETAPAS_OBRA.map((e) => {
            const feito = e.id < etapa;
            const ativo = e.id === etapa;
            return (
              <li key={e.id} className="flex flex-col items-center flex-1 min-w-0" aria-current={ativo ? 'step' : undefined}>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    feito ? 'bg-emerald-500 text-white' : ativo ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {feito ? <Check size={12} /> : e.id}
                </span>
                <span className={`text-[10px] mt-1 text-center leading-tight truncate w-full ${ativo ? 'text-indigo-700 font-bold' : 'text-slate-500'}`}>
                  {e.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
