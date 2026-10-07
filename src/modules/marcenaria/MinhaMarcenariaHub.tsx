import React, { useState } from 'react';
import { Brain, Building2, PackageOpen } from 'lucide-react';
import MarcenariaDnaPanel from './MarcenariaDnaPanel';
import MinhaMarcenaria from './MineriaDaMarcenaria';

export default function MinhaMarcenariaHub() {
  const [tab, setTab] = useState<'operacao' | 'dna'>('operacao');
  return (
    <section className="min-w-0 space-y-5 pb-24 md:pb-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Building2 size={20}/></div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-600">Minha Marcenaria</p>
            <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Base da sua operação</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Tudo que define como sua marcenaria trabalha fica concentrado aqui. A IARA consulta esta base quando executa projetos.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={()=>setTab('operacao')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${tab==='operacao'?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}><PackageOpen size={16}/> Operação</button>
          <button type="button" onClick={()=>setTab('dna')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${tab==='dna'?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}><Brain size={16}/> DNA da marcenaria</button>
        </div>
      </header>
      {tab==='operacao' ? <MinhaMarcenaria /> : <MarcenariaDnaPanel />}
    </section>
  );
}
