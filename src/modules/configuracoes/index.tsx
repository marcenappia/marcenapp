import React, { useState } from 'react';
import { Building2, Calculator, CreditCard, Package, Palette, Save, Settings2, Sparkles, Users, ArrowRight, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProfessionalProfileCard } from '@/modules/admin/ProfessionalProfiles';
import MinhaMarcenaria from '@/modules/marcenaria/MineriaDaMarcenaria';

type Profile = { name?: string | null; company?: string | null; profession?: string | null };

type Props = { userId?: string; profile: Profile | null; onNavigate: (module: string) => void; onSaved?: () => void; };

const cards = [
  { id: 'orcamento', icon: Calculator, title: 'Orçamentos', text: 'Preço de venda, custos reais, margem e resumo para o cliente.' },
  { id: 'billing', icon: CreditCard, title: 'Financeiro', text: 'Acompanhe créditos, pagamentos e a estrutura financeira do negócio.' },
  { id: 'corte', icon: Package, title: 'Lista de corte', text: 'Materiais e produção ficam conectados ao projeto e ao orçamento.' },
  { id: 'clientes', icon: Users, title: 'Clientes', text: 'Cadastre e acompanhe os clientes sem sair do ecossistema.' },
];

const ConfiguracoesModule = ({ userId, profile, onNavigate, onSaved }: Props) => {
  const [name, setName] = useState(profile?.name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDna, setShowDna] = useState(false);

  const save = async () => {
    if (!userId) return;
    setSaving(true); setSaved(false);
    try { const { error } = await supabase.from('profiles').update({ name: name.trim(), company: company.trim() }).eq('user_id', userId); if (error) throw error; setSaved(true); onSaved?.(); } finally { setSaving(false); }
  };

  return (
    <section className="space-y-6 pb-24 md:pb-8">
      <div>
        <div className="flex items-center gap-2 text-indigo-600 mb-2"><Settings2 size={18} /><span className="text-xs font-black uppercase tracking-widest">Central da marcenaria</span></div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Configurações da sua marcenaria</h1>
        <p className="mt-2 text-sm md:text-base text-slate-500 max-w-2xl">Um único lugar para configurar os dados do negócio e definir a experiência profissional que orienta o Master App e a IARA. Funciona igual no computador e no celular.</p>
      </div>

      <ProfessionalProfileCard userId={userId} profession={profile?.profession} onSaved={() => onSaved?.()} />

      <button type="button" onClick={() => setShowDna(v => !v)} className="w-full rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 text-left hover:bg-indigo-50 transition-colors">
        <div className="flex items-center justify-between gap-4"><div className="flex items-start gap-3"><div className="p-2.5 rounded-xl bg-white text-indigo-600 shadow-sm"><Database size={20} /></div><div><h2 className="font-black text-slate-900">Minha Marcenaria — DNA operacional</h2><p className="mt-1 text-xs text-slate-600">Materiais, fornecedores, estoque e documentos de referência usados pela IARA.</p></div></div><ArrowRight size={18} className={`text-indigo-500 transition-transform ${showDna ? 'rotate-90' : ''}`} /></div>
      </button>
      {showDna && <MinhaMarcenaria />}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5"><div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><Building2 size={20} /></div><div><h2 className="font-black text-slate-800">Dados da marcenaria</h2><p className="text-xs text-slate-500 mt-1">Esses dados serão a base dos próximos documentos, orçamentos e comunicação com o cliente.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="text-xs font-bold text-slate-600">Responsável</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
          <label className="block"><span className="text-xs font-bold text-slate-600">Nome da marcenaria</span><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Nome comercial" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3"><button onClick={() => void save()} disabled={saving || !userId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"><Save size={16} />{saving ? 'Salvando...' : 'Salvar dados'}</button>{saved && <span className="text-xs font-bold text-emerald-600">Dados salvos.</span>}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{cards.map(({ id, icon: Icon, title, text }) => <button key={id} onClick={() => onNavigate(id)} className="group text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"><div className="flex items-start justify-between gap-4"><div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Icon size={19} /></div><ArrowRight size={17} className="text-slate-300 group-hover:text-indigo-500 transition-colors" /></div><h3 className="mt-4 font-black text-slate-800">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></button>)}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 font-bold text-slate-800"><Palette size={18} className="text-slate-500" /> Aparência</div><p className="text-xs text-slate-500 mt-2">A personalização visual do orçamento e dos documentos será centralizada aqui, mantendo a experiência profissional e sem visual artificial.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 font-bold text-slate-800"><Sparkles size={18} className="text-indigo-500" /> IARA conectada</div><p className="text-xs text-slate-500 mt-2">O perfil profissional e as configurações da marcenaria servem de contexto para a IARA responder e executar tarefas dentro do negócio.</p></div></div>
    </section>
  );
};
export default ConfiguracoesModule;
