import { useMemo } from 'react';
import { CheckCircle2, Ruler, TriangleAlert } from 'lucide-react';
import { Button, Card } from '@/components/marcenaria/shared';
import type { EnvironmentAnalysis, EnvironmentElement } from '../types';
import { buildEnvironmentGeometry, validateEnvironmentGeometry, type EnvironmentGeometry } from '../services/environmentGeometry';

const num = (value: string) => value === '' ? null : Number(value);
type MeasurementKey = 'roomWidthM' | 'roomHeightM' | 'roomDepthM' | 'ceilingHeightM';
const measurementFields: Array<[MeasurementKey, string]> = [
  ['roomWidthM', 'Largura do ambiente'],
  ['roomHeightM', 'Altura da área'],
  ['roomDepthM', 'Profundidade'],
  ['ceilingHeightM', 'Pé-direito'],
];

export function EnvironmentGeometryPanel({ analysis, onChange }: { analysis: EnvironmentAnalysis; onChange: (analysis: EnvironmentAnalysis) => void }) {
  const geometry = analysis.geometry || buildEnvironmentGeometry(analysis);
  const validation = useMemo(() => validateEnvironmentGeometry(analysis, geometry), [analysis, geometry]);
  const walls = analysis.elements.filter((item) => item.type === 'wall');
  const openings = analysis.elements.filter((item) => item.type === 'window' || item.type === 'door');

  const patch = (next: Partial<EnvironmentGeometry>) => onChange({ ...analysis, geometry: { ...geometry, ...next }, confirmedByIara: false });
  const patchWall = (id: string, value: number | null) => {
    const wallWidthsM = { ...geometry.wallWidthsM };
    if (value == null) delete wallWidthsM[id];
    else wallWidthsM[id] = value;
    patch({ wallWidthsM });
  };
  const openingData = (id: string) => geometry.openings.find((item) => item.elementId === id) || { elementId: id, wallElementId: null, offsetFromWallStartM: null, sillHeightM: null };
  const patchOpening = (id: string, next: Partial<EnvironmentGeometry['openings'][number]>) => patch({ openings: geometry.openings.map((item) => item.elementId === id ? { ...item, ...next } : item).concat(geometry.openings.some((item) => item.elementId === id) ? [] : [{ ...openingData(id), ...next }]) });

  const hasAnyMeasurement = [geometry.roomWidthM, geometry.roomHeightM, geometry.roomDepthM, geometry.ceilingHeightM].some((v) => v != null) || Object.keys(geometry.wallWidthsM).length > 0;
  return <Card className="mt-3 p-4 border-indigo-200 bg-indigo-50/40">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-indigo-600 text-white p-2"><Ruler size={18}/></div>
      <div className="flex-1"><h4 className="font-bold text-slate-900">Levantamento técnico — medidas-chave</h4><p className="text-[11px] text-slate-600 mt-1">A foto ajuda a entender a geometria, mas medidas de fabricação devem ser confirmadas. Informe só o que você mediu no local.</p></div>
    </div>

    <div className="grid grid-cols-2 gap-2 mt-3">
      {measurementFields.map(([key, label]) => <label key={key} className="text-[10px] text-slate-500">{label}<input type="number" min="0" step="0.01" value={geometry[key] ?? ''} onChange={(e) => patch({ [key]: num(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs" placeholder="m"/></label>)}
    </div>

    {walls.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-slate-800 mb-2">Largura das paredes</div><div className="space-y-2">{walls.map((wall) => <label key={wall.id} className="block text-[10px] text-slate-500">{wall.label}<input type="number" min="0" step="0.01" value={geometry.wallWidthsM[wall.id] ?? wall.widthM ?? ''} onChange={(e) => patchWall(wall.id, num(e.target.value))} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs" placeholder="m"/></label>)}</div></div>}

    {openings.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-slate-800 mb-2">Posição das aberturas</div><div className="space-y-3">{openings.map((item: EnvironmentElement) => { const data = openingData(item.id); return <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs font-semibold text-slate-800">{item.label}</div><div className="grid grid-cols-2 gap-2 mt-2"><label className="text-[10px] text-slate-500">Parede<select value={data.wallElementId || ''} onChange={(e) => patchOpening(item.id, { wallElementId: e.target.value || null })} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="">não definida</option>{walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.label}</option>)}</select></label><label className="text-[10px] text-slate-500">Início a partir do canto (m)<input type="number" min="0" step="0.01" value={data.offsetFromWallStartM ?? ''} onChange={(e) => patchOpening(item.id, { offsetFromWallStartM: num(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="m"/></label>{item.type === 'window' && <label className="text-[10px] text-slate-500">Peitoril (m)<input type="number" min="0" step="0.01" value={data.sillHeightM ?? ''} onChange={(e) => patchOpening(item.id, { sillHeightM: num(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="m"/></label>}</div></div> })}</div></div>}

    <div className={`mt-4 rounded-lg border p-3 ${validation.valid && validation.criticalMissing.length === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-2 text-xs font-semibold">{validation.valid && validation.criticalMissing.length === 0 ? <CheckCircle2 size={15} className="text-emerald-600"/> : <TriangleAlert size={15} className="text-amber-600"/>}{validation.valid ? 'Geometria consistente' : 'Há correções necessárias antes da geração'}</div>
      {validation.errors.length > 0 && <ul className="mt-1 text-[11px] text-red-700 list-disc pl-4">{validation.errors.map((item) => <li key={item}>{item}</li>)}</ul>}
      {validation.criticalMissing.length > 0 && <p className="mt-1 text-[11px] text-amber-800">Ainda falta confirmar: {validation.criticalMissing.join(', ')}.</p>}
      {validation.warnings.length > 0 && <p className="mt-1 text-[11px] text-slate-600">{validation.warnings.join(' ')}</p>}
      {!hasAnyMeasurement && <p className="mt-1 text-[11px] text-slate-600">Comece pelo pé-direito e pela largura das paredes que receberão o móvel.</p>}
    </div>

    <Button variant="secondary" className="mt-3 w-full" onClick={() => onChange({ ...analysis, geometry: { ...geometry, source: 'user', validatedAt: new Date().toISOString() }, confirmedByIara: false })} disabled={!validation.valid}>Registrar medidas para nova conferência da IARA</Button>
  </Card>;
}
