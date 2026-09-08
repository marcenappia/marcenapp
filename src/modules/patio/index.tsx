import React, { useState, useMemo } from 'react';
import { Plus, Trash2, RefreshCcw } from 'lucide-react';
import { Button, Card, Modal, InputGroup, SelectGroup } from '@/components/marcenaria/shared';
import type { ProjectData } from '@/modules/projetos/types';

export interface Part {
  id: number;
  name: string;
  w: number;
  h: number;
  qtd: number;
  mat: 'white' | 'wood';
}

interface ExplodedPart extends Part {
  uid: string;
}

interface SheetItem extends ExplodedPart {
  x: number;
  y: number;
}

interface Sheet {
  items: SheetItem[];
  usedArea: number;
}

export function generatePartsFromProject(project: Partial<ProjectData>): Part[] {
  const width = Math.max(0, Math.round(Number(project?.width) * 1000));
  const height = Math.max(0, Math.round(Number(project?.height) * 1000));
  const depth = Math.max(0, Math.round(Number(project?.depth) * 1000));
  const doors = Math.max(0, Math.floor(Number(project?.doors) || 0));
  const drawers = Math.max(0, Math.floor(Number(project?.drawers) || 0));
  const modules = Math.max(1, Math.floor(Number(project?.modules) || 1));
  const carcassWidth = Math.max(0, width - 36);
  const openingHeight = Math.max(0, height - 36);
  const openingWidth = Math.max(0, Math.floor(carcassWidth / modules));
  const parts: Omit<Part, 'id'>[] = [];

  const add = (name: string, w: number, h: number, qtd: number, mat: Part['mat']) => {
    if (w > 0 && h > 0 && qtd > 0) parts.push({ name, w, h, qtd, mat });
  };

  add('Lateral', depth, openingHeight, 2, 'white');
  add('Base / Topo', depth, carcassWidth, 2, 'white');
  add('Prateleira', Math.max(0, depth - 20), openingWidth, Math.max(0, modules * 2), 'white');
  add('Fundo', Math.max(0, openingHeight), carcassWidth, 1, 'white');
  add('Porta', Math.max(0, Math.floor(carcassWidth / Math.max(1, doors)) - 3), Math.max(0, height - 4), doors, 'wood');
  add('Frente de gaveta', Math.max(0, openingWidth - 4), Math.max(0, Math.floor(openingHeight / Math.max(1, drawers + 1)) - 3), drawers, 'wood');

  return parts.map((part, index) => ({ ...part, id: index + 1 }));
}

const SHEET_W = 2730;
const SHEET_H = 1830;
const KERF = 3;

function packParts(parts: ExplodedPart[]): Sheet[] {
  const sorted = [...parts].sort((a, b) => b.h - a.h);
  const sheets: Sheet[] = [];
  let currentSheet: Sheet = { items: [], usedArea: 0 };
  let x = 0, y = 0, rowH = 0;

  const newSheet = () => {
    if (currentSheet.items.length) sheets.push(currentSheet);
    currentSheet = { items: [], usedArea: 0 };
    x = 0; y = 0; rowH = 0;
  };

  sorted.forEach(p => {
    if (x + p.w > SHEET_W) { x = 0; y += rowH + KERF; rowH = 0; }
    if (y + p.h > SHEET_H) newSheet();
    currentSheet.items.push({ ...p, x, y });
    currentSheet.usedArea += p.w * p.h;
    x += p.w + KERF;
    rowH = Math.max(rowH, p.h);
  });

  if (currentSheet.items.length) sheets.push(currentSheet);
  return sheets;
}

interface Props {
  parts: Part[];
  setParts: (parts: Part[]) => void;
  project: ProjectData;
}

