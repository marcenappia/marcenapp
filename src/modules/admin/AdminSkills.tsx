import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDollarSign, ExternalLink, Loader2, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAgentSkills, type AgentSkill } from '@/services/agentSkills';

const statusLabel: Record<AgentSkill['status'], string> = { active: 'Ativo', disabled: 'Desativado', review: 'Em revisão', conflict: 'Conflito' };
const costLabel: Record<AgentSkill['cost_class'], string> = { none: 'Sem cobrança direta', local: 'Execução local', external_usage: 'Uso externo', paid_service: 'Serviço pago' };

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'red' | 'indigo' | 'slate' }) {
  const tones = { green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', indigo: 'bg-indigo-50 text-indigo-700', slate: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export default function AdminSkills() {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAgentSkills().then((rows) => { if (active) setSkills(rows); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar o registro de skills.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => ({
    total: skills.length,
    marcenapp: skills.filter((skill) => skill.source === 'marcenapp').length,
    official: skills.filter((skill) => skill.source === 'official').length,
    conflicts: skills.filter((skill) => skill.status === 'conflict').length,
    paid: skills.filter((skill) => skill.cost_class === 'paid_service' || skill.cost_class === 'external_usage').length,
  }), [skills]);

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/admin" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={14} /> Voltar ao Admin</Link>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-indigo-600"><Sparkles size={15} /> Governança de Skills</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Skills dos agentes</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Registro central para acompanhar skills próprios do MARCENAPP, skills oficiais, conflitos, prioridade e possíveis custos externos.</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Total</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.total}</p></div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs font-semibold text-indigo-600">MARCENAPP</p><p className="mt-2 text-2xl font-black text-indigo-900">{stats.marcenapp}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Oficiais</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.official}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Conflitos</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.conflicts}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Uso externo/pago</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.paid}</p></div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2.5"><ShieldCheck size={19} className="text-indigo-600" /></div><div><h2 className="font-black text-slate-900">Regra de precedência</h2><p className="mt-1 text-sm leading-relaxed text-slate-500">Skills próprios do MARCENAPP têm prioridade sobre skills externos quando houver sobreposição de domínio. Skills externos ficam como suporte técnico e não podem alterar regras de negócio ou o padrão visual aprovado.</p></div></div>
      </section>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 flex items-center gap-2"><Loader2 size={17} className="animate-spin" /> Carregando registro…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={17} /> {error}</div>}

      {!loading && !error && <section className="space-y-3">
        {skills.map((skill) => <article key={skill.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-900">{skill.name}</h2><Pill tone={skill.source === 'marcenapp' ? 'indigo' : 'slate'}>{skill.source === 'marcenapp' ? 'MARCENAPP' : 'Oficial'}</Pill><Pill tone={skill.status === 'active' ? 'green' : skill.status === 'conflict' ? 'red' : 'amber'}>{skill.status === 'active' ? <CheckCircle2 size={12} className="mr-1" /> : null}{statusLabel[skill.status]}</Pill></div>
              <p className="mt-1 text-xs font-mono text-slate-400">{skill.slug} · prioridade {skill.priority}</p>
            </div>
            <Pill tone={skill.cost_class === 'none' || skill.cost_class === 'local' ? 'green' : 'amber'}><CircleDollarSign size={12} className="mr-1" />{costLabel[skill.cost_class]}</Pill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Categoria</p><p className="mt-1 text-sm font-semibold text-slate-700">{skill.category}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Conflitos</p><p className="mt-1 text-sm font-semibold text-slate-700">{skill.conflict_domains.join(', ') || 'Nenhum declarado'}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fornecedor</p><p className="mt-1 text-sm font-semibold text-slate-700">{skill.provider || 'MARCENAPP'}</p></div>
          </div>
          {skill.estimated_cost_note && <p className="mt-3 text-xs leading-relaxed text-slate-500">{skill.estimated_cost_note}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {skill.source_url && <a href={skill.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-700"><ExternalLink size={13} /> Fonte</a>}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500"><Wrench size={13} /> {skill.version || 'versão rastreada'}</span>
          </div>
        </article>)}
      </section>}
    </div>
  </main>;
}
