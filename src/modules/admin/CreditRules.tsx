import { useEffect, useState } from 'react';
import { Activity, Bot, CheckCircle2, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CreditRule { operation_type: string; credit_type: string; credit_cost: number | null; enabled: boolean; version: number; idempotency: boolean; updated_at: string; }
interface Skill { slug: string; name: string; category: string; source: string; status: string; version: string | null; }
interface Run { id: string; user_prompt: string; status: string; error: string | null; created_at: string; updated_at: string; }
interface Alert { alert_type: string; severity: string; source: string; status: string; created_at: string; }
type AIProvider = 'automatic' | 'lovable' | 'gemini';
const emptyRule = { operation_type: '', credit_type: '', credit_cost: '', enabled: true, version: '1', idempotency: true };

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

export default function CreditRules() {
  const [rules, setRules] = useState<CreditRule[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState(emptyRule);
  const [aiProvider, setAiProvider] = useState<AIProvider>('automatic');
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAI, setSavingAI] = useState(false);

  const loadRules = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setMessage('Entre na sua conta para acessar esta área.'); setLoading(false); return; }
    const { data: admin, error: adminError } = await supabase.rpc('is_admin_user', { p_user_id: userId });
    if (adminError || !admin) { setMessage('Esta área está disponível apenas para administradores.'); setLoading(false); return; }
    setIsAdmin(true);
    const [{ data: ruleRows, error: ruleError }, { data: skillRows }, { data: runRows }, { data: alertRows }, { data: providerRow }] = await Promise.all([
      supabase.rpc('admin_list_billing_credit_rules'),
      supabase.from('agent_skills_registry').select('slug,name,category,source,status,version').order('category').order('name'),
      supabase.from('orchestrator_runs').select('id,user_prompt,status,error,created_at,updated_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('operational_alerts').select('alert_type,severity,source,status,created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(100),
      supabase.from('ai_provider_settings').select('user_id,provider,updated_at').eq('user_id', userId).maybeSingle(),
    ]);
    if (ruleError) setMessage(ruleError.message); else { setRules((ruleRows ?? []) as CreditRule[]); setMessage(''); }
    if (providerRow?.provider === 'lovable' || providerRow?.provider === 'gemini' || providerRow?.provider === 'automatic') setAiProvider(providerRow.provider);
    setSkills((skillRows ?? []) as Skill[]); setRuns((runRows ?? []) as Run[]); setAlerts((alertRows ?? []) as Alert[]); setLoading(false);
  };
  useEffect(() => { void loadRules(); }, []);

  const saveRule = async () => {
    const creditCost = Number(form.credit_cost); const version = Number(form.version);
    if (!form.operation_type.trim() || !form.credit_type.trim() || !Number.isInteger(creditCost) || creditCost <= 0 || !Number.isInteger(version) || version <= 0) { setMessage('Preencha operação, tipo de crédito, custo inteiro positivo e versão positiva.'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('admin_upsert_billing_credit_rule', { p_operation_type: form.operation_type.trim(), p_credit_type: form.credit_type.trim(), p_credit_cost: creditCost, p_enabled: form.enabled, p_version: version, p_idempotency: form.idempotency });
    setSaving(false); if (error) { setMessage(error.message); return; }
    setMessage('Regra salva com sucesso.'); setForm(emptyRule); await loadRules();
  };

  const saveAIProvider = async () => {
    setSavingAI(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setMessage('Entre na sua conta para continuar.'); setSavingAI(false); return; }
    const { error } = await supabase.from('ai_provider_settings').upsert({ user_id: userId, provider: aiProvider, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSavingAI(false);
    if (error) { setMessage(`Não foi possível salvar o provedor de IA: ${error.message}`); return; }
    setMessage(`Provedor de IA atualizado para ${aiProvider === 'automatic' ? 'Automático' : aiProvider === 'lovable' ? 'Lovable AI' : 'Google Gemini'}.`);
  };

  if (loading) return <section className="space-y-5 p-4 md:p-6"><div className="h-7 w-64 animate-pulse rounded bg-slate-200" /><div className="h-4 w-full max-w-2xl animate-pulse rounded bg-slate-100" /><div className="grid gap-4 md:grid-cols-2"><div className="h-64 animate-pulse rounded-2xl bg-slate-100" /><div className="h-64 animate-pulse rounded-2xl bg-slate-100" /></div></section>;
  if (!isAdmin) return <section className="p-4 md:p-6"><div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{message || 'Acesso negado.'}</div></section>;

  const attentionAlerts = alerts.filter(a => a.severity !== 'INFO').length;
  const providerOptions: { id: AIProvider; title: string; description: string }[] = [
    { id: 'automatic', title: 'Automático', description: 'Escolhe a rota disponível para o ambiente.' },
    { id: 'lovable', title: 'Lovable AI', description: 'Usa o provedor Lovable configurado para o ambiente.' },
    { id: 'gemini', title: 'Google Gemini', description: 'Usa Gemini quando a integração estiver configurada.' },
  ];

  return <section className="space-y-6 p-4 md:p-6">
    <header className="space-y-1"><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Administração</p><h2 className="text-2xl font-black tracking-tight text-slate-900">Créditos e operação</h2><p className="max-w-3xl text-sm leading-6 text-slate-500">Acompanhe as regras de créditos, o provedor de IA, as Skills, as execuções da IARA e os alertas do ambiente.</p></header>

    <div className={cardClass}>
      <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Bot size={20} /></div><div><h3 className="font-black text-slate-900">Provedor de IA</h3><p className="mt-1 text-sm text-slate-500">Selecione qual provedor deve atender as operações de IA deste ambiente.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">{providerOptions.map(option => <button key={option.id} type="button" onClick={() => setAiProvider(option.id)} aria-pressed={aiProvider === option.id} className={`rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-200 ${aiProvider === option.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-900">{option.title}</span>{aiProvider === option.id && <CheckCircle2 size={18} className="shrink-0 text-indigo-600" />}</div><p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p></button>)}</div>
      <button type="button" disabled={savingAI} onClick={() => void saveAIProvider()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{savingAI ? 'Salvando…' : 'Salvar provedor'}</button>
      <p className="mt-3 text-xs leading-5 text-slate-400">A configuração do provedor não expõe chaves de API no navegador. A disponibilidade da geração depende da configuração do ambiente.</p>
    </div>

    <div className={cardClass}>
      <div className="mb-4"><h3 className="font-black text-slate-900">Regras de créditos</h3><p className="mt-1 text-sm text-slate-500">Cadastre ou atualize uma regra comercial de uso.</p></div>
      <div className="grid gap-3 md:grid-cols-2"><input className={inputClass} aria-label="Operação" placeholder="Operação" value={form.operation_type} onChange={e => setForm({ ...form, operation_type: e.target.value })} /><input className={inputClass} aria-label="Tipo de crédito" placeholder="Tipo de crédito" value={form.credit_type} onChange={e => setForm({ ...form, credit_type: e.target.value })} /><input className={inputClass} aria-label="Custo em créditos" type="number" min="1" placeholder="Custo em créditos" value={form.credit_cost} onChange={e => setForm({ ...form, credit_cost: e.target.value })} /><input className={inputClass} aria-label="Versão" type="number" min="1" placeholder="Versão" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
      <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600"><label className="flex items-center gap-2"><input className="h-4 w-4" type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Regra ativa</label><label className="flex items-center gap-2"><input className="h-4 w-4" type="checkbox" checked={form.idempotency} onChange={e => setForm({ ...form, idempotency: e.target.checked })} /> Exigir idempotência</label></div>
      <button type="button" disabled={saving} onClick={() => void saveRule()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{saving ? 'Salvando…' : 'Salvar regra'}</button>
    </div>

    {message && <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</div>}

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Skills registrados', skills.length], ['Execuções observadas', runs.length], ['Alertas abertos', alerts.length], ['Alertas de atenção+', attentionAlerts]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><strong className="mt-1 block text-2xl tracking-tight text-slate-900">{value}</strong></div>)}</div>

    <div className={cardClass}><div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-indigo-600" /><h3 className="font-black text-slate-900">Skills do Marcenapp</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400"><th className="px-2 py-3">Skill</th><th className="px-2 py-3">Categoria</th><th className="px-2 py-3">Origem</th><th className="px-2 py-3">Status</th><th className="px-2 py-3">Versão</th></tr></thead><tbody>{skills.map(s => <tr key={s.slug} className="border-b last:border-0"><td className="px-2 py-3 font-semibold text-slate-800">{s.name}</td><td className="px-2 py-3 text-slate-600">{s.category}</td><td className="px-2 py-3 text-slate-600">{s.source}</td><td className="px-2 py-3 text-slate-600">{s.status}</td><td className="px-2 py-3 text-slate-600">{s.version ?? '—'}</td></tr>)}</tbody></table>{skills.length === 0 && <p className="py-6 text-sm text-slate-500">Nenhuma Skill registrada.</p>}</div></div>

    <div className={cardClass}><div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-indigo-600" /><h3 className="font-black text-slate-900">Execuções da IARA</h3></div><div className="space-y-2">{runs.map(r => <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0 truncate font-semibold text-slate-800">{r.user_prompt}</span><span className="shrink-0 text-xs font-bold uppercase text-slate-500">{r.status}</span></div><p className="mt-1 text-xs text-slate-500">Duração observada: {Math.max(0, new Date(r.updated_at).getTime() - new Date(r.created_at).getTime())} ms · {r.error || 'sem erro registrado'}</p></div>)}{runs.length === 0 && <p className="text-sm text-slate-500">Nenhuma execução observável registrada.</p>}</div></div>

    <div className={cardClass}><div className="mb-4 flex items-center gap-2"><ShieldAlert size={18} className="text-amber-600" /><h3 className="font-black text-slate-900">Alertas operacionais</h3></div><div className="space-y-2">{alerts.map((a, i) => <div key={`${a.alert_type}-${a.created_at}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><span className="font-bold text-slate-800">{a.alert_type}</span><p className="text-xs text-slate-500">{a.source} · {new Date(a.created_at).toLocaleString('pt-BR')}</p></div><span className="shrink-0 text-xs font-black uppercase text-slate-600">{a.severity}</span></div>)}{alerts.length === 0 && <p className="text-sm text-slate-500">Nenhum alerta aberto.</p>}</div></div>

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400"><th className="p-3">Operação</th><th className="p-3">Crédito</th><th className="p-3">Custo</th><th className="p-3">Versão</th><th className="p-3">Ativa</th><th className="p-3">Idempotência</th></tr></thead><tbody>{rules.map(rule => <tr key={`${rule.operation_type}:${rule.version}`} className="border-b last:border-0"><td className="p-3 text-slate-700">{rule.operation_type}</td><td className="p-3 text-slate-700">{rule.credit_type}</td><td className="p-3 text-slate-700">{rule.credit_cost ?? '—'}</td><td className="p-3 text-slate-700">{rule.version}</td><td className="p-3">{rule.enabled ? 'Sim' : 'Não'}</td><td className="p-3">{rule.idempotency ? 'Sim' : 'Não'}</td></tr>)}</tbody></table>{rules.length === 0 && <p className="p-5 text-sm text-slate-500">Nenhuma regra cadastrada.</p>}</div>
  </section>;
}
