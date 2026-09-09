import type { ProjectData } from '@/modules/projetos/types';
import React, { useMemo } from 'react';
import { CheckCircle2, Download, FileJson, Factory } from 'lucide-react';
import { Button, Card } from '@/components/marcenaria/shared';
import { createCutIntegrationPayload, DEFAULT_CUT_INTEGRATIONS } from '@/core/cutIntegration';
import { downloadTextFile, serializeCutPlanCsv, serializeCutPlanJson } from '@/core/cutExport';
import type { CutSheet } from '@/core/cutPlanning';

interface Props {
  project: ProjectData;
  sheets: CutSheet[];
}

export const SaidaCorte = ({ project, sheets }: Props) => {
  const enabledProfiles = useMemo(() => DEFAULT_CUT_INTEGRATIONS.filter(profile => profile.enabled), []);
  const exportSheet = (sheet: CutSheet, format: 'json' | 'csv') => {
    const payload = createCutIntegrationPayload({
      projectId: String(project?.id ?? project?.jornada?.id ?? 'current'),
      projectName: project?.name,
      sheet: {
        width: sheet.width,
        height: sheet.height,
        thickness: sheet.thickness,
        material: sheet.material,
      },
      kerf: 3,
      parts: sheet.items.map(item => ({
        id: item.uid,
        name: item.name,
        width: item.w,
        height: item.h,
        quantity: item.qtd,
        x: item.x,
        y: item.y,
        rotated: item.rotated,
        grain: item.grain,
      })),
    });

    const base = `marcenapp-${String(project?.name ?? 'projeto').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-chapa-${sheet.stockId}`;
    if (format === 'json') downloadTextFile(`${base}.json`, serializeCutPlanJson(payload), 'application/json');
    else downloadTextFile(`${base}.csv`, serializeCutPlanCsv(payload), 'text/csv');
  };

  if (sheets.length === 0) return null;

  return (
    <Card className="p-4 border-indigo-100 bg-indigo-50/60">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700"><Factory size={18} /></div>
          <div className="flex-1">
            <strong className="text-slate-800">Saída de corte</strong>
            <p className="text-xs text-slate-500 mt-0.5">O plano MARCENAPP é a fonte de verdade. Exporte agora para CSV/JSON; conectores de máquinas entram depois.</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{enabledProfiles.length} ativo</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {sheets.map((sheet, index) => (
            <div key={sheet.stockId} className="flex items-center gap-2 bg-white border border-indigo-100 rounded-lg px-2 py-1.5">
              <span className="text-xs font-semibold text-slate-700">Chapa #{index + 1}</span>
              <button onClick={() => exportSheet(sheet, 'csv')} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline" title="Exportar CSV">
                <Download size={13} /> CSV
              </button>
              <button onClick={() => exportSheet(sheet, 'json')} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline" title="Exportar JSON">
                <FileJson size={13} /> JSON
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>Pronto para adaptação a sistema externo, CNC ou seccionadora sem alterar o plano interno.</span>
        </div>
      </div>
    </Card>
  );
};

export default SaidaCorte;
