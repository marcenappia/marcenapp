import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, RefreshCcw, AlertTriangle, Scissors, CheckCircle2 } from 'lucide-react';
import { Button, Card, Modal, InputGroup, SelectGroup } from '@/components/marcenaria/shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectData } from '@/modules/projetos/types';

export interface Part { id: number; name: string; w: number; h: number; qtd: number; mat: 'white' | 'wood'; }
interface ExplodedPart extends Part { uid: string; }
interface SheetItem extends ExplodedPart { x: number; y: number; rotated: boolean; }
interface Sheet { items: SheetItem[]; usedArea: number; }
const SHEET_W = 2730;
const SHEET_H = 1830;
const KERF = 3;

function packParts(parts: ExplodedPart[]): { sheets: Sheet[]; invalid: ExplodedPart[] } {
  const invalid = parts.filter(p => (p.w > SHEET_W && p.w > SHEET_H) || (p.h > SHEET_W && p.h > SHEET_H));
  const valid = parts.filter(p => !invalid.includes(p));
  const sorted = [...valid].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const sheets: Sheet[] = [];
  let currentSheet: Sheet = { items: [], usedArea: 0 };
  let x = 0, y = 0, rowH = 0;
  const newSheet = () => { if (currentSheet.items.length) sheets.push(currentSheet); currentSheet = { items: [], usedArea: 0 }; x = 0; y = 0; rowH = 0; };
  for (const p of sorted) {
    let rotated = false; let w = p.w; let h = p.h;
    if (x + w > SHEET_W && x + h <= SHEET_W) { rotated = true; w = p.h; h = p.w; }
    if (x + w > SHEET_W) { x = 0; y += rowH + KERF; rowH = 0; rotated = false; w = p.w; h = p.h; }
    if (y + h > SHEET_H) newSheet();
    if (x + w > SHEET_W || y + h > SHEET_H) {
      if (x + p.h <= SHEET_W && y + p.w <= SHEET_H) { rotated = true; w = p.h; h = p.w; }
      else { invalid.push(p); continue; }
    }
    currentSheet.items.push({ ...p, x, y, rotated });
    currentSheet.usedArea += w * h;
    x += w + KERF;
    rowH = Math.max(rowH, h);
  }
  if (currentSheet.items.length) sheets.push(currentSheet);
  return { sheets, invalid };
}

interface Props { parts: Part[]; setParts: (parts: Part[]) => void; project: ProjectData; }

