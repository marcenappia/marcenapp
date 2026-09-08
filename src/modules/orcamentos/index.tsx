import React, { useState } from 'react';
import { Package, Palette, Printer, Calculator, Sliders } from 'lucide-react';
import { Button, Card, Modal, InputGroup, SelectGroup } from '@/components/marcenaria/shared';
import { useOrcamento } from './hooks/useOrcamento';
import type { ProjectData } from '@/modules/projetos/types';

interface Props {
  project: ProjectData;
  setProject: (project: ProjectData) => void;
}

const OrcamentoModule = ({ project, setProject }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const { calc, formatBRL } = useOrcamento(project);

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
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Resumo do Orçamento" maxWidth="max-w-md">
        <div className="bg-white p-6 rounded text-slate-800 space-y-4">
          <div className="text-center border-b pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calculator size={20} className="text-indigo-600" />
              <h2 className="text-xl font-bold">Orçamento</h2>
            </div>
            <p className="text-slate-400 text-sm">#Ref-{Date.now().toString().slice(-4)}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Dimensões:</strong> {project.width}x{project.height}x{project.depth}m</p>
            <p><strong>Estrutura:</strong> {project.doors} Portas, {project.drawers} Gavetas</p>
            <p><strong>Material externo:</strong> {project.externalMaterial === 'mdf18_white' ? 'MDF Branco' : 'MDF Madeirado'}</p>
            <div className="border-t border-dashed pt-3 mt-3 space-y-1">
              <p className="flex justify-between"><span>Materiais:</span><span>{formatBRL(calc.mat)}</span></p>
              <p className="flex justify-between"><span>Mão de Obra:</span><span>{formatBRL(calc.labor)}</span></p>
              <p className="flex justify-between text-emerald-600"><span>Lucro:</span><span>{formatBRL(calc.profit)}</span></p>
              <p className="flex justify-between text-lg font-bold mt-2 border-t pt-2"><span>Total:</span><span>{formatBRL(calc.total)}</span></p>
            </div>
          </div>
          <button onClick={() => window.print()} className="w-full mt-2 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </Modal>
    </>
  );
};

export default OrcamentoModule;
