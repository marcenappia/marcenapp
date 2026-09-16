import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const PROFESSIONAL_PROFILES = [
  { value: 'marceneiro', label: 'Marceneiro', description: 'Produção, projetos, orçamento, corte, ferragens e financeiro.' },
  { value: 'loja_planejados', label: 'Loja de planejados', description: 'Vendas, clientes, projetos, orçamentos e acompanhamento comercial.' },
  { value: 'arquiteto', label: 'Arquiteto', description: 'Projetos, especificações, clientes, fornecedores e documentação.' },
  { value: 'designer_interiores', label: 'Designer de interiores', description: 'Ambientes, materiais, clientes, apresentação e especificações.' },
  { value: 'projetista', label: 'Projetista', description: 'Projetos técnicos, medidas, detalhamento e preparação para produção.' },
  { value: 'vendedor_planejados', label: 'Vendedor / consultor de planejados', description: 'Atendimento, oportunidades, orçamento, negociação e acompanhamento.' },
  { value: 'fabrica', label: 'Fábrica / indústria', description: 'Produção, pedidos, materiais, capacidade e operação.' },
] as const;

export type ProfessionalProfile = typeof PROFESSIONAL_PROFILES[number]['value'];

export function ProfessionalProfileCard({ userId, profession, onSaved }: { userId?: string; profession?: string | null; onSaved?: (profession: string) => void }) {
  const [selected, setSelected] = useState(profession ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setSelected(profession ?? ''), [profession]);

  const save = async () => {
    if (!userId || !selected) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.from('profiles').update({ profession: selected }).eq('user_id', userId);
    if (!error) {
      setSaved(true);
      onSaved?.(selected);
    }
    setSaving(false);
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><BriefcaseBusiness size={20} /></div>
        <div className="min-w-0">
          <h2 className="break-words font-black text-slate-800">Perfil profissional</h2>
          <p className="mt-1 break-words text-xs leading-5 text-slate-500">Isso define a experiência principal do Master App e o contexto que a IARA deve priorizar.</p>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROFESSIONAL_PROFILES.map(profileOption => (
          <button key={profileOption.value} type="button" onClick={() => { setSelected(profileOption.value); setSaved(false); }} className={`min-w-0 rounded-xl border p-3 text-left transition sm:p-4 ${selected === profileOption.value ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="flex min-w-0 items-start justify-between gap-2"><span className="min-w-0 break-words font-bold text-slate-800">{profileOption.label}</span>{selected === profileOption.value && <CheckCircle2 size={17} className="shrink-0 text-indigo-600" />}</div>
            <p className="mt-1 break-words text-xs leading-5 text-slate-500">{profileOption.description}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!userId || !selected || saving} onClick={() => void save()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar perfil'}</button>
        {saved && <span className="text-xs font-bold text-emerald-600">Perfil salvo.</span>}
      </div>
    </div>
  );
}

export default function ProfessionalProfilesAdmin() {
  const [rows, setRows] = useState<{ profession: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const { data } = await supabase.from('profiles').select('profession');
    setRows((data ?? []) as { profession: string | null }[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const counts = useMemo(() => PROFESSIONAL_PROFILES.map(item => ({ ...item, count: rows.filter(row => row.profession === item.value).length })), [rows]);
  const unclassified = rows.filter(row => !row.profession).length;
  if (loading) return <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500">Carregando perfis profissionais…</div>;
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4"><div className="p-2.5 rounded-xl bg-slate-50 text-slate-600"><Users size={19} /></div><div><h3 className="font-black text-slate-800">Perfis profissionais</h3><p className="text-sm text-slate-500">Distribuição dos usuários por experiência profissional. A seleção é feita no cadastro/configurações.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map(item => <div key={item.value} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">{item.label}</p><strong className="text-2xl text-slate-800">{item.count}</strong></div>)}
        <div className="rounded-xl border border-dashed border-slate-300 p-4"><p className="text-xs font-bold text-slate-500">Sem perfil</p><strong className="text-2xl text-slate-800">{unclassified}</strong></div>
      </div>
    </div>
  );
}