const CorteModule = ({ parts, setParts, project }: Props) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'white' | 'wood'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPart, setNewPart] = useState<Omit<Part, 'id'>>({ name: '', w: 0, h: 0, qtd: 1, mat: 'white' });

  useEffect(() => {
    if (!user || !project.id) { setHydrated(true); return; }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.from('project_versions').select('id,snapshot').eq('user_id', user.id).eq('project_id', project.id).order('version_number', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (error) console.error('[cut-plan] load failed', error);
      const snapshot = data?.snapshot as { cutPlan?: { parts?: Part[] } } | null;
      const persisted = Array.isArray(snapshot?.cutPlan?.parts) ? snapshot!.cutPlan!.parts! : [];
      setParts(persisted.filter(p => p && p.name && p.w > 0 && p.h > 0 && p.qtd > 0).map(p => ({ ...p, id: Number(p.id) })));
      setHydrated(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [project.id, setParts, user]);

  useEffect(() => {
    if (!hydrated || !user || !project.id) return;
    let cancelled = false;
    const save = async () => {
      setSaving(true);
      const { data: version, error: loadError } = await supabase.from('project_versions').select('id,snapshot,version_number').eq('user_id', user.id).eq('project_id', project.id).order('version_number', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (loadError) { console.error('[cut-plan] version load failed', loadError); setSaving(false); return; }
      const currentSnapshot = version?.snapshot && typeof version.snapshot === 'object' ? version.snapshot as Record<string, unknown> : {};
      const nextSnapshot = { ...currentSnapshot, cutPlan: { parts, sheet: { width: SHEET_W, height: SHEET_H, kerf: KERF }, updatedAt: new Date().toISOString() } };
      const result = version?.id
        ? await supabase.from('project_versions').update({ snapshot: nextSnapshot }).eq('id', version.id).eq('user_id', user.id)
        : await supabase.from('project_versions').insert({ project_id: project.id, user_id: user.id, version_number: 1, status: 'draft', snapshot: nextSnapshot });
      if (!cancelled) setSaving(false);
      if (result.error) console.error('[cut-plan] persistence failed', result.error);
    };
    void save();
    return () => { cancelled = true; };
  }, [hydrated, parts, project.id, user]);

  const importFromProject = () => {
    const w = Math.round(project.width * 1000);
    const h = Math.round(project.height * 1000);
    const d = Math.round(project.depth * 1000);
    const generated: Part[] = [
      { id: Date.now() + 1, name: 'Lateral', w: d, h, qtd: 2, mat: 'white' },
      { id: Date.now() + 2, name: 'Base / topo', w: Math.max(1, w - 30), h: d, qtd: 2, mat: 'white' },
      ...(project.doors > 0 ? [{ id: Date.now() + 3, name: 'Porta', w: Math.max(1, Math.floor(w / project.doors) - 2), h: Math.max(1, h - 4), qtd: project.doors, mat: 'wood' as const }] : []),
    ];
    setParts(generated);
  };

  const addPart = () => {
    if (newPart.name.trim() && newPart.w > 0 && newPart.h > 0 && newPart.qtd > 0) {
      setParts([...parts, { ...newPart, name: newPart.name.trim(), id: Date.now(), qtd: Math.floor(newPart.qtd) }]);
      setNewPart({ name: '', w: 0, h: 0, qtd: 1, mat: 'white' });
      setShowAddModal(false);
    }
  };
  const deletePart = (id: number) => setParts(parts.filter(p => p.id !== id));
  const exploded = useMemo(() => parts.flatMap(p => filter !== 'all' && p.mat !== filter ? [] : Array.from({ length: Math.max(0, Math.floor(p.qtd)) }, (_, i) => ({ ...p, uid: `${p.id}-${i}` }))), [parts, filter]);
  const { sheets, invalid } = useMemo(() => packParts(exploded), [exploded]);
  const totalParts = parts.reduce((sum, p) => sum + p.qtd, 0);
  const utilization = sheets.length ? (sheets.reduce((sum, s) => sum + s.usedArea, 0) / (sheets.length * SHEET_W * SHEET_H)) * 100 : 0;

  return (
    <>
      <div className="space-y-6 pb-20 md:pb-0">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-slate-400"><Scissors size={14} /> Produção</div><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Plano de corte</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Organize as peças do projeto em chapas. O cálculo é preliminar e precisa ser conferido antes da produção.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={importFromProject} disabled={!project.id || project.width <= 0} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCcw size={14} /> Gerar estrutura inicial</button>
            <button type="button" onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Plus size={14} /> Adicionar peça</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Peças', totalParts], ['Chapas', sheets.length], ['Aproveitamento', `${utilization.toFixed(1)}%`], ['Status', invalid.length ? 'Revisar' : parts.length ? 'Prévia' : 'Sem peças']].map(([label,value], i) => <Card key={String(label)} className="p-4"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><strong className={`mt-1 block text-lg font-black ${i === 3 && invalid.length ? 'text-amber-600' : 'text-slate-900'}`}>{value}</strong></Card>)}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Lista de peças</h2><p className="text-xs text-slate-500">Dimensões em milímetros.</p></div><span className="text-[10px] font-bold text-slate-400">{saving ? 'Salvando…' : hydrated ? 'Salvo no projeto' : 'Carregando…'}</span></div></div>
            <div className="border-b border-slate-100 p-3"><div className="flex gap-1.5">{(['all','white','wood'] as const).map(f => <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{f === 'all' ? 'Todas' : f === 'white' ? 'Branco' : 'Madeirado'}</button>)}</div></div>
            <div className="max-h-[560px] overflow-y-auto p-3">
              {parts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><Scissors className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-bold text-slate-600">Nenhuma peça definida</p><p className="mt-1 text-xs text-slate-400">Gere uma estrutura inicial ou adicione as peças manualmente.</p></div> : parts.map(p => <div key={p.id} className="mb-2 rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">{p.name}</p><p className="mt-1 text-xs text-slate-500">{p.w} × {p.h} mm · {p.qtd} un. · {p.mat === 'white' ? 'Branco' : 'Madeirado'}</p></div><button type="button" onClick={() => deletePart(p.id)} aria-label={`Excluir ${p.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button></div></div>)}
            </div>
          </Card>

          <div className="space-y-4">
            {invalid.length > 0 && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="shrink-0" size={18} /><div><strong>Peças fora do limite da chapa</strong><p className="mt-1 text-xs">Estas peças precisam de revisão antes de qualquer uso em produção.</p>{invalid.map(p => <p key={p.uid} className="mt-1 text-xs">{p.name}: {p.w} × {p.h} mm</p>)}</div></div>}
            {sheets.length === 0 ? <Card className="flex min-h-[420px] items-center justify-center border-dashed p-8 text-center"><div><Scissors className="mx-auto text-slate-300" size={34} /><p className="mt-3 text-sm font-black text-slate-600">O plano aparecerá aqui</p><p className="mt-1 text-xs text-slate-400">As chapas serão organizadas a partir da lista de peças.</p></div></Card> : sheets.map((s, idx) => <Card key={idx} className="p-4 md:p-5"><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Chapa {String(idx + 1).padStart(2,'0')}</h3><p className="text-[11px] text-slate-400">{SHEET_W} × {SHEET_H} mm · folga de corte {KERF} mm</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{((s.usedArea / (SHEET_W * SHEET_H)) * 100).toFixed(1)}% aproveitamento</span></div><div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-inner" style={{ aspectRatio: `${SHEET_W}/${SHEET_H}` }}>{s.items.map(item => { const iw = item.rotated ? item.h : item.w; const ih = item.rotated ? item.w : item.h; return <div key={item.uid} title={`${item.name} ${iw}×${ih}mm`} className={`absolute flex items-center justify-center border border-slate-500/30 text-[9px] font-black ${item.mat === 'white' ? 'bg-slate-200 text-slate-700' : 'bg-stone-300 text-stone-800'}`} style={{ left: `${(item.x / SHEET_W) * 100}%`, top: `${(item.y / SHEET_H) * 100}%`, width: `${(iw / SHEET_W) * 100}%`, height: `${(ih / SHEET_H) * 100}%` }}><span className="truncate px-1">{item.name}</span></div>; })}</div></Card>)}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"><CheckCircle2 size={15} /> O plano fica salvo na versão do projeto. Antes de liberar para produção, confira medidas, sentido de veio, fita de borda, espessuras e ferragens.</div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar peça" maxWidth="max-w-sm" footer={<Button onClick={addPart}>Adicionar</Button>}>
        <div className="space-y-4"><InputGroup label="Nome" type="text" value={newPart.name} onChange={v => setNewPart({ ...newPart, name: String(v) })} placeholder="Ex.: lateral esquerda" /><div className="grid grid-cols-2 gap-3"><InputGroup label="Largura (mm)" value={newPart.w} onChange={v => setNewPart({ ...newPart, w: Number(v) })} /><InputGroup label="Altura (mm)" value={newPart.h} onChange={v => setNewPart({ ...newPart, h: Number(v) })} /></div><div className="grid grid-cols-2 gap-3"><InputGroup label="Quantidade" value={newPart.qtd} onChange={v => setNewPart({ ...newPart, qtd: Number(v) })} /><SelectGroup label="Material" value={newPart.mat} onChange={v => setNewPart({ ...newPart, mat: v as 'white' | 'wood' })} options={[{ value: 'white', label: 'Branco' }, { value: 'wood', label: 'Madeirado' }]} /></div></div>
      </Modal>
    </>
  );
};

export default CorteModule;