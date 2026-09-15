import React, { useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Lightbulb, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DNA_CATEGORIES, deleteDnaRule, loadDnaRules, resolveDnaRules, saveDnaRule, type DnaCategory, type DnaRule } from './dnaRules';

const statusLabel = { defined: 'Regra definida', learned: 'Preferência aprendida', suggested: 'Sugestão da IARA', project_exception: 'Exceção de projeto' } as const;

export default function MarcenariaDnaPanel() {
  const { user } = useAuth();
  const [rules, setRules] = useState<DnaRule[]>([]);
  const [category, setCategory] = useState<DnaCategory>('identidade');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'defined' | 'learned' | 'suggested'>('defined');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try { setRules(await loadDnaRules(user.id)); } catch { setMessage('Não foi possível carregar o DNA agora.'); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [user?.id]);

  const resolved = useMemo(() => resolveDnaRules(rules), [rules]);

  const addRule = async () => {
    if (!user || !key.trim() || !value.trim()) return;
    setLoading(true); setMessage('');
    try {
      await saveDnaRule({ userId: user.id, category, ruleKey: key.trim().toLocaleLowerCase('pt-BR'), value, status });
      setKey(''); setValue(''); setStatus('defined');
      await refresh();
      setMessage('Regra salva. A IARA passa a considerar isso como parte do jeito da sua marcenaria.');
    } catch { setMessage('Não foi possível salvar esta regra.'); } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!user || !window.confirm('Remover esta regra do DNA?')) return;
    setLoading(true);
    try { await deleteDnaRule(user.id, id); await refresh(); } catch { setMessage('Não foi possível remover a regra.'); } finally { setLoading(false); }
  };

  if (!user) return null;

  return <div className="rounded-3xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
    <div className="border-b border-indigo-100 bg-indigo-50/60 p-5 md:p-6">
      <div className="flex items-start gap-3"><div className="rounded-2xl bg-white p-3 text-indigo-600 shadow-sm"><Brain size={22}/></div><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-700"><ShieldCheck size={14}/> DNA da marcenaria</div><h2 className="mt-1 text-xl font-black text-slate-900">Ensine a IARA a trabalhar do seu jeito.</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Aqui ficam as regras e preferências da sua marcenaria. Elas acompanham seus projetos, mas uma decisão explícita do projeto sempre tem prioridade.</p></div></div>
      <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-4"><div className="flex items-start gap-3"><Lightbulb size={18} className="mt-0.5 shrink-0 text-amber-500"/><div><p className="text-sm font-black text-slate-800">Comece com uma coisa que você nunca quer ter que repetir.</p><p className="mt-1 text-xs leading-5 text-slate-500">Ex.: “Trabalho normalmente com MDF 18 mm”, “minha folga de porta é 2 mm” ou “prefiro corrediça telescópica”.</p></div></div></div>
    </div>

    <div className="p-5 md:p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[180px_180px_1fr_auto] gap-2">
        <select value={category} onChange={e => setCategory(e.target.value as DnaCategory)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-indigo-400">{DNA_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="Nome da regra" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-400" />
        <input value={value} onChange={e => setValue(e.target.value)} placeholder="Como sua marcenaria faz?" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-400" />
        <button onClick={() => void addRule()} disabled={loading || !key.trim() || !value.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-40"><Plus size={16}/> Ensinar</button>
      </div>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">Tipo:</span>{(['defined','learned','suggested'] as const).map(item => <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${status===item?'border-indigo-200 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-500'}`}>{statusLabel[item]}</button>)}</div>

      <div className="space-y-2">
        {loading && !rules.length ? <div className="py-8 text-center text-sm text-slate-400">Carregando DNA…</div> : resolved.length ? resolved.map(rule => <div key={rule.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{DNA_CATEGORIES.find(item => item.id === rule.category)?.label}</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{statusLabel[rule.status]}</span>{rule.version > 1 && <span className="text-[10px] font-semibold text-slate-400">v{rule.version}</span>}</div><p className="mt-1 text-sm font-black text-slate-800">{rule.rule_key}</p><p className="mt-1 text-sm leading-5 text-slate-600">{String(rule.rule_value.text ?? '')}</p><p className="mt-2 text-[10px] font-semibold text-slate-400">Fonte: {rule.source === 'manual' ? 'você' : rule.source} · confiança {Math.round(rule.confidence * 100)}%</p></div><button onClick={() => void remove(rule.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label="Remover regra"><Trash2 size={15}/></button></div>) : <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><CheckCircle2 size={22} className="mx-auto text-slate-300"/><p className="mt-2 text-sm font-bold text-slate-700">Seu DNA ainda está começando.</p><p className="mt-1 text-xs text-slate-400">Cadastre uma regra acima. Depois, a IARA poderá trabalhar com esse conhecimento sem você repetir tudo em cada projeto.</p></div>}
      </div>
      {message && <p className="text-xs font-semibold text-slate-500">{message}</p>}
    </div>
  </div>;
}
