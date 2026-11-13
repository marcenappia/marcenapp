import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Box, Grid3X3, Plus, Save, Trash2 } from 'lucide-react';
import { canPlaceFurniture, clampFurniturePosition, findNextFurniturePosition } from './furnitureLayout';
import { buildFurniturePackage } from '@/lib/furniture/package';
import { optimizeCutList } from '@/lib/cut/maxRects';
import { analyzeFloorPlanAndQueueRender } from '@/modules/iara/services/planService';

type Project = { id: string; nome?: string | null; name?: string | null };
type ModuleItem = { id: string; kind: string; label: string; x: number; y: number; width: number; height: number; depth: number; material: string; carcassThickness?: number | null; backThickness?: number | null; shelfCount?: number; doorCount?: number; doorFrontWidth?: number | null; doorFrontHeight?: number | null; drawerCount?: number; drawerFrontWidth?: number | null; drawerFrontHeight?: number | null; drawerBoxWidth?: number | null; drawerBoxHeight?: number | null; drawerBoxDepth?: number | null; drawerMaterial?: string };
type OpeningItem = { id: string; type: 'door' | 'window'; wall: 'top' | 'right' | 'bottom' | 'left'; position: number; width: number; height: number };
type EditorSnapshot = { room: { width: number; depth: number; height: number }; modules: ModuleItem[]; openings: OpeningItem[]; fabrication?: { sheetWidth: number; sheetHeight: number; kerf: number; sheetPrices: Record<string, number> } };

const catalog = [
  { kind: 'base', label: 'Balcão inferior', width: 800, height: 720, depth: 560 },
  { kind: 'upper', label: 'Armário aéreo', width: 800, height: 700, depth: 350 },
  { kind: 'tower', label: 'Torre quente', width: 700, height: 2200, depth: 600 },
  { kind: 'drawer', label: 'Gaveteiro', width: 600, height: 720, depth: 560 },
  { kind: 'closet', label: 'Módulo de closet', width: 900, height: 2400, depth: 600 },
];

const defaultSnapshot: EditorSnapshot = { room: { width: 3400, depth: 2800, height: 2700 }, modules: [], openings: [] };

