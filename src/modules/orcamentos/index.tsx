import React, { useState } from 'react';
import { Package, Palette, Printer, Calculator, Sliders, Ruler, Factory, Settings2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button, Card, Modal, InputGroup, SelectGroup } from '@/components/marcenaria/shared';
import { useOrcamento } from './hooks/useOrcamento';
import type { ProjectData } from '@/modules/projetos/types';

interface Props {
  project: ProjectData;
  setProject: (project: ProjectData) => void;
}

const MATERIALS = [
  { value: 'mdf15_white', label: 'MDF Branco 15mm' },
  { value: 'mdf18_white', label: 'MDF Branco 18mm' },
  { value: 'mdf18_wood', label: 'MDF Madeirado 18mm' },
];

const BACK_MATERIALS = [{ value: 'mdf6_white', label: 'MDF Branco 6mm' }];

const OrcamentoModule = ({ project, setProject, setParts, navigateTo }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [aprovado, setAprovado] = useState(project?.jornada?.statusAprovacao === 'aprovado' || project?.jornada?.orcamentoAprovado === true);
  const [aprovando, setAprovando] = useState(false);
  const [gerandoProducao, setGerandoProducao] = useState(false);
  const { user } = useAuth();
  const { calc, prices, updatePrice, resetPrices, formatBRL } = useOrcamento(project);
  const externalPrices = prices[project.externalMaterial] ?? prices.mdf18_white;

  const aprovarOrcamento = async () => {
    if (!project?.id || !user || calc.total <= 0) return;
    setAprovando(true);
    try {
      const { data } = await supabase.from('projects').select('jornada').eq('id', project.id).eq('user_id', user.id).maybeSingle();
      if (!data) throw new Error('Obra não encontrada.');
      const jornada = (data.jornada ?? {}) as Record<string, unknown>;
      const nextJornada = { ...jornada, etapa: 7, statusAprovacao: 'aprovado', orcamentoAprovado: true, valorAprovado: calc.total, orcamentoAprovadoEm: new Date().toISOString() };
      const { error } = await supabase.from('projects').update({ jornada: nextJornada as any }).eq('id', project.id).eq('user_id', user.id);
      if (error) throw error;
      setProject({ ...project, jornada: nextJornada });
      setAprovado(true);
    } catch (e: any) {
      window.alert(e?.message || 'Não foi possível registrar a aprovação do orçamento.');
    } finally { setAprovando(false); }
  };

  const sendToProduction = async () => {
    if (!aprovado || !project?.id || !user || calc.total <= 0) return;
    setGerandoProducao(true);
    try {
      const { data } = await supabase.from('projects').select('jornada').eq('id', project.id).eq('user_id', user.id).maybeSingle();
      if (!data) throw new Error('Obra não encontrada.');
      const jornada = (data.jornada ?? {}) as Record<string, unknown>;
      const generatedAt = new Date().toISOString();
      const productionParts = calc.parts.map((part, index) => ({ ...part, id: Date.now() + index }));
      const production = { status: 'liberada', updatedAt: generatedAt, generatedAt, source: 'orcamento-aprovado', approvedTotal: calc.total, approvedAt: jornada.orcamentoAprovadoEm ?? generatedAt, parts: productionParts };
      const nextJornada = { ...jornada, etapa: 8, production };
      const { error } = await supabase.from('projects').update({ jornada: nextJornada as any }).eq('id', project.id).eq('user_id', user.id);
      if (error) throw error;
      setParts?.(productionParts);
      setProject({ ...project, jornada: nextJornada });
      navigateTo?.('producao');
    } catch (e: any) {
      window.alert(e?.message || 'Não foi possível liberar a produção.');
    } finally { setGerandoProducao(false); }
  };

  const updateNumber = (field: string, value: unknown) => setProject({ ...project, [field]: Number(value) });

  const volumeM3 = ((Number(project.width) || 0) * (Number(project.height) || 0) * (Number(project.depth) || 0)).toFixed(2);
  const projectId = project?.id ? String(project.id).slice(-6).toUpperCase() : 'NOVO';

  return (
    <>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Projeto</p>
          <p className="mt-3 text-lg font-black text-slate-900">#{projectId}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Volume</p>
          <p className="mt-3 text-lg font-black text-slate-900">{volumeM3} m³</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Materiais</p>
          <p className="mt-3 text-lg font-black text-slate-900">{formatBRL(calc.mat)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Lucro</p>
          <p className="mt-3 text-lg font-black text-emerald-600">{formatBRL(calc.profit)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Package size={20} className="text-indigo-500" /> Estela — Inteligência Financeira
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputGroup label="Largura (m)" value={project.width} onChange={v => setProject({ ...project, width: Number(v) })} suffix="m" />
              <InputGroup label="Altura (m)" value={project.height} onChange={v => setProject({ ...project, height: Number(v) })} suffix="m" />
              <InputGroup label="Prof. (m)" value={project.depth} onChange={v => setProject({ ...project, depth: Number(v) })} suffix="m" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <InputGroup label="Gavetas" value={project.drawers} onChange={v => setProject({ ...project, drawers: Number(v) })} />
              <InputGroup label="Portas" value={project.doors} onChange={v => setProject({ ...project, doors: Number(v) })} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Palette size={20} className="text-pink-500" /> Acabamentos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectGroup
                label="Material Externo"
                value={project.externalMaterial}
                onChange={v => setProject({ ...project, externalMaterial: v })}
                options={[{ value: 'mdf18_white', label: 'MDF Branco 18mm' }, { value: 'mdf18_wood', label: 'MDF Madeirado 18mm' }]}
              />
              <SelectGroup
                label="Puxadores"
                value={project.handleType}
                onChange={v => setProject({ ...project, handleType: v })}
                options={[{ value: 'external', label: 'Externo' }, { value: 'cava', label: 'Cava / Fecho Toque' }]}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Sliders size={20} className="text-emerald-500" /> Margens
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputGroup label="Mão de Obra (%)" value={project.laborRate} onChange={v => setProject({ ...project, laborRate: Number(v) })} suffix="%" />
              <InputGroup label="Margem de Lucro (%)" value={project.profitMargin} onChange={v => setProject({ ...project, profitMargin: Number(v) })} suffix="%" />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-indigo-500" /> Resumo do projeto
            </h3>
            <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Dimensões</span>
                <span className="mt-2 block text-base font-bold text-slate-900">{project.width} × {project.height} × {project.depth} m</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Estrutura</span>
                <span className="mt-2 block text-base font-bold text-slate-900">{project.doors} portas / {project.drawers} gavetas</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Material</span>
                <span className="mt-2 block text-base font-bold text-slate-900">{project.externalMaterial === 'mdf18_white' ? 'MDF Branco' : 'MDF Madeirado'}</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Aproveitamento</span>
                <span className="mt-2 block text-base font-bold text-slate-900">{calc.sheetsInt + calc.sheetsExt + calc.sheetsBack} chapas estimadas</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-700 sticky top-20" style={{backgroundColor: '#0f172a', color: '#f8fafc'}}>
            <div className="p-6">
              <span style={{color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em'}}>Valor Final</span>
              <div style={{fontSize: '2.2rem', fontWeight: 700, marginBottom: '1rem', marginTop: '0.5rem', color: '#fff'}}>{formatBRL(calc.total)}</div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#cbd5e1'}}>
                <div style={{background: '#111827', borderRadius: '0.75rem', padding: '0.6rem'}}>
                  <div style={{color: '#94a3b8'}}>M³</div>
                  <div style={{color: '#fff', fontWeight: 700, marginTop: '0.2rem'}}>{((Number(project.width) || 0) * (Number(project.height) || 0) * (Number(project.depth) || 0)).toFixed(2)}</div>
                </div>
                <div style={{background: '#111827', borderRadius: '0.75rem', padding: '0.6rem'}}>
                  <div style={{color: '#94a3b8'}}>Chapas</div>
                  <div style={{color: '#fff', fontWeight: 700, marginTop: '0.2rem'}}>{calc.sheetsInt + calc.sheetsExt + calc.sheetsBack}</div>
                </div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#cbd5e1'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem'}}>
                  <span>Materiais</span><span style={{color: '#fff', fontWeight: 600}}>{formatBRL(calc.mat)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem'}}>
                  <span>Mão de Obra</span><span style={{color: '#fff', fontWeight: 600}}>{formatBRL(calc.labor)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem'}}>
                  <span style={{color: '#34d399'}}>Lucro</span><span style={{color: '#34d399', fontWeight: 700}}>{formatBRL(calc.profit)}</span>
                </div>
                <div style={{paddingTop: '0.75rem', borderTop: '1px solid #334155', fontSize: '0.75rem', color: '#64748b'}}>
                  <p>Chapas internas: {calc.sheetsInt} un.</p>
                  <p>Chapas externas: {calc.sheetsExt} un.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(true)} style={{width:'100%', marginTop:'1.5rem', padding:'0.6rem', background:'#4f46e5', color:'#fff', borderRadius:'0.75rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', border:'none'}}>
                <Printer size={16}/> Gerar Resumo
              </button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1"><div className="rounded-2xl overflow-hidden shadow-sm border border-slate-700 sticky top-20" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}><div className="p-6"><span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preço de venda</span><div style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.25rem', marginTop: '0.5rem', color: '#fff' }}>{formatBRL(calc.total)}</div>{calc.discount > 0 && <div className="text-xs text-slate-400 mb-4">De {formatBRL(calc.grossTotal)} • desconto de {formatBRL(calc.discount)}</div>}<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#cbd5e1' }}><div className="flex justify-between border-b border-slate-700 pb-2"><span>Chapas e materiais</span><span className="font-semibold text-white">{formatBRL(calc.materialCost)}</span></div>{calc.sheetSavings > 0 && <div className="flex justify-between border-b border-slate-700 pb-2"><span className="text-emerald-300">Economia de sobras</span><span className="font-semibold text-emerald-300">− {formatBRL(calc.sheetSavings)}</span></div>}<div className="flex justify-between border-b border-slate-700 pb-2"><span>Fita de borda</span><span className="font-semibold text-white">{formatBRL(calc.edgeCost)}</span></div><div className="flex justify-between border-b border-slate-700 pb-2"><span>Ferragens</span><span className="font-semibold text-white">{formatBRL(calc.hardwareCost)}</span></div><div className="flex justify-between border-b border-slate-700 pb-2"><span>Mão de obra</span><span className="font-semibold text-white">{formatBRL(calc.laborCost)}</span></div><div className="flex justify-between border-b border-slate-700 pb-2"><span>Instalação</span><span className="font-semibold text-white">{formatBRL(calc.installationCost)}</span></div><div className="flex justify-between border-b border-slate-700 pb-2"><span>Custos indiretos</span><span className="font-semibold text-white">{formatBRL(calc.overheadCost)}</span></div><div className="flex justify-between pt-1"><span className="text-emerald-300">Lucro</span><span className="font-bold text-emerald-300">{formatBRL(calc.profit)}</span></div>{calc.discount > 0 && <div className="flex justify-between pt-1 text-amber-300"><span>Desconto</span><span className="font-semibold">− {formatBRL(calc.discount)}</span></div>}<div className="pt-2 text-xs text-slate-400"><p>Chapas internas: {calc.internalSheets} un.</p><p>Chapas externas: {calc.externalSheets} un.</p><p>Fundos: {calc.backSheets} un.</p><p>Perda considerada: {(calc.wasteRate * 100).toFixed(0)}%</p></div></div><div className="mt-6 grid grid-cols-1 gap-2"><button onClick={aprovarOrcamento} disabled={aprovado || aprovando} className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-2.5 font-semibold text-emerald-100 flex items-center justify-center gap-2 disabled:opacity-60"><CheckCircle2 size={16} /> {aprovado ? 'Orçamento aprovado' : aprovando ? 'Registrando aprovação…' : 'Cliente aprovou o orçamento'}</button><button onClick={sendToProduction} disabled={!aprovado || gerandoProducao} className="w-full rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3 py-2.5 font-semibold text-indigo-100 flex items-center justify-center gap-2 disabled:opacity-40"><Factory size={16} /> {gerandoProducao ? 'Liberando produção…' : aprovado ? 'Gerar produção' : 'Aprove o orçamento para produzir'}</button><button onClick={() => setShowModal(true)} className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 font-semibold text-white flex items-center justify-center gap-2"><Printer size={16} /> Ver resumo</button></div></div></div></div>
      </div>
      <Modal isOpen={showPrices} onClose={() => setShowPrices(false)} title="Tabela de preços" maxWidth="max-w-2xl" footer={<><button onClick={resetPrices} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"><RotateCcw size={15} /> Restaurar padrão</button><Button onClick={() => setShowPrices(false)}>Concluir</Button></>}><div className="space-y-5"><p className="text-sm text-slate-500">Ajuste os custos reais da sua marcenaria. O orçamento recalcula na hora.</p><div className="space-y-3">{MATERIALS.map(material => { const p = prices[material.value]; return <div key={material.value} className="rounded-xl border border-slate-200 p-4"><strong className="text-sm text-slate-700">{material.label}</strong><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3"><InputGroup label="Chapa (R$)" value={p.sheet} onChange={v => updatePrice(material.value, 'sheet', Number(v))} /><InputGroup label="Fita de borda (R$/m)" value={p.edgePerMeter} onChange={v => updatePrice(material.value, 'edgePerMeter', Number(v))} /></div></div>; })}</div><div className="rounded-xl border border-slate-200 p-4"><strong className="text-sm text-slate-700">Ferragens e taxas — material externo selecionado</strong><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3"><InputGroup label="Corrediça" value={externalPrices.slide} onChange={v => updatePrice(project.externalMaterial, 'slide', Number(v))} /><InputGroup label="Dobradiça" value={externalPrices.hinge} onChange={v => updatePrice(project.externalMaterial, 'hinge', Number(v))} /><InputGroup label="Puxador" value={externalPrices.externalHandle} onChange={v => updatePrice(project.externalMaterial, 'externalHandle', Number(v))} /><InputGroup label="Instalação" value={(externalPrices.installationRate * 100).toFixed(1)} onChange={v => updatePrice(project.externalMaterial, 'installationRate', Number(v) / 100)} suffix="%" /><InputGroup label="Perda" value={(externalPrices.wasteRate * 100).toFixed(1)} onChange={v => updatePrice(project.externalMaterial, 'wasteRate', Number(v) / 100)} suffix="%" /><InputGroup label="Indiretos" value={(externalPrices.overheadRate * 100).toFixed(1)} onChange={v => updatePrice(project.externalMaterial, 'overheadRate', Number(v) / 100)} suffix="%" /></div></div></div></Modal>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Resumo do Orçamento" maxWidth="max-w-md"><div className="bg-white p-6 rounded text-slate-800 space-y-4"><div className="text-center border-b pb-4"><div className="flex items-center justify-center gap-2 mb-1"><Calculator size={20} className="text-indigo-600" /><h2 className="text-xl font-bold">Orçamento</h2></div><p className="text-slate-400 text-sm">Projeto de marcenaria</p></div><div className="space-y-2 text-sm"><p><strong>Dimensões:</strong> {project.width} × {project.height} × {project.depth} m</p><p><strong>Estrutura:</strong> {project.doors} portas, {project.drawers} gavetas</p><div className="border-t border-dashed pt-3 mt-3 space-y-1"><p className="flex justify-between"><span>Materiais</span><span>{formatBRL(calc.materialCost)}</span></p>{calc.sheetSavings > 0 && <p className="flex justify-between text-emerald-600"><span>Economia de sobras</span><span>− {formatBRL(calc.sheetSavings)}</span></p>}<p className="flex justify-between"><span>Fita de borda</span><span>{formatBRL(calc.edgeCost)}</span></p><p className="flex justify-between"><span>Ferragens</span><span>{formatBRL(calc.hardwareCost)}</span></p><p className="flex justify-between"><span>Mão de obra</span><span>{formatBRL(calc.laborCost)}</span></p><p className="flex justify-between"><span>Instalação</span><span>{formatBRL(calc.installationCost)}</span></p><p className="flex justify-between"><span>Indiretos</span><span>{formatBRL(calc.overheadCost)}</span></p>{calc.discount > 0 && <p className="flex justify-between text-amber-600"><span>Desconto</span><span>− {formatBRL(calc.discount)}</span></p>}<p className="flex justify-between text-lg font-black border-t pt-2"><span>Total</span><span>{formatBRL(calc.total)}</span></p></div></div></div></Modal>
    </>
  );
};

export default OrcamentoModule;
