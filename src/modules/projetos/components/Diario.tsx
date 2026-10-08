import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Building2, Camera, FileText, Mic, WalletCards, Users,
  Ruler, PackageOpen, Scissors, Hammer, RefreshCw, TrendingUp, Clock3,
  AlertTriangle, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DiarioIntake from './DiarioIntake';
import DiarioFreeLayer from './DiarioFreeLayer';
import ProjectTechnicalImport from './ProjectTechnicalImport';
import type { ProjectBudgetDraft } from '@/core/yara/projectIngestion';

interface Props { navigateTo?: (id: string, params?: Record<string, string>) => void; }

type Project = { id: string; nome: string | null; name: string; cliente_id: string | null; status: string; updated_at: string; };
type Cost = { project_id: string; sale_price: number | null; material_cost: number | null; hardware_cost: number | null; labor_cost: number | null; other_cost: number | null; };
type Sale = { project_id: string; sale_price: number; status: string; };
type Receivable = { project_id: string; amount: number; received_at: string | null; status: string; due_at: string; };
type Stage = { id: string; stage_name: string; status: string; due_at: string | null; blocked_reason: string | null; };
type Inventory = { quantidade: number | null; };
type Material = { id: string; nome: string; preco: number | null; ativo: boolean; };

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function stageLabel(status: string) {
  const labels: Record<string, string> = { pending: 'Pendente', in_progress: 'Em andamento', completed: 'Concluída', blocked: 'Bloqueada' };
  return labels[status] ?? status;
}

function stageTone(status: string) {
  if (status === 'completed') return 'text-emerald-700 bg-emerald-50';
  if (status === 'blocked') return 'text-red-700 bg-red-50';
  if (status === 'in_progress') return 'text-indigo-700 bg-indigo-50';
  return 'text-slate-600 bg-slate-100';
}

