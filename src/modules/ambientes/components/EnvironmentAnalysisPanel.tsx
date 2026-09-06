import { CheckCircle2, CircleAlert, Ruler, ScanSearch, ShieldCheck, TriangleAlert, Pencil, RotateCcw } from 'lucide-react';
import { Button, Card } from '@/components/marcenaria/shared';
import type { EnvironmentAnalysis, EnvironmentElement, EnvironmentElementType, MeasurementStatus } from '../types';

const labels: Record<string, string> = {
  wall: 'Parede', corner: 'Canto', window: 'Janela', door: 'Porta', outlet: 'Tomada', switch: 'Interruptor', baseboard: 'Rodapé', obstacle: 'Obstáculo',
};

const statusLabel: Record<MeasurementStatus, string> = { confirmed: 'confirmada', estimated: 'estimada', unknown: 'não medida' };
const statusClass: Record<MeasurementStatus, string> = {
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-800', estimated: 'border-amber-200 bg-amber-50 text-amber-800', unknown: 'border-slate-200 bg-slate-50 text-slate-600',
};
const typeOptions: Array<{ value: EnvironmentElementType; label: string }> = [
  { value: 'wall', label: 'Parede' }, { value: 'corner', label: 'Canto' }, { value: 'window', label: 'Janela' }, { value: 'door', label: 'Porta' },
  { value: 'outlet', label: 'Tomada' }, { value: 'switch', label: 'Interruptor' }, { value: 'baseboard', label: 'Rodapé' }, { value: 'obstacle', label: 'Obstáculo' },
];

function updateElement(analysis: EnvironmentAnalysis, id: string, patch: Partial<EnvironmentElement>): EnvironmentAnalysis {
  return { ...analysis, confirmedByIara: false, elements: analysis.elements.map(item => item.id === id ? { ...item, ...patch } : item) };
}

export function EnvironmentAnalysisPanel({ analysis, analyzing, confirming, onAnalyze, onConfirm, onChange }: {
  analysis: EnvironmentAnalysis | null; analyzing: boolean; confirming: boolean; onAnalyze: () => void; onConfirm: () => void; onChange: (analysis: EnvironmentAnalysis) => void;
}) {
  if (!analysis && !analyzing) return (
    <Card className="p-4 border-indigo-200 bg-indigo-50/60">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-600 text-white p-2"><ScanSearch size={20} /></div><div className="flex-1">
        <h3 className="font-bold text-slate-900">Análise do ambiente</h3><p className="text-xs text-slate-600 mt-1">Antes de criar o móvel, a IARA lê paredes, cantos, aberturas e pontos elétricos da foto.</p>
        <Button onClick={onAnalyze} className="mt-3 bg-indigo-600 hover:bg-indigo-700 border-none" icon={ScanSearch}>Analisar ambiente</Button>
      </div></div>
    </Card>
  );
  if (analyzing) return <Card className="p-4 border-indigo-200"><div className="flex items-center gap-3"><ScanSearch className="text-indigo-600 animate-pulse" size={20}/><div><strong>Estou lendo o ambiente…</strong><p className="text-xs text-slate-500">Identificando geometria, cantos, vãos e pontos que não podem ser ocupados.</p></div></div></Card>;
  if (!analysis) return null;
  const confirmed = analysis.confirmedByIara;
  return (
    <Card className="p-4 border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Ruler size={18} className="text-indigo-600"/><h3 className="font-bold text-slate-900">Mapa técnico do ambiente</h3></div><p className="text-xs text-slate-500 mt-1">{analysis.roomType} · {analysis.perspective.description}</p></div>
        {confirmed ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><ShieldCheck size={15}/> Conferido pela IARA</span> : <span className="inline-flex items-center gap-1 text-[11px] text-amber-700"><Pencil size={13}/> Revisão necessária</span>}
      </div>
      <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3"><div className="flex items-center gap-2"><Ruler size={15} className="text-indigo-600"/><strong className="text-xs text-slate-800">Conferência técnica</strong></div><p className="text-[11px] text-slate-600 mt-1">Corrija medida, posição ou tipo quando necessário. Qualquer alteração reabre a conferência da IARA.</p></div>
      <div className="space-y-2 mt-3">{analysis.elements.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-slate-500">Elemento<select value={item.type} onChange={e => onChange(updateElement(analysis, item.id, { type: e.target.value as EnvironmentElementType }))} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800">{typeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-[10px] text-slate-500">Posição<input value={item.position || ''} onChange={e => onChange(updateElement(analysis, item.id, { position: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800" placeholder="ex.: parede direita"/></label>
          <label className="text-[10px] text-slate-500">Largura (m)<input type="number" min="0" step="0.01" value={item.widthM ?? ''} onChange={e => onChange(updateElement(analysis, item.id, { widthM: e.target.value === '' ? null : Number(e.target.value), measurementStatus: e.target.value === '' ? 'unknown' : 'confirmed' }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800" placeholder="não medida"/></label>
          <label className="text-[10px] text-slate-500">Altura (m)<input type="number" min="0" step="0.01" value={item.heightM ?? ''} onChange={e => onChange(updateElement(analysis, item.id, { heightM: e.target.value === '' ? null : Number(e.target.value), measurementStatus: e.target.value === '' ? 'unknown' : 'confirmed' }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800" placeholder="não medida"/></label>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusClass[item.measurementStatus]}`}>Medida {statusLabel[item.measurementStatus]}</span>{item.angleDeg != null && <span className="text-[10px] text-slate-600">Ângulo: {item.angleDeg}°</span>}{item.confidence !== 'high' && <span className="text-[10px] text-amber-700"><CircleAlert size={12} className="inline mr-1"/>confiança {item.confidence}</span>}</div>
      </div>)}</div>
      {analysis.missingMeasurements.length > 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex gap-2"><TriangleAlert size={16} className="text-amber-600 shrink-0"/><div><strong className="text-xs text-amber-900">Medidas que a foto não comprova</strong><ul className="mt-1 text-[11px] text-amber-800 list-disc pl-4">{analysis.missingMeasurements.map((m,i)=><li key={i}>{m}</li>)}</ul></div></div></div>}
      {analysis.warnings.length > 0 && <div className="mt-2 flex gap-2 text-[10px] text-slate-500"><CircleAlert size={14} className="shrink-0"/>{analysis.warnings.join(' ')}</div>}
      <div className="flex gap-2 mt-4">{!confirmed && <Button onClick={onConfirm} disabled={confirming} className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none" icon={ShieldCheck}>{confirming ? 'IARA conferindo…' : 'Conferir com IARA'}</Button>}<Button onClick={onAnalyze} variant="secondary" className="flex-1" icon={RotateCcw}>Refazer leitura</Button></div>
      {confirmed && <div className="mt-3 text-xs text-emerald-800 bg-emerald-50 rounded-lg p-3"><strong>Pronto para o Estúdio:</strong> o mapa conferido passa a ser uma restrição espacial na geração. Medidas estimadas continuam exigindo confirmação no local.</div>}
    </Card>
  );
}
