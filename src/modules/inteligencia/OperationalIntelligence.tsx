import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Settings2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type DNA = {
  user_id: string;
  standard_mdf_thickness_mm: number | null;
  back_thickness_mm: number | null;
  minimum_margin_pct: number | null;
};

type Project = { id: string; nome: string | null; name: string; profit_margin: number | null; external_material: string | null };
type AlertRow = { id: string; alert_type: string; severity: 'INFO' | 'ATENCAO' | 'ERRO' | 'CRITICO'; message: string; evidence: Record<string, unknown>; suggested_action: string | null };

const severityIcon = (severity: AlertRow['severity']) => severity === 'INFO' ? <CheckCircle2 size={18} /> : severity === 'CRITICO' ? <CircleAlert size={18} /> : <AlertTriangle size={18} />;

export default function OperationalIntelligence() {
  const { user } = useAuth();
  const [dna, setDna] = useState<DNA | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [margin, setMargin] = useState('');
  const [thickness, setThickness] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: dnaRow }, { data: projectRows }, { data: alertRows }] = await Promise.all([
      supabase.from('marcenaria_dna').select('user_id, standard_mdf_thickness_mm, back_thickness_mm, minimum_margin_pct').eq('user_id', user.id).maybeSingle(),
      supabase.from('projects').select('id,nome,name,profit_margin,external_material').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(12),
      supabase.from('operational_alerts').select('id,alert_type,severity,message,evidence,suggested_action').eq('user_id', user.id).eq('status', 'open').order('created_at', { ascending: false }).limit(30),
    ]);
    const nextDna = dnaRow as DNA | null;
    setDna(nextDna);
    setMargin(nextDna?.minimum_margin_pct?.toString() ?? '');
    setThickness(nextDna?.standard_mdf_thickness_mm?.toString() ?? '');
    setProjects((projectRows ?? []) as Project[]);
    setAlerts((alertRows ?? []) as AlertRow[]);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const saveDNA = async () => {
    if (!user) return;
    setSaving(true); setMessage(null);
    const payload = {
      user_id: user.id,
      minimum_margin_pct: margin.trim() === '' ? null : Number(margin),
      standard_mdf_thickness_mm: thickness.trim() === '' ? null : Number(thickness),
    };
    const { error } = await supabase.from('marcenaria_dna').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage('DNA atualizado. Nenhum valor comercial foi inventado.');
    await load();
  };

  const analyze = async (projectId: string) => {
    const { error } = await supabase.rpc('refresh_project_operational_alerts', { p_project_id: projectId });
    if (error) { setMessage(error.message); return; }
    setMessage('Projeto analisado com dados reais do banco.');
    await load();
  };

  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Entre na sua conta para acessar a inteligência operacional.</div>;

  return <div className="space-y-6">
    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><div className="flex items-center gap-2 text-indigo-600 font-bold text-sm"><Sparkles size={18} /> Inteligência Operacional</div><h2 className="text-2xl font-black text-slate-900 mt-1">Encontrei {alerts.filter(a => a.severity !== 'INFO').length} pontos que precisam da sua atenção.</h2><p className="text-sm text-slate-500 mt-2">As análises abaixo usam somente dados e regras configurados no Marcenapp.</p></div>
      </div>
      {message && <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">{message}</div>}
    </section>

    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4"><Settings2 size={18} className="text-indigo-600" /><h3 className="font-black text-slate-900">DNA da Marcenaria</h3></div>
      <p className="text-sm text-slate-500 mb-4">Configure somente regras que representam a sua operação. Campos vazios significam “Regra não configurada”.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-slate-700">Margem mínima (%)<input value={margin} onChange={e => setMargin(e.target.value)} type="number" min="0" step="0.1" placeholder="Regra não configurada" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
        <label className="text-sm font-semibold text-slate-700">MDF padrão externo (mm)<input value={thickness} onChange={e => setThickness(e.target.value)} type="number" min="0" step="1" placeholder="Regra não configurada" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
      </div>
      <button disabled={saving} onClick={() => void saveDNA()} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar DNA'}</button>
      {dna && <p className="text-xs text-slate-400 mt-3">Regras persistidas por usuário/empresa lógica. RLS impede acesso cruzado entre usuários.</p>}
    </section>

    <section className="space-y-3">
      {alerts.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Nenhum alerta aberto. Analise um projeto para gerar evidências.</div>}
      {alerts.map(alert => <article key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex gap-3"><div className="text-amber-500 mt-0.5">{severityIcon(alert.severity)}</div><div className="flex-1"><div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-wider text-slate-400">{alert.severity}</span><span className="text-xs text-slate-400">{alert.alert_type}</span></div><p className="font-bold text-slate-800 mt-1">{alert.message}</p>{Object.keys(alert.evidence).length > 0 && <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(alert.evidence, null, 2)}</pre>}<p className="text-sm text-slate-500 mt-3">Ação sugerida: {alert.suggested_action ?? 'Nenhuma ação configurada.'}</p></div></div></article>)}
    </section>

    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"><h3 className="font-black text-slate-900 mb-4">Projetos para análise</h3><div className="space-y-2">{projects.map(project => <div key={project.id} className="flex items-center justify-between gap-4 border border-slate-100 rounded-xl p-3"><div><p className="font-bold text-sm text-slate-800">{project.nome || project.name}</p><p className="text-xs text-slate-500">Margem cadastrada: {project.profit_margin == null ? 'não configurada' : `${project.profit_margin}%`}</p></div><button onClick={() => void analyze(project.id)} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Analisar operação</button></div>)}{projects.length === 0 && <p className="text-sm text-slate-500">Nenhum projeto disponível.</p>}</div></section>
  </div>;
}
