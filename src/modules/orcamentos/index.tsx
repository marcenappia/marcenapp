import React, { useState } from 'react';
import { Calculator, Printer, RefreshCw, Save, ArrowRight, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { Button, Card, InputGroup, Modal } from '@/components/marcenaria/shared';
import { useOrcamento } from './hooks/useOrcamento';
import type { ProjectData } from '@/modules/projetos/types';

interface Props { project: ProjectData; setProject: React.Dispatch<React.SetStateAction<ProjectData>>; navigateTo?: (id: string) => void; }
type CostField = 'salePrice' | 'materialCost' | 'hardwareCost' | 'laborCost' | 'otherCost';

const OrcamentoModule = ({ project, navigateTo }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const { budget, setBudget, calc, formatBRL, loading, saving, saved, error, save, reload } = useOrcamento(project);
  const completeProject = Boolean(project.id) && project.width > 0 && project.height > 0 && project.depth > 0;

  const field = (name: CostField, label: string, hint: string) => (
    <div>
      <InputGroup label={label} value={budget[name] ?? ''} onChange={value => setBudget(name, value)} prefix="R$" />
      <p className="mt-1 px-1 text-[11px] text-slate-400">{hint}</p>
    </div>
  );

  return (
    <>
      <div className="space-y-6 pb-20 md:pb-0">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-slate-400"><Calculator size={14} /> Financeiro do projeto</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Orçamento</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Registre o custo real e o preço de venda. O orçamento permanece vinculado ao projeto atual e não inventa valores.</p>
          </div>
          <button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 md:self-auto"><RefreshCw size={14} /> Atualizar</button>
        </header>

        {!completeProject && <Card className="border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Projeto incompleto</p><p className="mt-1 text-xs text-amber-800">Antes de fechar orçamento ou produção, o projeto precisa estar salvo com dimensões válidas.</p></Card>}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:px-6">
                <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white"><CircleDollarSign size={18} /></span><div><h2 className="text-sm font-black text-slate-900">Composição do custo</h2><p className="text-xs text-slate-500">Informe somente valores que você realmente conhece.</p></div></div>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-2 md:p-6">
                {field('materialCost', 'Materiais / MDF', 'Chapas, fitas, acabamentos e demais materiais.')}
                {field('hardwareCost', 'Ferragens', 'Corrediças, dobradiças, puxadores e acessórios.')}
                {field('laborCost', 'Mão de obra', 'Produção, montagem e instalação, conforme seu custo real.')}
                {field('otherCost', 'Outros custos', 'Frete, terceiros ou despesas diretamente ligadas à obra.')}
                <div className="sm:col-span-2">{field('salePrice', 'Preço de venda', 'Valor que será apresentado ao cliente.')}</div>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-900">Projeto usado no cálculo</h2><p className="text-xs text-slate-500">A referência vem do projeto, não de estimativas escondidas.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{project.id ? 'Persistido' : 'Não salvo'}</span></div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {[['Largura', project.width ? `${project.width} m` : '—'], ['Altura', project.height ? `${project.height} m` : '—'], ['Profundidade', project.depth ? `${project.depth} m` : '—'], ['Portas', project.doors || 0], ['Gavetas', project.drawers || 0]].map(([label,value]) => <div key={String(label)}><span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><strong className="mt-1 block text-sm text-slate-800">{value}</strong></div>)}
              </div>
            </Card>

            {error && <Card className="border-red-200 bg-red-50 p-4"><p className="text-sm font-bold text-red-700">{error}</p></Card>}
            {saved && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700"><CheckCircle2 size={16} /> Orçamento salvo no projeto.</div>}
          </div>

          <aside className="xl:sticky xl:top-20 xl:self-start">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm">
              <div className="p-5 md:p-6">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Resumo financeiro</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-white">{formatBRL(budget.salePrice)}</p>
                <div className="mt-5 space-y-3 border-t border-slate-800 pt-4 text-sm">
                  <div className="flex justify-between gap-4 text-slate-400"><span>Custo total</span><strong className="text-white">{formatBRL(calc.custoTotal)}</strong></div>
                  <div className="flex justify-between gap-4 text-slate-400"><span>Lucro</span><strong className={calc.lucro != null && calc.lucro < 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatBRL(calc.lucro)}</strong></div>
                  <div className="flex justify-between gap-4 text-slate-400"><span>Margem</span><strong className={calc.margemPct != null && calc.margemPct < 0 ? 'text-rose-400' : 'text-emerald-400'}>{calc.margemPct == null ? '—' : `${calc.margemPct.toLocaleString('pt-BR')}%`}</strong></div>
                </div>
                <button type="button" disabled={saving || !project.id || !calc.isComplete} onClick={() => void save()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><Save size={16} /> {saving ? 'Salvando…' : 'Salvar orçamento'}</button>
                <button type="button" disabled={!calc.isComplete} onClick={() => setShowModal(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"><Printer size={15} /> Gerar resumo</button>
              </div>
              {navigateTo && <button type="button" onClick={() => navigateTo('corte')} className="flex w-full items-center justify-between border-t border-slate-800 bg-slate-900 px-5 py-3.5 text-xs font-black text-white hover:bg-slate-800"><span>Continuar para o plano de corte</span><ArrowRight size={15} /></button>}
            </div>
          </aside>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Resumo do orçamento" maxWidth="max-w-md">
        <div className="space-y-4 p-5 text-slate-800">
          <div className="border-b pb-4 text-center"><Calculator size={20} className="mx-auto text-slate-700" /><h2 className="mt-1 text-lg font-black">Orçamento do projeto</h2><p className="text-xs text-slate-400">{project.id ? `Projeto ${project.id.slice(0, 8)}` : 'Projeto não salvo'}</p></div>
          <div className="space-y-2 text-sm">{[['Materiais', budget.materialCost], ['Ferragens', budget.hardwareCost], ['Mão de obra', budget.laborCost], ['Outros', budget.otherCost], ['Custo total', calc.custoTotal], ['Preço de venda', budget.salePrice], ['Lucro', calc.lucro]].map(([label,value], index) => <div key={String(label)} className={index >= 4 ? 'flex justify-between border-t pt-2 font-bold' : 'flex justify-between'}><span>{label}</span><span>{formatBRL(value as number | null)}</span></div>)}</div>
          <Button onClick={() => window.print()} className="w-full"><Printer size={16} /> Imprimir</Button>
        </div>
      </Modal>
    </>
  );
};

export default OrcamentoModule;