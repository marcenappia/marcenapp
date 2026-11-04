import React, { useState } from 'react';
import { Printer, Calculator, Save, RefreshCw, Sparkles, ClipboardCheck } from 'lucide-react';
import { Button, Card, InputGroup, Modal } from '@/components/marcenaria/shared';
import { useOrcamento } from './hooks/useOrcamento';
import type { ProjectData } from '@/modules/projetos/types';
import { buildTechnicalStructure } from '@/core/projectTechnicalModel';
import ProjectTechnicalImport from '@/modules/projetos/components/ProjectTechnicalImport';
import type { ProjectBudgetDraft } from '@/core/yara/projectIngestion';

interface Props {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

type CostField = 'salePrice' | 'materialCost' | 'hardwareCost' | 'laborCost' | 'otherCost';

const OrcamentoModule = ({ project }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'manual' | 'ia'>('manual');
  const [draft, setDraft] = useState<ProjectBudgetDraft | null>(null);
  const { budget, setBudget, calc, formatBRL, loading, saving, saved, error, save, reload } = useOrcamento(project);
  const technical = React.useMemo(() => buildTechnicalStructure(project), [project]);
  const materialAreas = React.useMemo(() => technical.parts.reduce<Record<string, number>>((acc, part) => {
    const key = part.material || 'Material não definido';
    acc[key] = (acc[key] || 0) + (part.widthMm * part.heightMm * part.quantity) / 1_000_000;
    return acc;
  }, {}), [technical.parts]);

  const field = (name: CostField, label: string) => (
    <InputGroup label={label} value={budget[name] ?? ''} onChange={value => setBudget(name, value)} prefix="R$" />
  );

  return (
    <>
      <Card className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-600">Duas formas de orçar</p><h2 className="mt-1 text-lg font-black text-slate-900">Escolha como começar este orçamento</h2><p className="mt-1 text-xs text-slate-500">A YARA organiza evidências e pendências. O modo manual confirma os valores reais antes de salvar.</p></div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:min-w-[270px]">
            <button type="button" onClick={() => setMode('ia')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${mode === 'ia' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Sparkles size={15} /> Com YARA</button>
            <button type="button" onClick={() => setMode('manual')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${mode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><ClipboardCheck size={15} /> Manual</button>
          </div>
        </div>
      </Card>

      {mode === 'ia' ? <div className="space-y-6 pb-20 md:pb-0">
        <ProjectTechnicalImport projectId={project.id} onDraft={setDraft} />
        {draft && <Card className="p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><ClipboardCheck size={18} /></span><div><h3 className="font-black text-slate-900">Rascunho recebido pela YARA</h3><p className="mt-1 text-xs text-slate-500">Este resultado ainda não é preço final. Confirme os itens e informe os valores no modo Manual.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-bold uppercase text-slate-400">Itens</span><strong className="text-lg text-slate-900">{draft.items.length}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-bold uppercase text-slate-400">Pendências</span><strong className="text-lg text-amber-700">{draft.missingInformation.length}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-bold uppercase text-slate-400">Premissas</span><strong className="text-lg text-slate-900">{draft.assumptions.length}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-bold uppercase text-slate-400">Status</span><strong className="text-sm text-indigo-700">{draft.status === 'ready_for_pricing' ? 'Pronto para precificar' : 'Revisar'}</strong></div></div><div className="mt-5 space-y-2">{draft.items.slice(0, 12).map((item, index) => <div key={`${item.description}-${index}`} className="rounded-xl border border-slate-200 p-3 text-sm"><div className="flex items-start justify-between gap-3"><span className="font-bold text-slate-800">{item.description || `Item ${index + 1}`}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.needsConfirmation ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.needsConfirmation ? 'Confirmar' : 'Evidenciado'}</span></div><p className="mt-1 text-xs text-slate-500">{item.quantity || 0} {item.unit || 'un.'}{item.material ? ` • ${item.material}` : ''}{item.confidence != null ? ` • confiança ${Math.round(item.confidence * 100)}%` : ''}</p></div>)}</div><button type="button" onClick={() => setMode('manual')} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">Continuar no orçamento manual</button></Card>}
      </div> :
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">01</span> Orçamento
            </h3>
            <p className="text-sm text-slate-500 mb-5">Aqui entram somente custos e preço de venda reais. O Marcenapp não inventa preço de MDF, ferragens ou mão de obra.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('salePrice', 'Preço de venda')}
              {field('materialCost', 'Materiais / MDF')}
              {field('hardwareCost', 'Ferragens')}
              {field('laborCost', 'Mão de obra')}
              {field('otherCost', 'Outros custos')}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">02</span> Base técnica do orçamento</h3>
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Estrutura inicial calculada a partir dos dados confirmados do projeto. Ela é <strong>inferida</strong> e precisa ser confirmada antes de virar orçamento de produção.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-5">
              <div><span className="text-slate-400 block">Peças</span><strong>{technical.parts.reduce((sum, part) => sum + part.quantity, 0)}</strong></div>
              <div><span className="text-slate-400 block">Tipos</span><strong>{technical.parts.length}</strong></div>
              <div><span className="text-slate-400 block">Área calculada</span><strong>{Object.values(materialAreas).reduce((sum, area) => sum + area, 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²</strong></div>
              <div><span className="text-slate-400 block">Status</span><strong>{technical.status === 'confirmed' ? 'Confirmada' : 'Confirmar'}</strong></div>
            </div>
            <div className="space-y-2">
              {Object.entries(materialAreas).map(([material, area]) => (
                <div key={material} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{material}</span><strong>{area.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">03</span> Dados do projeto</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <div><span className="text-slate-400 block">Largura</span><strong>{project.width} mm</strong></div>
              <div><span className="text-slate-400 block">Altura</span><strong>{project.height} mm</strong></div>
              <div><span className="text-slate-400 block">Prof.</span><strong>{project.depth} mm</strong></div>
              <div><span className="text-slate-400 block">Portas</span><strong>{project.doors}</strong></div>
              <div><span className="text-slate-400 block">Gavetas</span><strong>{project.drawers}</strong></div>
            </div>
          </Card>

          {error && <Card className="p-4 border-red-200 bg-red-50"><p className="text-sm font-semibold text-red-700">{error}</p></Card>}
          {saved && <Card className="p-4 border-emerald-200 bg-emerald-50"><p className="text-sm font-semibold text-emerald-700">Orçamento real salvo e disponível para a IARA.</p></Card>}
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-700 sticky top-20" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <div className="p-6">
              <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preço de Venda Real</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '1rem', marginTop: '0.5rem', color: '#fff' }}>{formatBRL(budget.salePrice)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Custo total</span><span style={{ color: '#fff', fontWeight: 600 }}>{formatBRL(calc.custoTotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Lucro real</span><span style={{ color: '#34d399', fontWeight: 700 }}>{formatBRL(calc.lucro)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Margem real</span><span style={{ color: '#34d399', fontWeight: 700 }}>{calc.margemPct == null ? '—' : `${calc.margemPct.toLocaleString('pt-BR')}%`}</span></div>
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #334155', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {loading ? 'Carregando orçamento...' : budget.updatedAt ? `Atualizado em ${new Date(budget.updatedAt).toLocaleString('pt-BR')}` : 'Ainda não existe orçamento real salvo para este projeto.'}
                </div>
              </div>
              <button disabled={saving || !project.id} onClick={() => void save()} style={{ width: '100%', marginTop: '1.5rem', padding: '0.7rem', background: saving ? '#64748b' : '#4f46e5', color: '#fff', borderRadius: '0.75rem', fontWeight: 600, cursor: saving || !project.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none' }}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar orçamento real'}</button>
              <button disabled={loading} onClick={() => void reload()} style={{ width: '100%', marginTop: '0.6rem', padding: '0.55rem', background: 'transparent', color: '#cbd5e1', borderRadius: '0.75rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid #334155' }}><RefreshCw size={15} /> Atualizar</button>
              <button disabled={!calc.isComplete} onClick={() => setShowModal(true)} style={{ width: '100%', marginTop: '0.6rem', padding: '0.6rem', background: calc.isComplete ? '#1e293b' : '#0f172a', color: calc.isComplete ? '#fff' : '#64748b', borderRadius: '0.75rem', fontWeight: 600, cursor: calc.isComplete ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid #334155' }}><Printer size={16} /> Gerar Resumo</button>
            </div>
          </div>
        </div>
      </div>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Resumo do Orçamento Real" maxWidth="max-w-md">
        <div className="bg-white p-6 rounded text-slate-800 space-y-4">
          <div className="text-center border-b pb-4"><div className="flex items-center justify-center gap-2 mb-1"><Calculator size={20} className="text-indigo-600" /><h2 className="text-xl font-bold">Orçamento</h2></div><p className="text-slate-400 text-sm">Projeto {project.id ? project.id.slice(0, 8) : 'não salvo'}</p></div>
          <div className="space-y-2 text-sm"><p><strong>Dimensões:</strong> {project.width} × {project.height} × {project.depth} mm</p><p><strong>Estrutura:</strong> {project.doors} portas, {project.drawers} gavetas</p><div className="border-t border-dashed pt-3 mt-3 space-y-1"><p className="flex justify-between"><span>Materiais:</span><span>{formatBRL(budget.materialCost)}</span></p><p className="flex justify-between"><span>Ferragens:</span><span>{formatBRL(budget.hardwareCost)}</span></p><p className="flex justify-between"><span>Mão de Obra:</span><span>{formatBRL(budget.laborCost)}</span></p><p className="flex justify-between"><span>Outros:</span><span>{formatBRL(budget.otherCost)}</span></p><p className="flex justify-between font-bold"><span>Custo total:</span><span>{formatBRL(calc.custoTotal)}</span></p><p className="flex justify-between text-lg font-bold mt-2 border-t pt-2"><span>Preço de venda:</span><span>{formatBRL(budget.salePrice)}</span></p><p className="flex justify-between text-emerald-600 font-bold"><span>Lucro:</span><span>{formatBRL(calc.lucro)}</span></p><p className="flex justify-between text-emerald-600"><span>Margem:</span><span>{calc.margemPct == null ? '—' : `${calc.margemPct.toLocaleString('pt-BR')}%`}</span></p></div></div>
          <Button onClick={() => window.print()} className="w-full"><Printer size={16} /> Imprimir</Button>
        </div>
      </Modal>
    </>
  );
};

export default OrcamentoModule;
