import React, { useMemo, useState } from 'react';
import { Plus, Trash2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button, Card, Modal, InputGroup, SelectGroup } from '@/components/marcenaria/shared';
import type { ProjectData } from '@/modules/projetos/types';
import { useAuth } from '@/hooks/useAuth';
import { persistProjectTechnicalStructure } from '@/core/projectTechnicalPersistence';
import { optimizeCutList, type CutPart, type CutSheet } from '@/lib/cut/maxRects';

export interface Part {
  id: number;
  name: string;
  w: number;
  h: number;
  qtd: number;
  mat: 'white' | 'wood';
  status?: 'confirmed' | 'inferred' | 'estimate';
  material?: string | null;
  thicknessMm?: number | null;
  grainSensitive?: boolean;
  allowRotation?: boolean;
}

interface Props { parts: Part[]; setParts: (parts: Part[]) => void; project: ProjectData; }

const DEFAULT_KERF = 3;

const CorteModule = ({ parts, setParts, project }: Props) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'white' | 'wood'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState<Omit<Part, 'id'>>({ name: '', w: 0, h: 0, qtd: 1, mat: 'white' });
  const [sheetW, setSheetW] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const [sheetMaterial, setSheetMaterial] = useState('');
  const [sheetThickness, setSheetThickness] = useState<number | null>(null);
  const [technicalMessage, setTechnicalMessage] = useState<string | null>(null);

  const importTechnicalStructure = async () => {
    if (!user || !project.id) {
      setTechnicalMessage('Faça login e selecione um projeto salvo para gerar o plano técnico.');
      return;
    }
    try {
      setTechnicalMessage('Sincronizando estrutura técnica...');
      const { structure } = await persistProjectTechnicalStructure({ project, userId: user.id });
      const autoParts: Part[] = structure.parts.map((part, index) => ({
        id: index + 1,
        name: part.name,
        w: part.widthMm,
        h: part.heightMm,
        qtd: part.quantity,
        mat: (part.material || '').toLocaleLowerCase('pt-BR').includes('madeir') ? 'wood' : 'white',
        status: part.status,
        material: part.material,
        thicknessMm: part.thicknessMm,
        grainSensitive: part.grainSensitive,
        allowRotation: part.allowRotation,
      }));
      setParts(autoParts);

      const binding = structure.materialBindings.find(item => item.role === 'external')
        ?? structure.materialBindings.find(item => item.role === 'internal')
        ?? structure.materialBindings[0];
      if (binding) {
        setSheetW(binding.sheetWidthMm ?? 0);
        setSheetH(binding.sheetHeightMm ?? 0);
        setSheetMaterial(binding.name);
        setSheetThickness(binding.thicknessMm);
        setTechnicalMessage(`Material real vinculado: ${binding.name}. Chapa ${binding.sheetWidthMm ?? 'não informada'} × ${binding.sheetHeightMm ?? 'não informada'} mm.`);
      } else {
        setSheetMaterial('');
        setSheetThickness(null);
        setTechnicalMessage('Estrutura carregada, mas nenhum material do catálogo foi vinculado. Informe a chapa real antes de otimizar.');
      }
    } catch (error) {
      setTechnicalMessage(error instanceof Error ? error.message : 'Não foi possível carregar a estrutura técnica.');
    }
  };

  const addPart = () => {
    if (newPart.name.trim() && newPart.w > 0 && newPart.h > 0 && newPart.qtd > 0) {
      setParts([...parts, { ...newPart, name: newPart.name.trim(), id: Date.now(), qtd: Math.floor(newPart.qtd) }]);
      setNewPart({ name: '', w: 0, h: 0, qtd: 1, mat: 'white' });
      setShowAddModal(false);
    }
  };

  const deletePart = (id: number) => setParts(parts.filter(p => p.id !== id));

  const exploded = useMemo(() => parts.flatMap(p =>
    filter !== 'all' && p.mat !== filter
      ? []
      : Array.from({ length: Math.max(0, Math.floor(p.qtd)) }, (_, i) => ({ ...p, uid: `${p.id}-${i}` }))
  ), [parts, filter]);

  const cutParts: CutPart[] = exploded.map(part => ({
    id: part.uid,
    width: part.w,
    height: part.h,
    quantity: 1,
    material: part.material || 'Material não definido',
    grainSensitive: Boolean(part.grainSensitive),
    allowRotation: part.allowRotation !== false,
  }));

  const templates: CutSheet[] = sheetW > 0 && sheetH > 0 && sheetMaterial
    ? [{ id: 'chapa-real', width: sheetW, height: sheetH, material: sheetMaterial, thickness: sheetThickness ?? undefined }]
    : [];

  const result = useMemo(() => {
    if (!cutParts.length || !templates.length) return null;
    return optimizeCutList(cutParts, templates, DEFAULT_KERF);
  }, [cutParts, templates]);

  const invalid = result?.unplaced ?? [];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700">Peças técnicas</h3>
              <div className="flex gap-1">
                <button onClick={() => void importTechnicalStructure()} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Gerar estrutura técnica">
                  <RefreshCcw size={16} />
                </button>
                <button onClick={() => setShowAddModal(true)} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {(['all', 'white', 'wood'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 text-xs rounded font-medium ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {f === 'all' ? 'Tudo' : f === 'white' ? 'Branco' : 'Madeirado'}
                </button>
              ))}
            </div>
            {technicalMessage && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{technicalMessage}</div>}
            <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1">
              {parts.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Nenhuma peça. Gere a estrutura técnica ou adicione manualmente.</p>}
              {parts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                  <div>
                    <div className="font-bold text-slate-700">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.w}×{p.h}mm • {p.material || (p.mat === 'white' ? 'Material branco' : 'Material madeirado')} • {p.qtd} un.</div>
                    {p.status === 'inferred' && <div className="text-[10px] text-amber-700 mt-0.5">Inferida — confirmar</div>}
                  </div>
                  <button onClick={() => deletePart(p.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-bold text-slate-700 mb-3">Chapa real para otimização</h4>
            <div className="grid grid-cols-2 gap-3">
              <InputGroup label="Largura (mm)" value={sheetW || ''} onChange={v => setSheetW(Number(v))} />
              <InputGroup label="Altura (mm)" value={sheetH || ''} onChange={v => setSheetH(Number(v))} />
            </div>
            <InputGroup label="Material exato" type="text" value={sheetMaterial} onChange={v => setSheetMaterial(String(v))} placeholder="Selecione/vincule o material real" />
            {sheetThickness != null && <p className="text-xs text-slate-500 mt-2">Espessura vinculada: {sheetThickness} mm</p>}
            <p className="text-[11px] text-slate-400 mt-2">Sem dimensão de chapa real, o Marcena não gera um plano de produção fingindo uma medida.</p>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {invalid.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-3">
              <AlertTriangle className="shrink-0" size={18} />
              <div><strong>Peças não posicionadas</strong><ul className="mt-1 list-disc pl-5">{invalid.map(p => <li key={p.partId}>{p.partId}: {p.width}×{p.height} mm</li>)}</ul></div>
            </div>
          )}
          {!result ? (
            <div className="min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl gap-2 text-slate-400">
              <div className="text-4xl">📐</div>
              <p>Informe/vincule a chapa real para gerar o plano de corte.</p>
            </div>
          ) : result.sheets.map((s, idx) => (
            <Card key={s.id} className="p-4">
              <div className="flex justify-between mb-3">
                <div>
                  <h4 className="font-bold text-slate-700">Chapa #{idx + 1}</h4>
                  <p className="text-xs text-slate-500">{s.material} • {s.width}×{s.height} mm{s.thickness ? ` • ${s.thickness} mm` : ''}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{s.utilizationPct.toFixed(1)}% Aproveitamento</span>
              </div>
              <div className="bg-slate-200 relative rounded border-2 border-slate-400 overflow-hidden shadow-inner" style={{ aspectRatio: `${s.width}/${s.height}` }}>
                {s.placements.map(item => (
                  <div key={item.partId} title={`${item.partId} ${item.width}×${item.height}mm`} className="absolute border border-black/10 flex items-center justify-center text-[10px] font-bold bg-indigo-200 text-indigo-900" style={{ left: `${(item.x / s.width) * 100}%`, top: `${(item.y / s.height) * 100}%`, width: `${(item.width / s.width) * 100}%`, height: `${(item.height / s.height) * 100}%` }}>
                    <span className="truncate px-1">{item.partId}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Peça" maxWidth="max-w-sm" footer={<Button onClick={addPart}>Adicionar</Button>}>
        <div className="space-y-4">
          <InputGroup label="Nome" type="text" value={newPart.name} onChange={v => setNewPart({ ...newPart, name: String(v) })} placeholder="Ex: Lateral, Base, Porta..." />
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="Largura (mm)" value={newPart.w} onChange={v => setNewPart({ ...newPart, w: Number(v) })} />
            <InputGroup label="Altura (mm)" value={newPart.h} onChange={v => setNewPart({ ...newPart, h: Number(v) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="Qtd" value={newPart.qtd} onChange={v => setNewPart({ ...newPart, qtd: Number(v) })} />
            <SelectGroup label="Material" value={newPart.mat} onChange={v => setNewPart({ ...newPart, mat: v as 'white' | 'wood' })} options={[{ value: 'white', label: 'Branco' }, { value: 'wood', label: 'Madeirado' }]} />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CorteModule;