export default function Diario({ navigateTo }: Props) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [technicalDraft, setTechnicalDraft] = useState<ProjectBudgetDraft | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [projectsResult, costsResult, salesResult, receivablesResult, materialsResult, inventoryResult] = await Promise.all([
      supabase.from('projects').select('id,nome,name,cliente_id,status,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100),
      supabase.from('project_cost_snapshots').select('project_id,sale_price,material_cost,hardware_cost,labor_cost,other_cost').eq('user_id', user.id),
      supabase.from('project_sales').select('project_id,sale_price,status').eq('user_id', user.id),
      supabase.from('project_receivables').select('project_id,amount,received_at,status,due_at').eq('user_id', user.id),
      supabase.from('marcenaria_materiais').select('id,nome,preco,ativo').eq('user_id', user.id).eq('ativo', true).order('nome').limit(500),
      supabase.from('marcenaria_estoque').select('quantidade').eq('user_id', user.id)
    ]);
    setProjects((projectsResult.data ?? []) as Project[]);
    setCosts((costsResult.data ?? []) as Cost[]);
    setSales((salesResult.data ?? []) as Sale[]);
    setReceivables((receivablesResult.data ?? []) as Receivable[]);
    setMaterials((materialsResult.data ?? []) as Material[]);
    setInventory((inventoryResult.data ?? []) as Inventory[]);
    const nextProject = (projectsResult.data ?? [])[0]?.id ?? '';
    setSelectedProject(current => current || nextProject);
    setLoading(false);
  }, [user]);

  const loadStages = useCallback(async () => {
    if (!user || !selectedProject) { setStages([]); return; }
    const { data } = await supabase.from('project_production_stages').select('id,stage_name,status,due_at,blocked_reason').eq('user_id', user.id).eq('project_id', selectedProject).order('due_at', { ascending: true });
    setStages((data ?? []) as Stage[]);
  }, [user, selectedProject]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadStages(); }, [loadStages]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadStages()]);
    setRefreshing(false);
  };

  const finance = useMemo(() => {
    const revenue = sales.reduce((sum, row) => sum + Number(row.sale_price || 0), 0);
    const cost = costs.reduce((sum, row) => sum + Number(row.material_cost || 0) + Number(row.hardware_cost || 0) + Number(row.labor_cost || 0) + Number(row.other_cost || 0), 0);
    const received = receivables.filter(row => row.received_at || row.status === 'received').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const openReceivables = receivables.filter(row => !row.received_at && row.status !== 'received').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { revenue, cost, profit: revenue - cost, received, openReceivables };
  }, [sales, costs, receivables]);

  const projectFinance = useMemo(() => {
    const cost = costs.find(row => row.project_id === selectedProject);
    const sale = sales.find(row => row.project_id === selectedProject);
    const totalCost = cost ? Number(cost.material_cost || 0) + Number(cost.hardware_cost || 0) + Number(cost.labor_cost || 0) + Number(cost.other_cost || 0) : 0;
    const salePrice = Number(sale?.sale_price ?? cost?.sale_price ?? 0);
    return { salePrice, totalCost, profit: salePrice - totalCost, margin: salePrice > 0 ? ((salePrice - totalCost) / salePrice) * 100 : null };
  }, [costs, sales, selectedProject]);

  const selected = projects.find(project => project.id === selectedProject);
  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  const blockedStages = stages.filter(stage => stage.status === 'blocked' || stage.blocked_reason).length;
  const productionProgress = stages.length ? Math.round((completedStages / stages.length) * 100) : 0;
  const stockUnits = inventory.reduce((sum, row) => sum + Number(row.quantidade || 0), 0);

  const quickActions = [
    { id: 'clientes', label: 'Clientes', detail: 'Cadastro, contato e projetos', icon: Users },
    { id: 'orcamento', label: 'Orçamento', detail: 'Custo, venda e margem', icon: Ruler },
    { id: 'corte', label: 'Plano de corte', detail: 'Peças, chapas e aproveitamento', icon: Scissors },
    { id: 'inteligencia', label: 'Financeiro', detail: 'Resultado, recebimentos e alertas', icon: WalletCards },
    { id: 'studio', label: 'Projeto / IARA', detail: 'Alterar, incluir e desenvolver', icon: PackageOpen },
    { id: 'configuracoes', label: 'Marcenaria', detail: 'Materiais, fornecedores e operação', icon: Building2 }
  ];

  return (
    <div className="min-h-full w-full px-2 py-3 sm:px-4 sm:py-5 md:px-6 md:py-7">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><BookOpen size={18} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Bancada da marcenaria</p>
              <h1 className="truncate text-lg font-black tracking-tight text-slate-950 md:text-xl">Diário do Marceneiro</h1>
              <p className="truncate text-xs text-slate-500">Um lugar para registrar o campo e operar o negócio sem sair do contexto.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => void refresh()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Atualizar
            </button>
            <button type="button" onClick={() => navigateTo?.('studio')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-black text-white hover:bg-slate-800">
              Desenvolver projeto <ArrowRight size={14} />
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button key={action.id} type="button" onClick={() => navigateTo?.(action.id)} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm md:p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700"><Icon size={17} /></span>
                <span className="mt-3 block truncate text-sm font-black text-slate-900">{action.label}</span>
                <span className="mt-1 block text-[10px] leading-4 text-slate-500">{action.detail}</span>
              </button>
            );
          })}
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ['Faturamento', finance.revenue, TrendingUp],
            ['Custos', finance.cost, Hammer],
            ['Resultado', finance.profit, WalletCards],
            ['Recebido', finance.received, CheckCircle2],
            ['A receber', finance.openReceivables, Clock3]
          ].map(([label, value, Icon]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{String(label)}</span>{React.createElement(Icon as React.ComponentType<{size?: number}>, { size: 15, className: 'text-slate-400' })}</div>
              <strong className="mt-2 block truncate text-base font-black text-slate-900">{money(Number(value))}</strong>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.45fr_.9fr]">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Operação ativa</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">Andamento das obras</h2>
              </div>
              <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} disabled={loading || !projects.length} className="min-h-10 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                {projects.length ? projects.map(project => <option key={project.id} value={project.id}>{project.nome || project.name}</option>) : <option>Sem projetos</option>}
              </select>
            </div>

            {selected ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{selected.status}</span>
                  <button type="button" onClick={() => navigateTo?.('novo', { projeto: selected.id })} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><FileText size={12} /> Editar projeto</button>
                  <button type="button" onClick={() => navigateTo?.('studio', { projeto: selected.id })} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"><PackageOpen size={12} /> Abrir IARA</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold text-slate-500">Venda</span><strong className="mt-1 block text-sm">{money(projectFinance.salePrice)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold text-slate-500">Custo registrado</span><strong className="mt-1 block text-sm">{money(projectFinance.totalCost)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold text-slate-500">Margem</span><strong className="mt-1 block text-sm">{projectFinance.margin == null ? '—' : projectFinance.margin.toFixed(1) + '%'}</strong></div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-700">Produção {productionProgress}%</span><span className="text-[11px] text-slate-500">{completedStages}/{stages.length || 0} etapas concluídas</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: productionProgress + '%' }} /></div>
                <div className="mt-4 space-y-2">
                  {stages.length ? stages.slice(0, 6).map(stage => (
                    <div key={stage.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                      <span className={'inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-black ' + stageTone(stage.status)}>{stageLabel(stage.status)}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{stage.stage_name}</span>
                      {stage.due_at && <span className="shrink-0 text-[10px] text-slate-500">{new Date(stage.due_at).toLocaleDateString('pt-BR')}</span>}
                      {(stage.blocked_reason || stage.status === 'blocked') && <AlertTriangle size={14} className="shrink-0 text-red-500" />}
                    </div>
                  )) : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Ainda não há etapas de produção registradas para este projeto.</p>}
                </div>
                {blockedStages > 0 && <p className="mt-3 text-xs font-bold text-red-600">{blockedStages} etapa(s) precisam de atenção.</p>}
              </>
            ) : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Crie ou selecione um projeto para acompanhar a operação aqui.</p>}
          </div>

          <div className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Base da marcenaria</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">Materiais, estoque e fornecedores</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{materials.length}</strong><span className="text-[10px] font-bold text-slate-500">materiais</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{stockUnits.toLocaleString('pt-BR')}</strong><span className="text-[10px] font-bold text-slate-500">un. estoque</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{projects.length}</strong><span className="text-[10px] font-bold text-slate-500">projetos</span></div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">O Diário usa as mesmas bases da Marcenaria. Não cria uma segunda lista de materiais ou clientes.</p>
              <button type="button" onClick={() => navigateTo?.('configuracoes')} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-indigo-700">Abrir Minha Marcenaria <ArrowRight size={13} /></button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm md:p-5">
              <div className="flex items-center gap-2"><WalletCards size={17} /><span className="text-xs font-black uppercase tracking-wider">Decisão financeira</span></div>
              <p className="mt-2 text-sm font-bold">O Diário já mostra o que entrou, o que falta receber e o resultado registrado dos projetos.</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">Para análise detalhada de margem, custos, ferragens, recebimentos e alertas, abra a Inteligência Operacional.</p>
              <button type="button" onClick={() => navigateTo?.('inteligencia')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-black text-slate-950">Abrir financeiro e inteligência <ArrowRight size={13} /></button>
            </section>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <ProjectTechnicalImport projectId={selectedProject || undefined} onDraft={(draft) => setTechnicalDraft(draft)} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">YARA • orçamento técnico</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Do projeto do arquiteto para o orçamento</h2>
            {technicalDraft ? (
              <>
                <p className="mt-2 text-xs text-slate-600">{technicalDraft.items.length} item(ns) identificados. Status: <strong>{technicalDraft.status === 'ready_for_pricing' ? 'pronto para precificação' : 'precisa de confirmação'}</strong>.</p>
                {technicalDraft.missingInformation.length > 0 && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><strong>Falta confirmar:</strong><ul className="mt-1 list-disc pl-4">{technicalDraft.missingInformation.slice(0, 6).map(item => <li key={item}>{item}</li>)}</ul></div>}
                <button type="button" onClick={() => navigateTo?.('orcamento')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-black text-white">Continuar no orçamento <ArrowRight size={13} /></button>
              </>
            ) : <p className="mt-2 text-xs leading-5 text-slate-600">A YARA analisa o conjunto recebido e cria um rascunho com evidências e pendências. O marceneiro valida antes de transformar em preço.</p>}
          </div>
        </section>

        <DiarioFreeLayer navigateTo={navigateTo} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 md:px-5">
            <p className="text-sm font-black text-slate-900">Caderno da obra</p>
            <p className="mt-0.5 text-xs text-slate-500">Registre cliente, obra, fotos, voz, medidas e decisões. Depois transforme isso em trabalho dentro do projeto.</p>
          </div>
          <div className="p-2 sm:p-3 md:p-5"><DiarioIntake navigateTo={navigateTo} /></div>
        </section>
      </div>
    </div>
  );
}
