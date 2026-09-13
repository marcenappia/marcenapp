import React from 'react';
import { ArrowRight, BookOpen, Camera, FileText, Mic, Sparkles } from 'lucide-react';
import DiarioIntake from './DiarioIntake';
import DiarioFreeLayer from './DiarioFreeLayer';

interface Props { navigateTo?: (id: string, params?: Record<string, string>) => void; }

export default function Diario({ navigateTo }: Props) {
  return (
    <div className="min-h-full w-full px-2 py-3 sm:px-4 sm:py-5 md:px-6 md:py-7">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><BookOpen size={18} /></div>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Obra em campo</p><h1 className="truncate text-lg font-black tracking-tight text-slate-950 md:text-xl">Diário de Obra</h1><p className="truncate text-xs text-slate-500">Registre primeiro. Organize depois. A IARA entra quando você quiser.</p></div>
          </div>
          <button type="button" onClick={() => navigateTo?.('studio')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-black text-white hover:bg-slate-800"><Sparkles size={15} /> Levar para a IARA <ArrowRight size={14} /></button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-sm font-black text-slate-900">Registre do seu jeito</p><p className="mt-1 text-xs leading-5 text-slate-500">O Diário é gratuito e funciona como sua memória de obra. Não precisa deixar tudo organizado antes de começar.</p></div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"><span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600"><Camera size={14} /> Foto</span><span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600"><Mic size={14} /> Voz</span><span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600"><FileText size={14} /> Texto</span></div>
          </div>
        </section>

        <DiarioFreeLayer navigateTo={navigateTo} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 md:px-5"><p className="text-sm font-black text-slate-900">Caderno da obra</p><p className="mt-0.5 text-xs text-slate-500">Aqui você pode identificar cliente, obra e registrar informações com mais contexto.</p></div>
          <div className="p-2 sm:p-3 md:p-5"><DiarioIntake navigateTo={navigateTo} /></div>
        </section>
      </div>
    </div>
  );
}
