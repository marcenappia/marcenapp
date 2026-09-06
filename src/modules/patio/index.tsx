import React, { useMemo, useState } from 'react';
import { FileDown, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { Button, Card, Modal, InputGroup, SelectGroup } from '@/components/marcenaria/shared';
import { planCutting, CutPlanningPart, GrainDirection } from '@/core/cutPlanning';

interface Part extends CutPlanningPart {}

interface Props {
  parts: Part[];
  setParts: (parts: Part[]) => void;
  project: any;
}

const SHEET_W = 2730;
const SHEET_H = 1830;
const KERF = 3;

const getGrain = (part: Part): GrainDirection => {
  if (part.grain) return part.grain;
  if (part.name.toLowerCase().includes('porta') || part.name.toLowerCase().includes('frente')) return 'vertical';
  return 'none';
};

const CorteModule = ({ parts, setParts, project }: Props) => {
  const [filter, setFilter] = useState<'all' | 'white' | 'wood'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState<Omit<Part, 'id'>>({ name: '', w: 0, h: 0, qtd: 1, mat: 'white', thickness: 15, grain: 'none' });

  const normalizedParts = useMemo(() => parts.map(part => ({ ...part, thickness: part.thickness || 15, grain: getGrain(part) })), [parts]);
  const visibleParts = useMemo(() => filter === 'all' ? normalizedParts : normalizedParts.filter(part => part.mat === filter), [normalizedParts, filter]);
  const sheets = useMemo(() => {
    try {
      return planCutting(visibleParts, { sheetWidth: SHEET_W, sheetHeight: SHEET_H, kerf: KERF, allowRotation: true });
    } catch {
      return [];
    }
  }, [visibleParts]);

  const importFromBudget = () => {
    const w = Math.round(project.width * 1000);
    const h = Math.round(project.height * 1000);
    const d = Math.round(project.depth * 1000);
    const modules = Math.max(1, Math.round(project.modules || 1));
    const moduleW = Math.max(300, Math.floor((w - Math.max(0, modules - 1) * 18) / modules));
    const autoParts: Part[] = [
      { id: Date.now() + 1, name: 'Lateral', w: Math.max(250, d - 20), h, qtd: modules * 2, mat: 'white', thickness: 15, grain: 'vertical' },
      { id: Date.now() + 2, name: 'Base', w: Math.max(250, d - 20), h: moduleW - 30, qtd: modules, mat: 'white', thickness: 15, grain: 'none' },
      { id: Date.now() + 3, name: 'Topo', w: Math.max(250, d - 20), h: moduleW - 30, qtd: modules, mat: 'white', thickness: 15, grain: 'none' },
      { id: Date.now() + 4, name: 'Prateleira', w: Math.max(230, d - 40), h: Math.max(260, moduleW - 40), qtd: modules * 2, mat: 'white', thickness: 15, grain: 'none' },
      { id: Date.now() + 5, name: 'Fundo', w: moduleW, h, qtd: modules, mat: 'white', thickness: 6, grain: 'vertical' },
    ];
    if (project.doors > 0) autoParts.push({ id: Date.now() + 6, name: 'Porta', w: Math.max(250, Math.floor((w - (project.doors - 1) * 3) / project.doors)), h: Math.max(300, h - 4), qtd: Math.round(project.doors), mat: 'wood', thickness: 18, grain: 'vertical' });
    setParts([...parts, ...autoParts]);
  };

  const addPart = () => {
    if (newPart.name && newPart.w > 0 && newPart.h > 0 && newPart.qtd > 0) {
      setParts([...parts, { ...newPart, id: Date.now() }]);
      setNewPart({ name: '', w: 0, h: 0, qtd: 1, mat: 'white', thickness: 15, grain: 'none' });
      setShowAddModal(false);
    }
  };

  const deletePart = (id: number) => setParts(parts.filter(p => p.id !== id));

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 h-[650px] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="font-bold text-slate-700">Produção e corte</h3><p className="text-[11px] text-slate-400">Chapa 2730 × 1830 mm • kerf {KERF} mm</p></div>
              <div className="flex gap-1"><button onClick={importFromBudget} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Importar projeto"><RefreshCcw size={16} /></button><button onClick={() => setShowAddModal(true)} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700" title="Adicionar peça"><Plus size={16} /></button></div>
            </div>
            <div className="flex gap-1 mb-3">{(['all', 'white', 'wood'] as const).map(f => <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 text-xs rounded font-medium ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{f === 'all' ? 'Tudo' : f === 'white' ? 'Branco' : 'Madeirado'}</button>)}</div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {normalizedParts.length === 0 && <p className="text-xs text-slate-400 text-center py-8 leading-relaxed">Nenhuma peça.<br />Gere a produção pelo orçamento ou adicione manualmente.</p>}
              {normalizedParts.map(p => <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm"><div><div className="font-bold text-slate-700">{p.name}</div><div className="text-xs text-slate-500">{p.w} × {p.h} mm • {p.thickness} mm • {p.mat === 'white' ? 'Branco' : 'Madeirado'}</div><div className="text-[10px] text-slate-400">Veio: {getGrain(p) === 'vertical' ? 'vertical' : getGrain(p) === 'horizontal' ? 'horizontal' : 'livre'}</div></div><div className="flex items-center gap-2"><span className="font-bold bg-white px-2 py-1 rounded border text-slate-700">{p.qtd}</span><button onClick={() => deletePart(p.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button></div></div>)}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-4 h-[650px] overflow-y-auto pr-2 scrollbar-thin">
          {sheets.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl gap-2"><div className="text-4xl">📐</div><p>Adicione peças compatíveis para gerar o plano de corte</p></div> : sheets.map((sheet, idx) => <Card key={`${sheet.material}-${sheet.thickness}-${idx}`} className="p-4"><div className="flex flex-wrap justify-between items-center gap-2 mb-3"><div><h4 className="font-bold text-slate-700">Chapa #{idx + 1}</h4><p className="text-xs text-slate-400">{sheet.material === 'white' ? 'MDF branco' : 'MDF madeirado'} • {sheet.thickness} mm • {sheet.width} × {sheet.height} mm</p></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{(sheet.utilization * 100).toFixed(1)}% aproveitamento</span><span className="text-xs text-slate-500">{(sheet.remnantArea / 1_000_000).toFixed(2)} m² sobra</span></div></div><div className="bg-slate-200 relative rounded border-2 border-slate-400 overflow-hidden shadow-inner" style={{ aspectRatio: `${sheet.width}/${sheet.height}` }}>{sheet.items.map(item => <div key={item.uid} title={`${item.name}: ${item.w} × ${item.h} mm${item.rotated ? ' • girada' : ''}`} className={`absolute border border-black/10 flex flex-col items-center justify-center text-[9px] font-bold ${item.mat === 'white' ? 'bg-indigo-200 text-indigo-900' : 'bg-amber-200 text-amber-900'}`} style={{ left: `${(item.x / sheet.width) * 100}%`, top: `${(item.y / sheet.height) * 100}%`, width: `${(item.w / sheet.width) * 100}%`, height: `${(item.h / sheet.height) * 100}%` }}><span className="truncate px-1 max-w-full">{item.name}</span><span className="text-[8px] font-normal">{item.w}×{item.h}{item.rotated ? ' ↻' : ''}</span></div>)}</div></Card>)}
          {sheets.length > 0 && <Card className="p-4"><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"><div><strong className="text-slate-700">Ficha de produção</strong><p className="text-xs text-slate-500">Use imprimir para salvar como PDF ou entregar à produção.</p></div><Button onClick={() => window.print()}><FileDown size={16} /> Imprimir / PDF</Button></div></Card>}
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Peça" maxWidth="max-w-sm" footer={<Button onClick={addPart}>Adicionar</Button>}>
        <div className="space-y-4"><InputGroup label="Nome" type="text" value={newPart.name} onChange={v => setNewPart({ ...newPart, name: String(v) })} placeholder="Ex: Lateral, Base, Porta..." /><div className="grid grid-cols-2 gap-3"><InputGroup label="Largura (mm)" value={newPart.w} onChange={v => setNewPart({ ...newPart, w: Number(v) })} /><InputGroup label="Altura (mm)" value={newPart.h} onChange={v => setNewPart({ ...newPart, h: Number(v) })} /></div><div className="grid grid-cols-2 gap-3"><InputGroup label="Qtd" value={newPart.qtd} onChange={v => setNewPart({ ...newPart, qtd: Number(v) })} /><SelectGroup label="Material" value={newPart.mat} onChange={v => setNewPart({ ...newPart, mat: v as 'white' | 'wood' })} options={[{ value: 'white', label: 'Branco' }, { value: 'wood', label: 'Madeirado' }]} /></div><div className="grid grid-cols-2 gap-3"><InputGroup label="Espessura (mm)" value={newPart.thickness} onChange={v => setNewPart({ ...newPart, thickness: Number(v) })} /><SelectGroup label="Veio" value={newPart.grain} onChange={v => setNewPart({ ...newPart, grain: v as GrainDirection })} options={[{ value: 'none', label: 'Livre / pode girar' }, { value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }]} /></div></div>
      </Modal>
    </>
  );
};

export default CorteModule;
