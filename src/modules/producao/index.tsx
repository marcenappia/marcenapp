import React, { useMemo } from 'react';
import { CheckCircle2, Factory, FileDown, Scissors, Boxes, Circle } from 'lucide-react';
import { Card } from '@/components/marcenaria/shared';

interface Props {
  project: any;
  parts: any[];
  navigateTo?: (id: string) => void;
}

const ProducaoModule = ({ project, parts, navigateTo }: Props) => {
  const production = project?.jornada?.production;
  const productionParts = useMemo(() => (production?.parts?.length ? production.parts : parts), [production?.parts, parts]);
  const totalUnits = useMemo(() => productionParts.reduce((sum: number, part: any) => sum + Number(part.qtd || 0), 0), [productionParts]);
  const approvedTotal = Number(production?.approvedTotal || project?.jornada?.valorAprovado || 0);
  const released = production?.status === 'liberada';

  const checklist = [
    { label: 'Orçamento aprovado', done: project?.jornada?.orcamentoAprovado === true || project?.jornada?.statusAprovacao === 'aprovado' },
    { label: 'Produção gerada', done: released },
    { label: 'Peças conferidas', done: productionParts.length > 0 },
    { label: 'Plano de corte', done: false },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
      <div className="rounded-3xl bg-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">MARCENAPP · jornada da obra</p>
            <h1 className="text-2xl md:text-3xl font-black mt-2">Produção liberada</h1>
            <p className="text-slate-300 mt-1">O orçamento virou uma ordem de produção. Agora vamos conferir as peças e preparar o corte.</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 px-5 py-4 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Obra</p>
            <p className="font-bold truncate">{project?.name || project?.jornada?.nome || 'Projeto atual'}</p>
            <p className="text-xs text-slate-400 mt-1">{productionParts.length} tipos · {totalUnits} peças</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {checklist.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${item.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
            {item.done ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Circle className="text-slate-300" size={20} />}
            <p className={`text-xs font-bold mt-2 ${item.done ? 'text-emerald-800' : 'text-slate-500'}`}>{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-slate-800 flex items-center gap-2"><Boxes size={19} className="text-indigo-600" /> Lista de produção</h2>
              <p className="text-xs text-slate-500 mt-1">Estas são as peças que saíram do orçamento aprovado.</p>
            </div>
            <span className="text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 px-3 py-1">{totalUnits} un.</span>
          </div>
          {productionParts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">Nenhuma peça foi gerada ainda.</div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {productionParts.map((part: any, index: number) => (
                <div key={`${part.id ?? part.name}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="font-bold text-sm text-slate-700 truncate">{part.name || `Peça ${index + 1}`}</p><p className="text-xs text-slate-500">{part.w} × {part.h} mm · {part.thickness || 15} mm · {part.mat === 'wood' ? 'Madeirado' : 'Branco'}</p></div>
                  <span className="shrink-0 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-sm font-black text-slate-700">{part.qtd || 1}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Valor aprovado</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{approvedTotal > 0 ? approvedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</p>
            <p className="text-xs text-slate-500 mt-1">Produção vinculada ao orçamento aprovado.</p>
          </Card>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-black text-indigo-900 flex items-center gap-2"><Factory size={17} /> Próxima etapa</p>
            <p className="text-xs text-indigo-700 mt-1">Confira o plano de corte, aproveitamento, sobras e ferragens antes de fabricar.</p>
          </div>
          <button type="button" onClick={() => navigateTo?.('corte')} className="w-full min-h-[58px] rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"><Scissors size={20} /> Abrir plano de corte</button>
          <button type="button" onClick={() => window.print()} className="w-full min-h-[50px] rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-50"><FileDown size={18} /> Imprimir ficha de produção</button>
        </div>
      </div>
    </div>
  );
};

export default ProducaoModule;
