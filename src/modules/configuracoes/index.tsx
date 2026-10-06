import React, { useState } from 'react';
import { Building2, Calculator, CreditCard, Package, Palette, Save, Settings2, Users, ArrowRight, Database, Bell, SlidersHorizontal, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProfessionalProfileCard } from '@/modules/admin/ProfessionalProfiles';
import MinhaMarcenaria from '@/modules/marcenaria/MineriaDaMarcenaria';
import MarcenariaDnaPanel from '@/modules/marcenaria/MarcenariaDnaPanel';

type Profile = { name?: string | null; company?: string | null; profession?: string | null; avatar_url?: string | null };
type Props = { userId?: string; profile: Profile | null; onNavigate: (module: string) => void; onSaved?: () => void; };

const cards = [
  { id: 'orcamento', icon: Calculator, title: 'Orçamentos', text: 'Preços de venda, custos reais, margem e resumo profissional.' },
  { id: 'billing', icon: CreditCard, title: 'Créditos e financeiro', text: 'Consulte créditos, pagamentos e consumo do sistema.' },
  { id: 'corte', icon: Package, title: 'Lista de corte', text: 'Materiais e produção conectados aos seus projetos.' },
  { id: 'clientes', icon: Users, title: 'Clientes', text: 'Cadastre e acompanhe clientes dentro do ecossistema.' },
];

const quickLinks = [
  { icon: Palette, title: 'Aparência dos documentos', text: 'Identidade visual usada em orçamentos e documentos.' },
  { icon: Bell, title: 'Notificações', text: 'Preferências de avisos e atualizações.' },
  { icon: SlidersHorizontal, title: 'Preferências do sistema', text: 'Comportamento e experiência do Marcenapp.' },
  { icon: HelpCircle, title: 'Ajuda e suporte', text: 'Orientações para usar melhor o sistema.' },
];

const ConfiguracoesModule = ({ userId, profile, onNavigate, onSaved }: Props) => {
  const [name, setName] = useState(profile?.name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDna, setShowDna] = useState(false);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim(), company: company.trim() }).eq('user_id', userId);
      if (error) throw error;
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-7 pb-24 md:pb-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-indigo-600"><Settings2 size={17} /><span className="text-[11px] font-black uppercase tracking-[.18em]">Configurações</span></div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950">Central da sua marcenaria</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Dados, preferências e recursos do Marcenapp em um único lugar. Simples no celular, completo no computador.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600"><Building2 size={16} />{profile?.company || 'Sua marcenaria'}</div>
        </div>
      </header>

      <ProfessionalProfileCard userId={userId} profession={profile?.profession} avatarUrl={profile?.avatar_url} onSaved={() => onSaved?.()} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-2xl bg-slate-950 p-2.5 text-white"><Building2 size={19} /></div><div><h2 className="font-black text-slate-900">Dados da marcenaria</h2><p className="mt-1 text-xs leading-5 text-slate-500">Esses dados aparecem como base para documentos, orçamentos e comunicação com o cliente.</p></div></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block"><span className="text-xs font-bold text-slate-600">Responsável</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" /></label>
          <label className="block"><span className="text-xs font-bold text-slate-600">Nome da marcenaria</span><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Nome comercial" className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" /></label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><button type="button" onClick={() => void save()} disabled={saving || !userId} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"><Save size={16} />{saving ? 'Salvando...' : 'Salvar dados'}</button>{saved && <span className="text-xs font-bold text-emerald-600">Dados salvos com sucesso.</span>}</div>
      </section>

      <section><div className="mb-4"><p className="text-[11px] font-black uppercase tracking-[.18em] text-slate-400">Acesso rápido</p><h2 className="mt-1 text-lg font-black text-slate-900">Recursos da operação</h2></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{cards.map(({ id, icon: Icon, title, text }) => (
          <button key={id} type="button" onClick={() => onNavigate(id)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-4"><div className="rounded-2xl bg-slate-50 p-2.5 text-slate-700 transition group-hover:bg-indigo-50 group-hover:text-indigo-600"><Icon size={19} /></div><ArrowRight size={17} className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" /></div>
            <h3 className="mt-4 font-black text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
          </button>
        ))}</div>
      </section>

      <section><div className="mb-4"><p className="text-[11px] font-black uppercase tracking-[.18em] text-slate-400">Sistema</p><h2 className="mt-1 text-lg font-black text-slate-900">Preferências e suporte</h2></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{quickLinks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 opacity-75">
            <div className="rounded-xl bg-slate-50 p-2.5 text-slate-500"><Icon size={18} /></div><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-bold text-slate-800">{title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Em breve</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>
          </div>
        ))}</div>
      </section>

      <section><button type="button" onClick={() => setShowDna(v => !v)} className="w-full rounded-3xl border border-slate-200 bg-slate-950 p-5 text-left text-white shadow-sm transition hover:bg-slate-900">
        <div className="flex items-center justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-2xl bg-white/10 p-2.5"><Database size={19} /></div><div><h2 className="font-black">DNA operacional da marcenaria</h2><p className="mt-1 text-xs leading-5 text-slate-300">Preferências e regras que ajudam a IARA a entender como sua operação trabalha.</p></div></div><ArrowRight size={18} className={`shrink-0 transition-transform ${showDna ? 'rotate-90' : ''}`} /></div>
      </button>{showDna && <div className="mt-4 space-y-4"><MarcenariaDnaPanel /><MinhaMarcenaria /></div>}</section>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-5 text-slate-600"><span className="font-black text-slate-800">Princípio do Marcenapp:</span> configurações devem organizar a operação sem esconder as informações importantes nem criar telas desnecessárias.</div>
    </section>
  );
};

export default ConfiguracoesModule;