const CorteModule = ({ parts, setParts, project }: Props) => {
  const [filter, setFilter] = useState<'all' | 'white' | 'wood'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState<Omit<Part, 'id'>>({ name: '', w: 0, h: 0, qtd: 1, mat: 'white' });

  const importFromBudget = () => {
    setParts(generatePartsFromProject(project));
  };

  const addPart = () => {
    if (newPart.name && newPart.w > 0 && newPart.h > 0) {
      setParts([...parts, { ...newPart, id: Date.now() }]);
      setNewPart({ name: '', w: 0, h: 0, qtd: 1, mat: 'white' });
      setShowAddModal(false);
    }
  };

  const deletePart = (id: number) => setParts(parts.filter(p => p.id !== id));

  const exploded = useMemo(() => {
    const list: ExplodedPart[] = [];
    parts.forEach(p => {
      if (filter !== 'all' && p.mat !== filter) return;
      for (let i = 0; i < p.qtd; i++) list.push({ ...p, uid: `${p.id}-${i}` });
    });
    return list;
  }, [parts, filter]);

  const sheets = useMemo(() => packParts(exploded), [exploded]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 h-[600px] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700">Peças</h3>
              <div className="flex gap-1">
                <button
                  onClick={importFromBudget}
                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                  title="Importar do Orçamento"
                >
                  <RefreshCcw size={16} />
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {(['all', 'white', 'wood'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    filter === f
                      ? f === 'all' ? 'bg-slate-800 text-white' : f === 'white' ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'Tudo' : f === 'white' ? 'Branco' : 'Madeirado'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {parts.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8 leading-relaxed">
                  Nenhuma peça.<br />Importe do orçamento ou adicione manualmente.
                </p>
              )}
              {parts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm group">
                  <div>
                    <div className="font-bold text-slate-700">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.w}×{p.h}mm • {p.mat === 'white' ? 'Branco' : 'Madeirado'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold bg-white px-2 py-1 rounded border text-slate-700">{p.qtd}</span>
                    <button onClick={() => deletePart(p.id)} className="text-red-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6 h-[600px] overflow-y-auto pr-2 scrollbar-thin">
          {sheets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl gap-2">
              <div className="text-4xl">📐</div>
              <p>Adicione peças para visualizar o plano de corte</p>
            </div>
          ) : (
            sheets.map((s, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex justify-between mb-3">
                  <h4 className="font-bold text-slate-700">Chapa #{idx + 1}</h4>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    {((s.usedArea / (SHEET_W * SHEET_H)) * 100).toFixed(1)}% Aproveitamento
                  </span>
                </div>
                <div
                  className="bg-slate-200 relative rounded border-2 border-slate-400 overflow-hidden shadow-inner"
                  style={{ aspectRatio: `${SHEET_W}/${SHEET_H}` }}
                >
                  {s.items.map(item => (
                    <div
                      key={item.uid}
                      className={`absolute border border-black/10 flex items-center justify-center text-[10px] font-bold ${item.mat === 'white' ? 'bg-indigo-200 text-indigo-900' : 'bg-amber-200 text-amber-900'}`}
                      style={{
                        left: `${(item.x / SHEET_W) * 100}%`,
                        top: `${(item.y / SHEET_H) * 100}%`,
                        width: `${(item.w / SHEET_W) * 100}%`,
                        height: `${(item.h / SHEET_H) * 100}%`
                      }}
                    >
                      <span className="truncate px-1">{item.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nova Peça"
        maxWidth="max-w-sm"
        footer={<Button onClick={addPart}>Adicionar</Button>}
      >
        <div className="space-y-4">
          <InputGroup label="Nome" type="text" value={newPart.name} onChange={v => setNewPart({ ...newPart, name: String(v) })} placeholder="Ex: Lateral, Base, Porta..." />
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="Largura (mm)" value={newPart.w} onChange={v => setNewPart({ ...newPart, w: Number(v) })} />
            <InputGroup label="Altura (mm)" value={newPart.h} onChange={v => setNewPart({ ...newPart, h: Number(v) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="Qtd" value={newPart.qtd} onChange={v => setNewPart({ ...newPart, qtd: Number(v) })} />
            <SelectGroup
              label="Material"
              value={newPart.mat}
              onChange={v => setNewPart({ ...newPart, mat: v as 'white' | 'wood' })}
              options={[{ value: 'white', label: 'Branco' }, { value: 'wood', label: 'Madeirado' }]}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CorteModule;
