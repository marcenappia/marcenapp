import React, { useMemo, useState } from 'react';
import { FileDown, Plus, RefreshCcw, Trash2, ShoppingCart, PackageOpen, CheckCircle2 } from 'lucide-react';
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

interface SavedRemnant extends CutRemnant {
  savedAt: string;
}

const SHEET_W = 2730;
const SHEET_H = 1830;
const KERF = 3;
const REMNANT_STORAGE = 'marcenapp-remnants-v1';
const SAVINGS_KEY_PREFIX = 'marcenapp-cut-savings-v1:';

const projectKey = (project: any) => String(project?.id ?? project?.name ?? project?.jornada?.id ?? 'current');

const getGrain = (part: Part): GrainDirection => {
  if (part.grain) return part.grain;
  if (part.name.toLowerCase().includes('porta') || part.name.toLowerCase().includes('frente')) return 'vertical';
  return 'none';
};

const loadRemnants = (): SavedRemnant[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REMNANT_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const CorteModule = ({ parts, setParts, project }: Props) => {
  const [filter, setFilter] = useState<'all' | 'white' | 'wood'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHardware, setShowHardware] = useState(false);
  const [showRemnants, setShowRemnants] = useState(false);
  const [remnants, setRemnants] = useState<SavedRemnant[]>(loadRemnants);
  const [newPart, setNewPart] = useState<Omit<Part, 'id'>>({ name: '', w: 0, h: 0, qtd: 1, mat: 'white', thickness: 15, grain: 'none' });

  const hardware = useMemo(() => buildHardwareList(project), [project]);
  const totalHardware = useMemo(() => hardware.reduce((sum, item) => sum + item.quantity, 0), [hardware]);
  const normalizedParts = useMemo(() => parts.map(part => ({ ...part, thickness: part.thickness || 15, grain: getGrain(part) })), [parts]);
  const visibleParts = useMemo(() => filter === 'all' ? normalizedParts : normalizedParts.filter(part => part.mat === filter), [normalizedParts, filter]);
  const stockSheets = useMemo(() => remnants.map(rem => ({
    id: rem.id,
    material: rem.material,
    thickness: rem.thickness,
    width: rem.width,
    height: rem.height,
    source: 'remnant' as const,
  })), [remnants]);
  const sheets = useMemo(() => {
    try {
      return planCutting(visibleParts, {
        sheetWidth: SHEET_W,
        sheetHeight: SHEET_H,
        kerf: KERF,
        allowRotation: true,
        stockSheets,
      });
    } catch {
      return [];
    }
  }, [visibleParts, stockSheets]);
  const usedRemnantIds = useMemo(() => sheets.filter(sheet => sheet.source === 'remnant').map(sheet => sheet.stockId), [sheets]);
  const newSheetCount = useMemo(() => sheets.filter(sheet => sheet.source === 'sheet').length, [sheets]);
  const reusedRemnantCount = usedRemnantIds.length;

  const persistRemnants = (next: SavedRemnant[]) => {
    setRemnants(next);
    window.localStorage.setItem(REMNANT_STORAGE, JSON.stringify(next));
  };

  const saveRemnant = (remnant: CutRemnant) => {
    const saved: SavedRemnant = { ...remnant, id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, savedAt: new Date().toISOString() };
    persistRemnants([saved, ...remnants]);
  };

  const removeRemnant = (id: string) => persistRemnants(remnants.filter(item => item.id !== id));

  const reserveUsedRemnants = () => {
    if (usedRemnantIds.length === 0) return;
    const used = new Set(usedRemnantIds);
    const savings = { internal: 0, external: 0, back: 0, total: 0 };
    sheets
      .filter(sheet => sheet.source === 'remnant' && used.has(sheet.stockId))
      .forEach(sheet => {
        savings.total += 1;
        if (sheet.thickness === 6) savings.back += 1;
        else if (sheet.material === 'wood' || sheet.thickness === 18) savings.external += 1;
        else savings.internal += 1;
      });
    const generated = sheets
      .filter(sheet => sheet.source === 'remnant' && used.has(sheet.stockId))
      .flatMap(sheet => sheet.remnants)
      .map(rem => ({
        ...rem,
        id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        savedAt: new Date().toISOString(),
      }));
    const remaining = remnants.filter(rem => !used.has(rem.id));
    persistRemnants([...generated, ...remaining]);
    window.localStorage.setItem(`${SAVINGS_KEY_PREFIX}${projectKey(project)}`, JSON.stringify(savings));
  };

  const importFromBudget = () => {
    setParts(generatePartsFromProject(project));
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
              <div className="flex gap-1"><button onClick={importFromBudget} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Importar projeto"><RefreshCcw size={16} /></button><button onClick={() => setShowRemnants(true)} className="p-1.5 bg-sky-100 text-sky-700 rounded hover:bg-sky-200" title="Estoque de sobras"><PackageOpen size={16} /></button><button onClick={() => setShowHardware(true)} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200" title="Lista de ferragens"><ShoppingCart size={16} /></button><button onClick={() => setShowAddModal(true)} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700" title="Adicionar peça"><Plus size={16} /></button></div>
            </div>
            <div className="flex gap-1 mb-3">{(['all', 'white', 'wood'] as const).map(f => <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 text-xs rounded font-medium ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{f === 'all' ? 'Tudo' : f === 'white' ? 'Branco' : 'Madeirado'}</button>)}</div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {normalizedParts.length === 0 && <p className="text-xs text-slate-400 text-center py-8 leading-relaxed">Nenhuma peça.<br />Gere a produção pelo orçamento ou adicione manualmente.</p>}
              {normalizedParts.map(p => <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm"><div><div className="font-bold text-slate-700">{p.name}</div><div className="text-xs text-slate-500">{p.w} × {p.h} mm • {p.thickness} mm • {p.mat === 'white' ? 'Branco' : 'Madeirado'}</div><div className="text-[10px] text-slate-400">Veio: {getGrain(p) === 'vertical' ? 'vertical' : getGrain(p) === 'horizontal' ? 'horizontal' : 'livre'}</div></div><div className="flex items-center gap-2"><span className="font-bold bg-white px-2 py-1 rounded border text-slate-700">{p.qtd}</span><button onClick={() => deletePart(p.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button></div></div>)}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-4 h-[650px] overflow-y-auto pr-2 scrollbar-thin">
          {sheets.length > 0 && <Card className="p-3 border-sky-100 bg-sky-50"><div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center"><div><div className="font-bold text-sky-900">Aproveitamento automático</div><p className="text-xs text-sky-700">{reusedRemnantCount} {reusedRemnantCount === 1 ? 'sobra reaproveitada' : 'sobras reaproveitadas'} • {newSheetCount} {newSheetCount === 1 ? 'chapa nova' : 'chapas novas'}</p></div>{reusedRemnantCount > 0 && <Button onClick={reserveUsedRemnants}><CheckCircle2 size={16} /> Reservar sobras usadas</Button>}</div></Card>}
          {sheets.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl gap-2"><div className="text-4xl">📐</div><p>Adicione peças compatíveis para gerar o plano de corte</p></div> : sheets.map((sheet, idx) => <Card key={`${sheet.material}-${sheet.thickness}-${sheet.stockId}`} className="p-4"><div className="flex flex-wrap justify-between items-center gap-2 mb-3"><div><h4 className="font-bold text-slate-700">{sheet.source === 'remnant' ? 'Sobra em uso' : 'Chapa'} #{idx + 1}</h4><p className="text-xs text-slate-400">{sheet.material === 'white' ? 'MDF branco' : 'MDF madeirado'} • {sheet.thickness} mm • {sheet.width} × {sheet.height} mm</p></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{(sheet.utilization * 100).toFixed(1)}% aproveitamento</span><span className="text-xs text-slate-500">{(sheet.remnantArea / 1_000_000).toFixed(2)} m² sobra útil</span></div></div><div className="bg-slate-200 relative rounded border-2 border-slate-400 overflow-hidden shadow-inner" style={{ aspectRatio: `${sheet.width}/${sheet.height}` }}>{sheet.items.map(item => <div key={item.uid} title={`${item.name}: ${item.w} × ${item.h} mm${item.rotated ? ' • girada' : ''}`} className={`absolute border border-black/10 flex flex-col items-center justify-center text-[9px] font-bold ${item.mat === 'white' ? 'bg-indigo-200 text-indigo-900' : 'bg-amber-200 text-amber-900'}`} style={{ left: `${(item.x / sheet.width) * 100}%`, top: `${(item.y / sheet.height) * 100}%`, width: `${(item.w / sheet.width) * 100}%`, height: `${(item.h / sheet.height) * 100}%` }}><span className="truncate px-1 max-w-full">{item.name}</span><span className="text-[8px] font-normal">{item.w}×{item.h}{item.rotated ? ' ↻' : ''}</span></div>)}</div>{sheet.remnants.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{sheet.remnants.map(rem => <div key={rem.id} className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1.5"><span className="text-xs font-semibold text-sky-800">Sobra {rem.width} × {rem.height} mm</span><button onClick={() => saveRemnant(rem)} className="text-[10px] font-bold text-sky-700 hover:underline">Guardar estoque</button></div>)}</div>}</Card>)}
          {sheets.length > 0 && <Card className="p-4"><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"><div><strong className="text-slate-700">Ficha de produção</strong><p className="text-xs text-slate-500">Use imprimir para salvar como PDF ou entregar à produção.</p></div><Button onClick={() => window.print()}><FileDown size={16} /> Imprimir / PDF</Button></div></Card>}
        </div>
      </div>

      <Modal isOpen={showRemnants} onClose={() => setShowRemnants(false)} title="Estoque de sobras" maxWidth="max-w-lg">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Sobras retangulares com pelo menos 150 × 150 mm podem ser guardadas para reaproveitamento em próximos cortes.</p>
          {remnants.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">Nenhuma sobra cadastrada ainda.</div> : remnants.map(rem => <div key={rem.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50"><div><div className="font-bold text-slate-700">{rem.width} × {rem.height} mm</div><div className="text-xs text-slate-500">{rem.material === 'white' ? 'MDF branco' : 'MDF madeirado'} • {rem.thickness} mm • {(rem.area / 1_000_000).toFixed(2)} m²</div></div><button onClick={() => removeRemnant(rem.id)} className="text-xs font-bold text-red-500 hover:underline">Excluir</button></div>)}
        </div>
      </Modal>

      <Modal isOpen={showHardware} onClose={() => setShowHardware(false)} title="Lista de compra — Ferragens" maxWidth="max-w-lg" footer={<Button onClick={() => window.print()}>Imprimir / PDF</Button>}>
        <div className="space-y-2">
          {hardware.length === 0 ? <p className="text-sm text-slate-500">Nenhuma ferragem automática para este projeto.</p> : hardware.map(item => <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50"><div><div className="font-bold text-slate-700">{item.name}</div><div className="text-xs text-slate-500">{item.note}</div></div><div className="text-right shrink-0"><div className="text-lg font-black text-slate-800">{item.quantity}</div><div className="text-[10px] uppercase text-slate-400">{item.unit}</div></div></div>)}
          {hardware.length > 0 && <div className="pt-3 text-xs text-slate-400">Total de itens/unidades contabilizados: {totalHardware}. Quantidades são uma base inicial e devem ser revisadas conforme ferragem e peso.</div>}
        </div>
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Peça" maxWidth="max-w-sm" footer={<Button onClick={addPart}>Adicionar</Button>}>
        <div className="space-y-4"><InputGroup label="Nome" type="text" value={newPart.name} onChange={v => setNewPart({ ...newPart, name: String(v) })} placeholder="Ex: Lateral, Base, Porta..." /><div className="grid grid-cols-2 gap-3"><InputGroup label="Largura (mm)" value={newPart.w} onChange={v => setNewPart({ ...newPart, w: Number(v) })} /><InputGroup label="Altura (mm)" value={newPart.h} onChange={v => setNewPart({ ...newPart, h: Number(v) })} /></div><div className="grid grid-cols-2 gap-3"><InputGroup label="Qtd" value={newPart.qtd} onChange={v => setNewPart({ ...newPart, qtd: Number(v) })} /><SelectGroup label="Material" value={newPart.mat} onChange={v => setNewPart({ ...newPart, mat: v as 'white' | 'wood' })} options={[{ value: 'white', label: 'Branco' }, { value: 'wood', label: 'Madeirado' }]} /></div><div className="grid grid-cols-2 gap-3"><InputGroup label="Espessura (mm)" value={newPart.thickness} onChange={v => setNewPart({ ...newPart, thickness: Number(v) })} /><SelectGroup label="Veio" value={newPart.grain} onChange={v => setNewPart({ ...newPart, grain: v as GrainDirection })} options={[{ value: 'none', label: 'Livre / pode girar' }, { value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }]} /></div></div>
      </Modal>
    </>
  );
};

export default CorteModule;
