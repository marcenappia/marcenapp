import React, { useState } from 'react';
import { Building2, Calculator, CreditCard, Package, Save, Settings2, Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Profile = { name?: string | null; company?: string | null };
type Props = { userId?: string; profile: Profile | null; onNavigate: (module: string) => void; onSaved?: () => void };

const cards = [
  { id: 'orcamento', icon: Calculator, title: 'Orçamentos', text: 'Preços de venda, custos e margem.' },
  { id: 'billing', icon: CreditCard, title: 'Créditos e financeiro', text: 'Pagamentos, créditos e consumo.' },
  { id: 'corte', icon: Package, title: 'Lista de corte', text: 'Materiais e produção dos projetos.' },
  { id: 'clientes', icon: Users, title: 'Clientes', text: 'Cadastro e acompanhamento.' },
];

export default function ConfiguracoesModule({ userId, profile, onNavigate, onSaved }: Props) {
  const [name, setName] = useState(profile?.name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!userId) return;
    setSaving(true); setSaved(false);
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim(), company: company.trim() }).eq('user_id', userId);
      if (error) throw error;
      setSaved(true); onSaved?.();
    } catch { setSaved(false); }
    finally { setSaving(false); }
  };

  return <section className="min-w-0 space-y-5 pb-24 md:pb-8">
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Settings2 size={20}/></div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-600">Configurações</p>
          <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Central da sua marcenaria</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Dados e acessos principais da sua operação.</p>
        </div>
      </div>
    </header>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-slate-900 p-2.5 text-white"><Building2 size={18}/></div>
        <div className="min-w-0"><h2 className="font-black text-slate-900">Dados da marcenaria</h2><p className="mt-1 text-xs leading-5 text-slate-500">Nome e responsável.</p></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="min-w-0"><span className="text-xs font-bold text-slate-600">Responsável</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"/></label>
        <label className="min-w-0"><span className="text-xs font-bold text-slate-600">Nome da marcenaria</span><input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Nome comercial" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"/></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={()=>void save()} disabled={saving||!userId} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={16}/>{saving?'Salvando...':'Salvar dados'}</button>
        {saved && <span className="text-xs font-bold text-emerald-600">Dados salvos.</span>}
      </div>
    </section>

    <section>
      <p className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Acesso rápido</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map(({id,icon:Icon,title,text})=><button key={id} type="button" onClick={()=>onNavigate(id)} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-300 hover:shadow-md">
          <div className="flex items-start justify-between gap-3"><span className="shrink-0 rounded-xl bg-slate-50 p-2.5 text-slate-700"><Icon size={18}/></span><ArrowRight size={16} className="mt-1 shrink-0 text-slate-300 group-hover:text-indigo-500"/></div>
          <h3 className="mt-3 break-words font-black text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
        </button>)}
      </div>
    </section>
  </section>;
}
