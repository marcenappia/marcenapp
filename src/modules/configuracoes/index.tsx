import React, { useEffect, useState } from 'react';
import { ArrowRight, Brain, Building2, Calculator, CheckCircle2, CreditCard, Package, Save, Settings2, Users } from 'lucide-react';
import MineriaDaMarcenaria from '@/modules/marcenaria/MineriaDaMarcenaria';
import MarcenariaDnaPanel from '@/modules/marcenaria/MarcenariaDnaPanel';
import { supabase } from '@/integrations/supabase/client';

type Profile = { name?: string | null; company?: string | null; profession?: string | null; reduce_motion?: boolean | null };
type Props = { userId?: string; profile: Profile | null; onNavigate: (module: string) => void; onSaved?: () => void };

const cards = [
  { id: 'orcamento', icon: Calculator, title: 'Orçamentos', text: 'Preços de venda, custos e margem.' },
  { id: 'billing', icon: CreditCard, title: 'Créditos e financeiro', text: 'Pagamentos, créditos e consumo.' },
  { id: 'corte', icon: Package, title: 'Lista de corte', text: 'Materiais e produção dos projetos.' },
  { id: 'clientes', icon: Users, title: 'Clientes', text: 'Cadastro e acompanhamento.' },
];

export default function ConfiguracoesModule({ userId, profile, onNavigate }: Props) {
  const [name, setName] = useState(profile?.name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [profession, setProfession] = useState(profile?.profession ?? '');
  const [reduceMotion, setReduceMotion] = useState(Boolean(profile?.reduce_motion));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [section, setSection] = useState<'operacao' | 'dna'>('operacao');

  useEffect(() => {
    setName(profile?.name ?? '');
    setCompany(profile?.company ?? '');
    setProfession((profile as Profile & { profession?: string | null })?.profession ?? '');
    setReduceMotion(Boolean((profile as Profile & { reduce_motion?: boolean | null })?.reduce_motion));
  }, [profile]);


  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const { error } = await supabase.from('profiles').update({
        name: name.trim(),
        company: company.trim(),
        profession: profession.trim() || null,
        reduce_motion: reduceMotion,
      }).eq('user_id', userId);
      if (error) throw error;
      setSaved(true);
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? 'Não foi possível salvar agora. Confira sua conexão e tente novamente.' : 'Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const shortcuts = [
    { id: 'orcamento', icon: Calculator, title: 'Orçamentos', text: 'Preços de venda, custos e margem.' },
    { id: 'billing', icon: CreditCard, title: 'Créditos e planos', text: 'Consumo, pagamentos e planos.' },
    { id: 'corte', icon: Package, title: 'Lista de corte', text: 'Materiais e produção dos projetos.' },
    { id: 'clientes', icon: Users, title: 'Clientes', text: 'Cadastros e acompanhamento.' },
  ];

  return <section className="mx-auto min-w-0 max-w-6xl space-y-4 pb-24 md:space-y-6 md:pb-8">
    <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-7">
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-xl bg-blue-600 p-2.5 text-white"><Settings2 size={20}/></div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">Configurações</p>
          <h1 className="mt-1 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl md:text-3xl">Configurações gerais</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Identidade, preferências, IA e operação em um único lugar.</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[
          { id: 'operacao', label: 'Geral', icon: Settings2 },
          { id: 'dna', label: 'DNA da marcenaria', icon: Brain },
        ].map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id as 'operacao' | 'dna')} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-black transition ${section === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'}`}>
          <Icon size={15}/>{label}
        </button>)}
      </div>
    </header>

    {section === 'operacao' && <>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-start gap-3"><div className="shrink-0 rounded-xl bg-blue-600 p-2.5 text-white"><Building2 size={18}/></div><div><h2 className="font-black text-slate-900">Perfil e marcenaria</h2><p className="mt-1 text-xs leading-5 text-slate-500">Identidade usada nos projetos e na operação.</p></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label><span className="text-xs font-bold text-slate-600">Responsável</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:px-4 sm:text-sm"/></label>
            <label><span className="text-xs font-bold text-slate-600">Nome da marcenaria</span><input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Nome comercial" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"/></label>
            <label className="md:col-span-2"><span className="text-xs font-bold text-slate-600">Profissão / função</span><input value={profession} onChange={e=>setProfession(e.target.value)} placeholder="Ex.: Marceneiro, projetista, gestor" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"/></label>
          </div>
          <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={()=>void save()} disabled={saving||!userId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Save size={16}/>{saving?'Salvando...':'Salvar dados'}</button>
            {saved && <span role="status" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={14}/>Dados salvos.</span>}{saveError && <span role="alert" className="text-xs font-semibold text-red-600">{saveError}</span>}
          </div>
        </div>

      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3"><div className="shrink-0 rounded-xl bg-slate-100 p-2.5 text-slate-700"><Settings2 size={18}/></div><div><h2 className="font-black text-slate-900">Preferências</h2><p className="mt-1 text-xs leading-5 text-slate-500">Preferências já suportadas pelo perfil atual.</p></div></div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <span><span className="block text-sm font-black text-slate-800">Reduzir movimento</span><span className="mt-1 block text-xs leading-5 text-slate-500">Diminui animações e transições da interface.</span></span>
          <input type="checkbox" checked={reduceMotion} onChange={e=>setReduceMotion(e.target.checked)} className="h-5 w-5 accent-slate-900"/>
        </label>
      </section>

      <section>
        <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Operação</p><h2 className="mt-1 text-lg font-black text-slate-900">Acessos principais</h2></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{shortcuts.map(({id,icon:Icon,title,text})=><button key={id} type="button" onClick={()=>onNavigate(id)} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className="shrink-0 rounded-xl bg-slate-50 p-2.5 text-slate-700"><Icon size={18}/></span><ArrowRight size={16} className="mt-1 shrink-0 text-slate-300 group-hover:text-indigo-500"/></div><h3 className="mt-3 break-words font-black text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></button>)}</div>
      </section>

    </>}

    {section === 'dna' && <div className="space-y-5">
      <MarcenariaDnaPanel />
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">Arquivos e dados</p><h2 className="mt-1 text-lg font-black text-slate-900">Base da marcenaria</h2><p className="mt-1 text-xs leading-5 text-slate-500">Envie, consulte e baixe documentos de referência, materiais, fornecedores e estoque.</p></div>
        <MineriaDaMarcenaria />
      </section>
    </div>}
  </section>;
}