export default function VisualFurnitureEditor({ projectId: initialProjectId }: { projectId?: string }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(defaultSnapshot);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [sendingToIara, setSendingToIara] = useState(false);
  const [sheetWidth, setSheetWidth] = useState(2750);
  const [sheetHeight, setSheetHeight] = useState(1850);
  const [kerf, setKerf] = useState(3);
  const [sheetPrices, setSheetPrices] = useState<Record<string, number>>({});
  const dragRef = useRef<{ id: string; pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const selected = snapshot.modules.find(item => item.id === selectedId);
  const engineering = useMemo(() => {
    const eligible = snapshot.modules.filter(item => Number(item.carcassThickness) > 0);
    const results = eligible.map(item => buildFurniturePackage({
      id: item.id, name: item.label, width: item.width, height: item.height, depth: item.depth,
      carcassThickness: Number(item.carcassThickness),
      ...(Number(item.backThickness) > 0 ? { backThickness: Number(item.backThickness), backMaterial: item.material } : {}),
      shelfCount: Math.max(0, Math.floor(item.shelfCount ?? 0)),
      material: item.material, grainSensitive: true,
      modules: [{
        id: item.id, name: item.label, width: item.width, height: item.height, depth: item.depth, material: item.material,
        ...(Number(item.doorCount) > 0 ? { door: { count: Number(item.doorCount), frontWidth: Number(item.doorFrontWidth), frontHeight: Number(item.doorFrontHeight), material: item.material } } : {}),
        ...(Number(item.drawerCount) > 0 ? { drawer: { count: Number(item.drawerCount), frontWidth: Number(item.drawerFrontWidth), frontHeight: Number(item.drawerFrontHeight), boxWidth: Number(item.drawerBoxWidth), boxHeight: Number(item.drawerBoxHeight), boxDepth: Number(item.drawerBoxDepth), material: item.drawerMaterial || item.material } } : {}),
      }],
    }));
    const parts = results.flatMap(result => result.parts.filter(part => !(part.role === 'shelf' && part.id.endsWith(':estrutura'))));
    const materials = [...new Set(parts.map(part => part.material))];
    const cutPlan = sheetWidth > 0 && sheetHeight > 0 && parts.length
      ? optimizeCutList(parts.map(part => ({ id: part.id, width: part.width, height: part.height, quantity: part.quantity, material: part.material, grainSensitive: part.grainSensitive, allowRotation: part.allowRotation })), materials.map((material, index) => ({ id: `sheet-${index + 1}`, width: sheetWidth, height: sheetHeight, material })), kerf)
      : null;
    const sheetMaterialCost = cutPlan?.sheets.reduce((sum, sheet) => sum + Math.max(0, sheetPrices[sheet.material] || 0), 0) ?? 0;
    const missingSheetPrices = [...new Set(cutPlan?.sheets.map(sheet => sheet.material).filter(material => !(Number(sheetPrices[material]) > 0)) ?? [])];
    return { eligibleCount: eligible.length, missingThickness: snapshot.modules.filter(item => !(Number(item.carcassThickness) > 0)).map(item => item.label), materials, sheetMaterialCost, missingSheetPrices, results, parts, blockers: results.flatMap(result => result.blockers), assumptions: results.flatMap(result => result.assumptions), cutPlan };
  }, [snapshot.modules, sheetWidth, sheetHeight, kerf, sheetPrices]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase.from('projects').select('id,nome,name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        if (!alive) return;
        const rows = (data ?? []) as Project[];
        setProjects(rows);
        setProjectId(current => current || rows[0]?.id || '');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !projectId) { setSnapshot(defaultSnapshot); return; }
    let alive = true;
    void supabase.from('project_versions').select('id,version_number,snapshot').eq('user_id', user.id).eq('project_id', projectId).order('version_number', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const stored = data?.snapshot && typeof data.snapshot === 'object' ? data.snapshot as Record<string, unknown> : {};
        const editor = stored.visualFurnitureEditor as EditorSnapshot | undefined;
        setSnapshot(editor?.room && Array.isArray(editor.modules) ? { ...editor, openings: Array.isArray(editor.openings) ? editor.openings : [] } : defaultSnapshot);
        if (editor?.fabrication) {
          setSheetWidth(editor.fabrication.sheetWidth || 2750);
          setSheetHeight(editor.fabrication.sheetHeight || 1850);
          setKerf(editor.fabrication.kerf ?? 3);
          setSheetPrices(editor.fabrication.sheetPrices || {});
        } else {
          setSheetWidth(2750); setSheetHeight(1850); setKerf(3); setSheetPrices({});
        }
        setSelectedId('');
      });
    return () => { alive = false; };
  }, [user, projectId]);

  const updateRoom = (key: keyof EditorSnapshot['room'], value: number) => {
    const nextRoom = { ...snapshot.room, [key]: Math.max(100, Math.min(20000, value || 100)) };
    const placed: ModuleItem[] = [];
    for (const item of snapshot.modules) {
      const resized = { ...item, width: Math.min(item.width, nextRoom.width), depth: Math.min(item.depth, nextRoom.depth) };
      const position = clampFurniturePosition({ x: item.x, y: item.y }, resized, nextRoom);
      const candidate = { ...resized, ...position };
      if (canPlaceFurniture(candidate, placed, nextRoom)) { placed.push(candidate); continue; }
      const free = findNextFurniturePosition(nextRoom, placed, { width: resized.width, depth: resized.depth });
      if (!free) { setMessage('Não é possível reduzir o ambiente: os módulos não cabem sem sobreposição. Aumente a área ou remova módulos primeiro.'); return; }
      placed.push({ ...resized, ...free });
    }
    const openings = snapshot.openings.map(opening => {
      const wallLength = opening.wall === 'left' || opening.wall === 'right' ? nextRoom.depth : nextRoom.width;
      const width = Math.min(opening.width, wallLength);
      return { ...opening, width, position: Math.max(0, Math.min(wallLength - width, opening.position)) };
    });
    setSnapshot({ ...snapshot, room: nextRoom, modules: placed, openings });
    setMessage('');
  };
  const startModuleDrag = (event: React.PointerEvent<HTMLButtonElement>, item: ModuleItem) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: item.id, pointerX: event.clientX, pointerY: event.clientY, x: item.x, y: item.y };
    setSelectedId(item.id);
  };
  const moveModuleDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const current = snapshot;
    const item = current.modules.find(candidate => candidate.id === drag.id);
    if (!item) return;
    const next = { ...item, x: drag.x + (event.clientX - drag.pointerX) / scale, y: drag.y + (event.clientY - drag.pointerY) / scale };
    Object.assign(next, clampFurniturePosition({ x: next.x, y: next.y }, next, current.room));
    const others = current.modules.filter(candidate => candidate.id !== drag.id);
    if (!canPlaceFurniture(next, others, current.room)) return;
    setSnapshot({ ...current, modules: current.modules.map(candidate => candidate.id === drag.id ? next : candidate) });
  };
  const addModule = (item: typeof catalog[number]) => {
    const position = findNextFurniturePosition(snapshot.room, snapshot.modules, { width: item.width, depth: item.depth });
    if (!position) {
      setMessage('Não há espaço livre para esse módulo. Aumente as dimensões do ambiente ou reorganize os módulos.');
      return;
    }
    const id = globalThis.crypto?.randomUUID?.() ?? `module-${Date.now()}`;
    const next: ModuleItem = { id, ...item, ...position, material: 'MDF a definir', carcassThickness: null, backThickness: null, shelfCount: 0, doorCount: 0, drawerCount: 0 };
    setSnapshot(current => ({ ...current, modules: [...current.modules, next] }));
    setSelectedId(id);
    setMessage('');
  };
  const updateSelected = (patch: Partial<ModuleItem>) => {
    const current = snapshot;
    const item = current.modules.find(candidate => candidate.id === selectedId);
    if (!item) return;
    const next = { ...item, ...patch };
    next.width = Math.max(100, Math.min(current.room.width, next.width));
    next.depth = Math.max(100, Math.min(current.room.depth, next.depth));
    Object.assign(next, clampFurniturePosition({ x: next.x, y: next.y }, next, current.room));
    const others = current.modules.filter(candidate => candidate.id !== selectedId);
    if (!canPlaceFurniture(next, others, current.room)) {
      setMessage('Esse ajuste sobrepõe outro módulo ou ultrapassa o ambiente. Reposicione ou reduza as medidas.');
      return;
    }
    setSnapshot({ ...current, modules: current.modules.map(candidate => candidate.id === selectedId ? next : candidate) });
    setMessage('');
  };
  const addOpening = (type: OpeningItem['type']) => setSnapshot(current => ({ ...current, openings: [...current.openings, { id: globalThis.crypto?.randomUUID?.() ?? `opening-${Date.now()}`, type, wall: 'top', position: 300, width: type === 'door' ? 800 : 1200, height: type === 'door' ? 2100 : 1000 }] }));
  const updateOpening = (id: string, patch: Partial<OpeningItem>) => setSnapshot(current => ({ ...current, openings: current.openings.map(opening => {
    if (opening.id !== id) return opening;
    const next = { ...opening, ...patch };
    const wallLength = next.wall === 'left' || next.wall === 'right' ? current.room.depth : current.room.width;
    next.width = Math.max(100, Math.min(wallLength, next.width));
    next.position = Math.max(0, Math.min(wallLength - next.width, next.position));
    return next;
  }) }));
  const sendToIara = async () => {
    if (!user || !projectId) { setMessage('Selecione um projeto antes de enviar à IARA.'); return; }
    if (!planFile) { setMessage('Selecione uma foto ou planta baixa.'); return; }
    if (!planFile.type.startsWith('image/')) { setMessage('O arquivo precisa ser uma imagem.'); return; }
    if (planFile.size > 12 * 1024 * 1024) { setMessage('A imagem deve ter até 12 MB.'); return; }

    setSendingToIara(true);
    setMessage('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler a imagem.'));
        reader.onerror = () => reject(new Error('Falha ao ler a imagem selecionada.'));
        reader.readAsDataURL(planFile);
      });
      const planBase64 = dataUrl.split(',')[1] || '';
      if (!planBase64) throw new Error('A imagem não contém dados válidos.');
      const manualContext = {
        room: snapshot.room,
        openings: snapshot.openings,
        modules: snapshot.modules.map(({ id, kind, label, x, y, width, height, depth, material }) => ({ id, kind, label, x, y, width, height, depth, material })),
      };
      const correlationId = globalThis.crypto?.randomUUID?.() ?? `iara-${Date.now()}`;
      const result = await analyzeFloorPlanAndQueueRender({
        prompt: `Analise esta imagem para o projeto e prepare uma perspectiva fiel. Levantamento manual informado no editor (mm; use como dados fornecidos, não invente complementos): ${JSON.stringify(manualContext)}. Preserve proporções, paredes, vãos e elementos fixos. Diferencie medidas fornecidas, estimadas e desconhecidas.`,
        planBase64,
        mimeType: planFile.type,
      }, {
        userId: user.id,
        projectId,
        correlationId,
        generation: Date.now(),
      });
      if (!result.ok) throw new Error(result.error);
      setMessage(`IARA analisou a imagem e colocou a perspectiva na fila do Studio. Plano: ${result.data.planId} · análise: ${result.data.analysisId}.`);
      setPlanFile(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar a imagem à IARA.');
    } finally {
      setSendingToIara(false);
    }
  };

  const save = async () => {
    if (!user || !projectId) { setMessage('Selecione um projeto para salvar.'); return; }
    setSaving(true); setMessage('');
    try {
      const { data: current, error: readError } = await supabase
        .from('project_versions')
        .select('id,version_number,status,snapshot,environment_id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (readError) throw readError;

      const prior = current?.snapshot && typeof current.snapshot === 'object' ? current.snapshot as Record<string, unknown> : {};
      const snapshotToSave: EditorSnapshot = { ...snapshot, fabrication: { sheetWidth, sheetHeight, kerf, sheetPrices } };
      const merged = { ...prior, visualFurnitureEditor: snapshotToSave, visualFurnitureEditorUpdatedAt: new Date().toISOString() };

      let hasApprovalOrFreeze = false;
      if (current?.id) {
        const [{ data: approval, error: approvalError }, { data: freeze, error: freezeError }] = await Promise.all([
          supabase.from('project_approvals').select('id').eq('project_version_id', current.id).not('approved_at', 'is', null).limit(1).maybeSingle(),
          supabase.from('project_production_freezes').select('id').eq('project_version_id', current.id).limit(1).maybeSingle(),
        ]);
        if (approvalError) throw approvalError;
        if (freezeError) throw freezeError;
        hasApprovalOrFreeze = Boolean(approval || freeze);
      }

      const canUpdateDraft = current?.id && current.status === 'draft' && !hasApprovalOrFreeze;
      if (canUpdateDraft) {
        const { error } = await supabase.from('project_versions').update({ snapshot: merged }).eq('id', current.id).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('project_versions').insert({
          project_id: projectId,
          user_id: user.id,
          version_number: (current?.version_number ?? 0) + 1,
          status: 'draft',
          snapshot: merged,
          environment_id: current?.environment_id ?? null,
        });
        if (error) throw error;
      }
      setMessage(canUpdateDraft ? 'Estudo salvo na versão em rascunho.' : 'Nova versão de rascunho criada; a versão aprovada/congelada foi preservada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o ambiente.');
    } finally { setSaving(false); }
  };

  const scale = useMemo(() => Math.min(620 / snapshot.room.width, 420 / snapshot.room.depth), [snapshot.room]);
  if (loading) return <div className="p-8 text-sm text-slate-500">Carregando projetos…</div>;

  return <div className="mx-auto w-full max-w-7xl space-y-5 p-3 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Projeto / Marcenaria</p><h1 className="text-2xl font-black text-slate-950">Editor visual de móveis</h1><p className="mt-1 text-sm text-slate-500">Monte módulos, ajuste medidas e registre o estudo no projeto.</p></div>
      <button type="button" onClick={() => void save()} disabled={saving || !projectId} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/>{saving ? 'Salvando…' : 'Salvar projeto'}</button>
    </header>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <label className="min-w-[220px] flex-1 text-xs font-bold text-slate-600">Projeto<select value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{projects.map(p => <option key={p.id} value={p.id}>{p.nome || p.name || 'Projeto sem nome'}</option>)}</select></label>
          {(['width','depth','height'] as const).map(key => <label key={key} className="text-xs font-bold text-slate-600">{key === 'width' ? 'Largura' : key === 'depth' ? 'Profundidade' : 'Pé-direito'} (mm)<input type="number" min="100" max="20000" value={snapshot.room[key]} onChange={e => updateRoom(key, Number(e.target.value))} className="mt-1 min-h-11 w-28 rounded-lg border border-slate-200 px-2 text-sm"/></label>)}
        </div>
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600"><Grid3X3 size={15}/> Planta esquemática · medidas em milímetros</div>
          <div className="relative mx-auto border-2 border-slate-500 bg-white" style={{ width: snapshot.room.width * scale, height: snapshot.room.depth * scale, minWidth: 260, minHeight: 220, backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px),linear-gradient(90deg,#e2e8f0 1px,transparent 1px)', backgroundSize: '20px 20px' }}>
            {snapshot.openings.map(opening => {
              const along = opening.position * scale;
              const span = Math.max(24, opening.width * scale);
              const markerStyle = opening.wall === 'top' ? { left: along, top: -5, width: span, height: 10 } : opening.wall === 'bottom' ? { left: along, bottom: -5, width: span, height: 10 } : opening.wall === 'left' ? { left: -5, top: along, width: 10, height: span } : { right: -5, top: along, width: 10, height: span };
              return <div key={opening.id} title={`${opening.type === 'door' ? 'Porta' : 'Janela'} · ${opening.width} mm`} className={`absolute z-20 ${opening.type === 'door' ? 'bg-amber-500' : 'bg-sky-500'}`} style={markerStyle} />;
            })}
            {snapshot.modules.map(item => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} onPointerDown={event => startModuleDrag(event, item)} onPointerMove={moveModuleDrag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} className={`absolute z-10 flex touch-none cursor-move flex-col items-center justify-center overflow-hidden border-2 p-1 text-center text-[10px] font-bold ${selectedId === item.id ? 'border-indigo-600 bg-indigo-100 text-indigo-900' : 'border-slate-500 bg-slate-200 text-slate-800'}`} style={{ left: item.x * scale, top: item.y * scale, width: Math.max(34, item.width * scale), height: Math.max(28, item.depth * scale) }}><span>{item.label}</span><span>{item.width} × {item.depth}</span></button>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">Azul = janela · âmbar = porta. Arraste os módulos para reposicionar; o editor bloqueia sobreposição e saída dos limites.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-black"><Box size={16}/> Biblioteca de módulos</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{catalog.map(item => <button key={item.kind} type="button" onClick={() => addModule(item)} className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:border-indigo-300 hover:bg-indigo-50"><span>{item.label}<small className="mt-1 block font-medium text-slate-500">{item.width} × {item.height} × {item.depth} mm</small></span><Plus size={15}/></button>)}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-black">Paredes e aberturas</h2><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => addOpening('door')} className="min-h-10 rounded-lg border border-amber-200 px-3 text-xs font-bold text-amber-800">+ Porta</button><button type="button" onClick={() => addOpening('window')} className="min-h-10 rounded-lg border border-sky-200 px-3 text-xs font-bold text-sky-800">+ Janela</button></div>
          {snapshot.openings.length ? <div className="mt-3 space-y-3">{snapshot.openings.map(opening => <div key={opening.id} className="rounded-xl border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">{opening.type === 'door' ? 'Porta' : 'Janela'}</span><button type="button" onClick={() => setSnapshot(current => ({ ...current, openings: current.openings.filter(item => item.id !== opening.id) }))} className="text-xs font-bold text-red-700">Remover</button></div><label className="block text-xs font-semibold text-slate-600">Parede<select value={opening.wall} onChange={e => updateOpening(opening.id, { wall: e.target.value as OpeningItem['wall'] })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"><option value="top">Frente</option><option value="right">Direita</option><option value="bottom">Fundo</option><option value="left">Esquerda</option></select></label><div className="mt-2 grid grid-cols-2 gap-2">{(['position','width','height'] as const).map(key => <label key={key} className="text-xs font-semibold text-slate-600">{key === 'position' ? 'Distância do canto' : key === 'width' ? 'Largura' : 'Altura'} (mm)<input type="number" min="0" value={opening[key]} onChange={e => updateOpening(opening.id, { [key]: Math.max(0, Number(e.target.value)) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2" /></label>)}</div></div>)}</div> : <p className="mt-2 text-xs text-slate-500">Adicione portas e janelas e informe a parede e as medidas conhecidas.</p>}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-black">Módulo selecionado</h2>{selected ? <div className="mt-3 space-y-3">
          <p className="text-xs font-semibold text-slate-500">{selected.label}</p>
          {(['width','height','depth','x','y'] as const).map(key => <label key={key} className="block text-xs font-bold text-slate-600">{({width:'Largura',height:'Altura',depth:'Profundidade',x:'Posição X',y:'Posição Y'})[key]} (mm)<input type="number" min="0" value={selected[key]} onChange={e => updateSelected({[key]: Math.max(0, Number(e.target.value))})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>)}
          <label className="block text-xs font-bold text-slate-600">Material / acabamento<input value={selected.material} onChange={e => updateSelected({material:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Ex.: MDF Gianduia"/></label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-600">Espessura da caixa (mm)<input type="number" min="1" max="50" value={selected.carcassThickness ?? ''} onChange={e => updateSelected({ carcassThickness: e.target.value === '' ? null : Math.max(1, Number(e.target.value)) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" placeholder="Obrigatória"/></label>
            <label className="block text-xs font-bold text-slate-600">Espessura do fundo (mm)<input type="number" min="1" max="20" value={selected.backThickness ?? ''} onChange={e => updateSelected({ backThickness: e.target.value === '' ? null : Math.max(1, Number(e.target.value)) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" placeholder="Opcional"/></label>
            <label className="col-span-2 block text-xs font-bold text-slate-600">Quantidade de prateleiras<input type="number" min="0" max="50" value={selected.shelfCount ?? 0} onChange={e => updateSelected({ shelfCount: Math.max(0, Math.min(50, Math.floor(Number(e.target.value) || 0))) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2 text-sm"/></label>
            <label className="block text-xs font-bold text-slate-600">Quantidade de portas<input type="number" min="0" max="30" value={selected.doorCount ?? 0} onChange={e => updateSelected({ doorCount: Math.max(0, Math.min(30, Math.floor(Number(e.target.value) || 0))) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2 text-sm"/></label>
            <label className="block text-xs font-bold text-slate-600">Quantidade de gavetas<input type="number" min="0" max="30" value={selected.drawerCount ?? 0} onChange={e => updateSelected({ drawerCount: Math.max(0, Math.min(30, Math.floor(Number(e.target.value) || 0))) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2 text-sm"/></label>
            {Number(selected.doorCount) > 0 && <>
              <label className="block text-xs font-bold text-slate-600">Largura frente porta (mm)<input type="number" min="1" value={selected.doorFrontWidth ?? ''} onChange={e => updateSelected({ doorFrontWidth: e.target.value === '' ? null : Number(e.target.value) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
              <label className="block text-xs font-bold text-slate-600">Altura frente porta (mm)<input type="number" min="1" value={selected.doorFrontHeight ?? ''} onChange={e => updateSelected({ doorFrontHeight: e.target.value === '' ? null : Number(e.target.value) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
            </>}
            {Number(selected.drawerCount) > 0 && <>
              <label className="block text-xs font-bold text-slate-600">Largura frente gaveta (mm)<input type="number" min="1" value={selected.drawerFrontWidth ?? ''} onChange={e => updateSelected({ drawerFrontWidth: e.target.value === '' ? null : Number(e.target.value) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
              <label className="block text-xs font-bold text-slate-600">Altura frente gaveta (mm)<input type="number" min="1" value={selected.drawerFrontHeight ?? ''} onChange={e => updateSelected({ drawerFrontHeight: e.target.value === '' ? null : Number(e.target.value) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
              <label className="block text-xs font-bold text-slate-600">Largura caixa gaveta (mm)<input type="number" min="1" value={selected.drawerBoxWidth ?? ''} onChange={e => updateSelected({ drawerBoxWidth: e.target.value === '' ? null : Number(e.target.value) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
              <label className="block text-xs font-bold text-slate-600">Altura caixa gaveta (mm)<input type="number" min="1" value={selected.drawerBoxHeight ?? ''} onChange={e => updateSelected({ drawerBoxHeight: e.target.value === '' ? null : Number(e.target.value) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
              <label className="col-span-2 block text-xs font-bold text-slate-600">Profundidade caixa gaveta (mm)<input type="number" min="1" value={selected.drawerBoxDepth ?? ''} onChange={e => updateSelected({ drawerBoxDepth: e.target.value === '' ? null : Number(e.target.value) })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
            </>
          </div>
          <button type="button" onClick={() => { setSnapshot(current => ({...current,modules:current.modules.filter(item => item.id !== selectedId)})); setSelectedId(''); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"><Trash2 size={14}/> Remover módulo</button>
        </div> : <p className="mt-2 text-xs text-slate-500">Adicione um módulo ou selecione um existente na planta para editar suas medidas e acabamento.</p>}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-black">Engenharia · lista de peças e plano de corte</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">A engenharia só calcula módulos com espessura de caixa informada. Não inventa folgas, ferragens, encaixes ou dimensões ausentes.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-slate-600">Chapa · largura (mm)<input type="number" min="1" value={sheetWidth} onChange={e => setSheetWidth(Math.max(1, Number(e.target.value)))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
            <label className="text-xs font-semibold text-slate-600">Chapa · altura (mm)<input type="number" min="1" value={sheetHeight} onChange={e => setSheetHeight(Math.max(1, Number(e.target.value)))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
            <label className="col-span-2 text-xs font-semibold text-slate-600">Kerf / espessura do corte (mm)<input type="number" min="0" step="0.1" value={kerf} onChange={e => setKerf(Math.max(0, Number(e.target.value)))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2"/></label>
            {engineering.materials.map(material => <label key={material} className="col-span-2 text-xs font-semibold text-slate-600">Preço por chapa · {material} (R$)<input type="number" min="0" step="0.01" value={sheetPrices[material] ?? ''} onChange={e => setSheetPrices(current => ({ ...current, [material]: Math.max(0, Number(e.target.value) || 0) }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-2" placeholder="Informe o preço real da chapa"/></label>)}
          </div>
          {engineering.missingThickness.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Informe a espessura da caixa destes módulos para incluir na engenharia: {engineering.missingThickness.join(', ')}.</p>}
          {engineering.blockers.map((blocker, index) => <p key={index} className="mt-2 text-xs text-red-700">{blocker}</p>)}
          {engineering.parts.length > 0 ? <div className="mt-3 space-y-2">
            <p className="text-xs font-bold text-slate-700">{engineering.parts.reduce((sum, part) => sum + part.quantity, 0)} peças calculadas · {engineering.eligibleCount} módulos</p>
            <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">Peça</th><th className="p-2">Medida (mm)</th><th className="p-2">Qtd.</th><th className="p-2">Material</th></tr></thead><tbody>{engineering.parts.map(part => <tr key={part.id} className="border-t border-slate-100"><td className="p-2">{part.name}</td><td className="p-2 tabular-nums">{part.width} × {part.height}</td><td className="p-2">{part.quantity}</td><td className="p-2">{part.material}</td></tr>)}</tbody></table>
            </div>
            {engineering.cutPlan && <div className="rounded-lg bg-slate-50 p-3 text-xs">
              <p className="font-bold">Plano de corte preliminar</p>
              <p className="mt-1">{engineering.cutPlan.sheets.length} chapas · aproveitamento {engineering.cutPlan.utilizationPct.toFixed(1)}% · perda {(engineering.cutPlan.wasteArea / 1000000).toFixed(2)} m²</p>
              {engineering.missingSheetPrices.length === 0 && engineering.sheetMaterialCost > 0 && <p className="mt-1 font-bold">Subtotal estimado das chapas: {engineering.sheetMaterialCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
              {engineering.missingSheetPrices.length > 0 && <p className="mt-1 text-amber-800">Informe o preço por chapa para calcular o subtotal de material: {engineering.missingSheetPrices.join(', ')}.</p>}
              <p className="mt-1 text-[11px] text-slate-500">Subtotal somente das chapas calculadas. Não inclui ferragens, fita de borda, usinagem, mão de obra, impostos, transporte ou perdas adicionais.</p>
              {engineering.cutPlan.unplaced.length > 0 && <p className="mt-1 text-red-700">{engineering.cutPlan.unplaced.length} peça(s) não couberam nas chapas informadas. Confira as dimensões e materiais.</p>}
              {engineering.cutPlan.sheets.map(sheet => <p key={sheet.id} className="mt-1">Chapa {sheet.id}: {sheet.material} · {sheet.placements.length} peças · {sheet.utilizationPct.toFixed(1)}%</p>)}
            </div>}
            {engineering.assumptions.map((assumption, index) => <p key={index} className="text-[11px] text-amber-800">{assumption}</p>)}
          </div> : <p className="mt-3 text-xs text-slate-500">Selecione um módulo e informe espessura da caixa e material para gerar a lista técnica.</p>}
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-white p-4">
          <h2 className="text-sm font-black">IARA · analisar imagem e preparar render</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Envie uma foto do ambiente ou planta baixa. A IARA usa a imagem e o levantamento deste editor para registrar a análise e enfileirar a perspectiva no Studio.</p>
          <input type="file" accept="image/*" onChange={e => setPlanFile(e.target.files?.[0] ?? null)} className="mt-3 block min-h-11 w-full text-xs file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:font-bold" />
          {planFile && <p className="mt-2 truncate text-xs text-slate-600">{planFile.name}</p>}
          <button type="button" onClick={() => void sendToIara()} disabled={sendingToIara || !planFile || !projectId} className="mt-3 min-h-11 w-full rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white disabled:opacity-50">{sendingToIara ? 'IARA analisando…' : 'Analisar com IARA e preparar render'}</button>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">A confirmação inicia análise por IA e coloca a geração visual na fila do Studio; pode consumir créditos do provedor configurado.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black text-amber-900">Validação de fabricação</p><p className="mt-1 text-xs leading-5 text-amber-800">As dimensões iniciais são referências editáveis. Confirme medidas reais, espessuras, folgas, ferragens e esquadro antes de gerar peças ou plano de corte.</p></div>
        {message && <p role="status" className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">{message}</p>}
      </aside>
    </section>
  </div>;
}
