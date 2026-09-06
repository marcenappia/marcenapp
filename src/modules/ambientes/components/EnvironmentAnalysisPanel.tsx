import { CheckCircle2, CircleAlert, Ruler, ScanSearch, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button, Card } from '@/components/marcenaria/shared';
import type { EnvironmentAnalysis } from '../types';

const labels: Record<string, string> = {
  wall: 'Parede', corner: 'Canto', window: 'Janela', door: 'Porta', outlet: 'Tomada', switch: 'Interruptor', baseboard: 'Rodapé', obstacle: 'Obstáculo',
};

const statusLabel = (status: EnvironmentAnalysis['elements'][number]['measurementStatus']) => ({
  confirmed: 'confirmada', estimated: 'estimada', unknown: 'não medida',
}[status]);

export function EnvironmentAnalysisPanel({
  analysis,
  analyzing,
  confirming,
  onAnalyze,
  onConfirm,
}: {
  analysis: EnvironmentAnalysis | null;
  analyzing: boolean;
  confirming: boolean;
  onAnalyze: () => void;
  onConfirm: () => void;
}) {
  if (!analysis && !analyzing) return (
    <Card className="p-4 border-indigo-200 bg-indigo-50/60">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-600 text-white p-2"><ScanSearch size={20} /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">Análise do ambiente</h3>
          <p className="text-xs text-slate-600 mt-1">Antes de criar o móvel, a IARA lê paredes, cantos, aberturas e pontos elétricos da foto.</p>
          <Button onClick={onAnalyze} className="mt-3 bg-indigo-600 hover:bg-indigo-700 border-none" icon={ScanSearch}>Analisar ambiente</Button>
        </div>
      </div>
    </Card>
  );

  if (analyzing) return (
    <Card className="p-4 border-indigo-200">
      <div className="flex items-center gap-3"><ScanSearch className="text-indigo-600 animate-pulse" size={20} /><div><strong>Estou lendo o ambiente…</strong><p className="text-xs text-slate-500">Identificando geometria, cantos, vãos e pontos que não podem ser ocupados.</p></div></div>
    </Card>
  );

  if (!analysis) return null;
  const confirmed = analysis.confirmedByIara;
  return (
    <Card className="p-4 border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Ruler size={18} className="text-indigo-600" /><h3 className="font-bold text-slate-900">Mapa técnico do ambiente</h3></div>
          <p className="text-xs text-slate-500 mt-1">{analysis.roomType} · {analysis.perspective.description}</p>
        </div>
        {confirmed ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><ShieldCheck size={15}/> Conferido pela IARA</span> : <span className="text-[11px] text-amber-700">Aguardando conferência</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {analysis.elements.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-800">{labels[item.type] || item.label}</span>{item.confidence === 'high' ? <CheckCircle2 size={14} className="text-emerald-600"/> : <CircleAlert size={14} className="text-amber-500"/>}</div>
            <p className="text-[10px] text-slate-500 mt-1">{item.label} · {item.position || 'posição não definida'}</p>
            <p className="text-[10px] text-slate-600 mt-1">Medida: {item.widthM != null || item.heightM != null ? `${item.widthM ?? '—'} × ${item.heightM ?? '—'} m` : statusLabel(item.measurementStatus)}</p>
            {item.angleDeg != null && <p className="text-[10px] text-slate-600">Ângulo: {item.angleDeg}°</p>}
          </div>
        ))}
      </div>

      {analysis.missingMeasurements.length > 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex gap-2"><TriangleAlert size={16} className="text-amber-600 shrink-0"/><div><strong className="text-xs text-amber-900">Medidas que a foto não comprova</strong><ul className="mt-1 text-[11px] text-amber-800 list-disc pl-4">{analysis.missingMeasurements.map((m, i) => <li key={i}>{m}</li>)}</ul></div></div></div>}
      {analysis.warnings.length > 0 && <div className="mt-2 flex gap-2 text-[10px] text-slate-500"><CircleAlert size={14} className="shrink-0"/>{analysis.warnings.join(' ')}</div>}

      <div className="flex gap-2 mt-4">
        {!confirmed && <Button onClick={onConfirm} disabled={confirming} className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none" icon={ShieldCheck}>{confirming ? 'IARA conferindo…' : 'Conferir com IARA'}</Button>}
        <Button onClick={onAnalyze} variant="secondary" className="flex-1">Refazer leitura</Button>
      </div>
      {confirmed && <div className="mt-3 text-xs text-emerald-800 bg-emerald-50 rounded-lg p-3"><strong>Pronto para o Estúdio:</strong> o mapa pode ser usado como restrição espacial na geração do projeto. Medidas estimadas continuam exigindo confirmação no local.</div>}
    </Card>
  );
}
