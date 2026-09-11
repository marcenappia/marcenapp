import { useEffect, useState } from 'react';
import { Activity, Save, ShieldAlert, Sparkles, Bot, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CreditRule { operation_type: string; credit_type: string; credit_cost: number | null; enabled: boolean; version: number; idempotency: boolean; updated_at: string; }
interface Skill { slug: string; name: string; category: string; source: string; status: string; version: string | null; }
interface Run { id: string; user_prompt: string; status: string; error: string | null; created_at: string; updated_at: string; }
interface Alert { alert_type: string; severity: string; source: string; status: string; created_at: string; }
type AIProvider = 'automatic' | 'lovable' | 'gemini';
interface AIProviderSetting { user_id: string; provider: AIProvider; updated_at: string; }
const emptyRule = { operation_type: '', credit_type: '', credit_cost: '', enabled: true, version: '1', idempotency: true };

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
    if (!userId) { setMessage('Sessão autenticada necessária.'); setLoading(false); return; }
    const { data: admin, error: adminError } = await supabase.rpc('is_admin_user', { p_user_id: userId });
    if (adminError || !admin) { setMessage('Acesso restrito a administradores.'); setLoading(false); return; }
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
    setMessage('Regra salva.'); setForm(emptyRule); await loadRules();
  };

  const saveAIProvider = async () => {
    setSavingAI(true);
    setMessage('');
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setMessage('Sessão autenticada necessária.'); setSavingAI(false); return; }
    const selectedProvider = aiProvider;
    const { data: savedProvider, error } = await supabase.from('ai_provider_settings').upsert({ user_id: userId, provider: selectedProvider, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('user_id,provider,updated_at').single();
    if (error) { setMessage(`Não foi possível salvar o provedor de IA: ${error.message}`); setSavingAI(false); return; }
    if (savedProvider?.provider !== selectedProvider) { setMessage('O provedor foi enviado, mas a confirmação persistida não corresponde à seleção.'); setSavingAI(false); return; }
    setAiProvider(savedProvider.provider as AIProvider);
    setMessage(`Provedor de IA salvo e confirmado: ${savedProvider.provider === 'automatic' ? 'Automático' : savedProvider.provider === 'lovable' ? 'Lovable AI' : 'Google Gemini'}.`);
    setSavingAI(false);
  };

  if (loading) return <div className="p-6">Carregando administração…</div>;
  if (!isAdmin) return <div className="p-6 text-red-600">{message || 'Acesso negado.'}</div>;

  const attentionAlerts = alerts.filter(a => a.severity !== 'INFO').length;
  return <section className="space-y-6">
    <div><h2 className="text-xl font-bold text-slate-800">Administração e observabilidade</h2><p className="text-sm text-slate-500">O painel observa créditos, Skills, execuções da IARA, alertas operacionais e agora o provedor de IA usado pelo seu ambiente.</p></div>

    <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Bot size={20} /></div><div><h3 className="font-black text-slate-800">Provedor de IA</h3><p className="text-sm text-slate-500">Troque o motor sem alterar as ferramentas do Marcenapp. A chave nunca fica no navegador.</p></div></div><div className="grid gap-3 md:grid-cols-3"><button type="button" onClick={() => setAiProvider('automatic')} className={`rounded-xl border p-4 text-left transition ${aiProvider === 'automatic' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-center justify-between"><span className="font-bold">Automático</span>{aiProvider === 'automatic' && <CheckCircle2 size={18} className="text-indigo-600" />}</div><p className="mt-1 text-xs text-slate-500">Usa Lovable AI quando disponível e Gemini como reserva.</p></button><button type="button" onClick={() => setAiProvider('lovable')} className={`rounded-xl border p-4 text-left transition ${aiProvider === 'lovable' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-center justify-between"><span className="font-bold">Lovable AI</span>{aiProvider === 'lovable' && <CheckCircle2 size={18} className="text-indigo-600" />}</div><p className="mt-1 text-xs text-slate-500">Ideal para os testes atuais. Usa o saldo de IA do Lovable.</p></button><button type="button" onClick={() => setAiProvider('gemini')} className={`rounded-xl border p-4 text-left transition ${aiProvider === 'gemini' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-center justify-between"><span className="font-bold">Google Gemini</span>{aiProvider === 'gemini' && <CheckCircle2 size={18} className="text-indigo-600" />}</div><p className="mt-1 text-xs text-slate-500">Fica pronto para quando a API própria do Google estiver configurada.</p></button></div><button type="button" disabled={savingAI} onClick={() => void saveAIProvider()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Save size={16} /> {savingAI ? 'Salvando…' : 'Ativar provedor selecionado'}</button><p className="text-xs text-slate-400">Importante: selecionar Gemini só ativa a rota. A geração só funcionará quando a chave GOOGLE_GEMINI_API_KEY existir no servidor. O Lovable AI usa LOVABLE_API_KEY, mantida como segredo de backend.</p></div>

    <div className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-2"><div className="md:col-span-2"><h3 className="font-black text-slate-800">Regras comerciais de créditos</h3><p className="text-sm text-slate-500">Configure apenas políticas comerciais oficialmente definidas. Nenhum valor é pré-configurado pelo sistema.</p></div><input className="rounded-lg border p-2" placeholder="Operação" value={form.operation_type} onChange={e => setForm({ ...form, operation_type: e.target.value })} /><input className="rounded-lg border p-2" placeholder="Tipo de crédito" value={form.credit_type} onChange={e => setForm({ ...form, credit_type: e.target.value })} /><input className="rounded-lg border p-2" type="number" min="1" placeholder="Custo em créditos" value={form.credit_cost} onChange={e => setForm({ ...form, credit_cost: e.target.value })} /><input className="rounded-lg border p-2" type="number" min="1" placeholder="Versão" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Ativa</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.idempotency} onChange={e => setForm({ ...form, idempotency: e.target.checked })} /> Exigir idempotência</label><button type="button" disabled={saving} onClick={() => void saveRule()} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-2"><Save size={16} /> {saving ? 'Salvando…' : 'Salvar regra'}</button></div>

    {message && <p className="text-sm text-slate-600">{message}</p>}

    <div className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Skills registrados</p><strong className="text-2xl">{skills.length}</strong></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Execuções observadas</p><strong className="text-2xl">{runs.length}</strong></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Alertas abertos</p><strong className="text-2xl">{alerts.length}</strong></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Alertas de atenção+</p><strong className="text-2xl">{attentionAlerts}</strong></div></div>

    <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-indigo-600" /><h3 className="font-black text-slate-800">Skills do Marcenapp</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Skill</th><th className="p-2">Categoria</th><th className="p-2">Origem</th><th className="p-2">Status</th><th className="p-2">Versão</th></tr></thead><tbody>{skills.map(s => <tr key={s.slug} className="border-b last:border-0"><td className="p-2 font-semibold">{s.name}</td><td className="p-2">{s.category}</td><td className="p-2">{s.source}</td><td className="p-2">{s.status}</td><td className="p-2">{s.version ?? '—'}</td></tr>)}</tbody></table></div></div>

    <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Activity size={18} className="text-indigo-600" /><h3 className="font-black text-slate-800">Execuções IARA / Orchestrator</h3></div><div className="space-y-2">{runs.map(r => <div key={r.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="flex justify-between gap-3"><span className="font-semibold text-slate-800 truncate">{r.user_prompt}</span><span className="text-xs font-black uppercase text-slate-500">{r.status}</span></div><p className="text-xs text-slate-500 mt-1">Duração observada: {Math.max(0, new Date(r.updated_at).getTime() - new Date(r.created_at).getTime())} ms · {r.error || 'sem erro registrado'}</p></div>)}{runs.length === 0 && <p className="text-sm text-slate-500">Nenhuma execução observável registrada.</p>}</div></div>

    <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><ShieldAlert size={18} className="text-amber-600" /><h3 className="font-black text-slate-800">Alertas operacionais</h3></div><div className="space-y-2">{alerts.map((a, i) => <div key={`${a.alert_type}-${a.created_at}-${i}`} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3"><div><span className="font-bold text-slate-800">{a.alert_type}</span><p className="text-xs text-slate-500">{a.source} · {new Date(a.created_at).toLocaleString('pt-BR')}</p></div><span className="text-xs font-black uppercase">{a.severity}</span></div>)}{alerts.length === 0 && <p className="text-sm text-slate-500">Nenhum alerta aberto.</p>}</div></div>

    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Operação</th><th className="p-3">Crédito</th><th className="p-3">Custo</th><th className="p-3">Versão</th><th className="p-3">Ativa</th><th className="p-3">Idempotência</th></tr></thead><tbody>{rules.map(rule => <tr key={`${rule.operation_type}:${rule.version}`} className="border-b last:border-0"><td className="p-3">{rule.operation_type}</td><td className="p-3">{rule.credit_type}</td><td className="p-3">{rule.credit_cost ?? '—'}</td><td className="p-3">{rule.version}</td><td className="p-3">{rule.enabled ? 'Sim' : 'Não'}</td><td className="p-3">{rule.idempotency ? 'Sim' : 'Não'}</td></tr>)}</tbody></table></div>
  </section>;
}