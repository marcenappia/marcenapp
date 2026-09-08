import React, { useMemo, useState } from 'react';
import { Download, FileText, Printer, Ruler, ShieldCheck, X } from 'lucide-react';
import { Button, Card, Modal } from '@/components/marcenaria/shared';
import type { EnvironmentAnalysis } from '../types';

interface ProjectDocumentation2DProps {
  prompt: string;
  projectMode: 'ready' | 'planned' | 'concept';
  plannedDimensions: { width: string; height: string; depth: string };
  environmentAnalysis: EnvironmentAnalysis | null;
}

type DocsMode = 'conceptual' | 'executive';

const formatM = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2).replace('.', ',')} m` : '—';

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const ProjectDocumentation2D = ({ prompt, projectMode, plannedDimensions, environmentAnalysis }: ProjectDocumentation2DProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DocsMode>('conceptual');

  const geometry = environmentAnalysis?.geometry;
  const roomWidth = geometry?.roomWidthM ?? (plannedDimensions.width ? Number(plannedDimensions.width) : null);
  const roomDepth = geometry?.roomDepthM ?? (plannedDimensions.depth ? Number(plannedDimensions.depth) : null);
  const roomHeight = geometry?.roomHeightM ?? (plannedDimensions.height ? Number(plannedDimensions.height) : null);
  const hasAllDimensions = [roomWidth, roomDepth, roomHeight].every(value => typeof value === 'number' && value > 0);
  const executiveReady = Boolean(
    projectMode === 'ready' &&
    environmentAnalysis?.confirmedByIara &&
    geometry &&
    geometry.roomWidthM &&
    geometry.roomDepthM &&
    geometry.ceilingHeightM,
  );

  const drawing = useMemo(() => {
    const width = roomWidth || 4;
    const depth = roomDepth || 3;
    const height = roomHeight || 2.7;
    const scale = 54;
    const planW = Math.max(260, Math.min(520, width * scale));
    const planD = Math.max(180, Math.min(360, depth * scale));
    const baseX = 80;
    const baseY = 105;
    const frontX = 80;
    const frontY = 535;
    const frontW = planW;
    const frontH = Math.max(160, Math.min(300, height * 82));
    const sideX = 650;
    const sideY = 535;
    const sideW = planD;
    const sideH = frontH;

    const dimension = (x1: number, y1: number, x2: number, y2: number, label: string) => `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
      <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 7}" text-anchor="middle" font-size="13" fill="#0f172a" font-family="Arial, sans-serif">${escapeXml(label)}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 980" role="img" aria-label="Prancha 2D do projeto">
      <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,3.5 L7,0 L7,7 Z" fill="#475569"/></marker></defs>
      <rect width="1180" height="980" fill="#ffffff"/>
      <rect x="22" y="22" width="1136" height="936" rx="4" fill="none" stroke="#cbd5e1" stroke-width="2"/>
      <text x="52" y="62" font-size="25" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">MARCENAPP — DOCUMENTAÇÃO 2D</text>
      <text x="52" y="84" font-size="13" fill="#64748b" font-family="Arial, sans-serif">${mode === 'executive' ? 'PRANCHA EXECUTIVA — MEDIDAS CONFIRMADAS' : 'PRANCHA CONCEITUAL — BASE PARA VALIDAÇÃO'}</text>
      <line x1="52" y1="94" x2="1128" y2="94" stroke="#cbd5e1"/>

      <text x="${baseX}" y="${baseY - 28}" font-size="17" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">PLANTA BAIXA</text>
      <rect x="${baseX}" y="${baseY}" width="${planW}" height="${planD}" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
      <rect x="${baseX + planW * 0.34}" y="${baseY + planD - 4}" width="${planW * 0.32}" height="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.5"/>
      <text x="${baseX + planW / 2}" y="${baseY + planD / 2}" text-anchor="middle" font-size="15" fill="#64748b" font-family="Arial, sans-serif">ambiente</text>
      ${dimension(baseX, baseY + planD + 45, baseX + planW, baseY + planD + 45, formatM(roomWidth))}
      ${dimension(baseX + planW + 45, baseY, baseX + planW + 45, baseY + planD, formatM(roomDepth))}

      <text x="${frontX}" y="${frontY - 28}" font-size="17" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">VISTA FRONTAL</text>
      <rect x="${frontX}" y="${frontY}" width="${frontW}" height="${frontH}" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
      <line x1="${frontX}" y1="${frontY + frontH * 0.78}" x2="${frontX + frontW}" y2="${frontY + frontH * 0.78}" stroke="#94a3b8" stroke-width="1"/>
      <text x="${frontX + frontW / 2}" y="${frontY + frontH / 2}" text-anchor="middle" font-size="15" fill="#64748b" font-family="Arial, sans-serif">elevação do ambiente / projeto</text>
      ${dimension(frontX, frontY + frontH + 42, frontX + frontW, frontY + frontH + 42, formatM(roomWidth))}
      ${dimension(frontX - 45, frontY, frontX - 45, frontY + frontH, formatM(roomHeight))}

      <text x="${sideX}" y="${sideY - 28}" font-size="17" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">VISTA LATERAL</text>
      <rect x="${sideX}" y="${sideY}" width="${sideW}" height="${sideH}" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
      <line x1="${sideX}" y1="${sideY + sideH * 0.78}" x2="${sideX + sideW}" y2="${sideY + sideH * 0.78}" stroke="#94a3b8" stroke-width="1"/>
      <text x="${sideX + sideW / 2}" y="${sideY + sideH / 2}" text-anchor="middle" font-size="15" fill="#64748b" font-family="Arial, sans-serif">profundidade / elevação</text>
      ${dimension(sideX, sideY + sideH + 42, sideX + sideW, sideY + sideH + 42, formatM(roomDepth))}

      <rect x="52" y="900" width="1076" height="36" fill="#f8fafc" stroke="#cbd5e1"/>
      <text x="66" y="923" font-size="12" fill="#334155" font-family="Arial, sans-serif">Pedido: ${escapeXml(prompt || 'Projeto de marcenaria')}</text>
      <text x="1112" y="923" text-anchor="end" font-size="12" fill="#64748b" font-family="Arial, sans-serif">${mode === 'executive' ? 'EXECUTIVO' : 'CONCEITUAL'} · ${new Date().toLocaleDateString('pt-BR')}</text>
    </svg>`;
  }, [mode, prompt, roomDepth, roomHeight, roomWidth]);

  const downloadSvg = () => {
    const blob = new Blob([drawing], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marcenapp-documentacao-2d-${mode}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printSheet = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><title>MARCENAPP — Documentação 2D</title><style>@page{size:A3 landscape;margin:8mm}body{margin:0;background:#fff}svg{width:100%;height:auto;display:block}</style></head><body>${drawing}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const openDocumentation = (nextMode: DocsMode) => {
    setMode(nextMode);
    setOpen(true);
  };

  return <>
    <Card className="border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FileText size={17} className="mt-0.5 text-indigo-600" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-slate-700">Documentação 2D</div>
            <div className="mt-1 text-[10px] leading-relaxed text-slate-500">Planta baixa e vistas para apresentar o projeto com organização técnica.</div>
          </div>
        </div>
        {executiveReady && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700"><ShieldCheck size={11}/> Medidas confirmadas</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => openDocumentation('conceptual')} variant="secondary" className="text-xs" icon={FileText}>Prancha conceitual</Button>
        <Button onClick={() => openDocumentation('executive')} variant="primary" disabled={!executiveReady} className="text-xs" icon={Ruler}>Desenho executivo</Button>
      </div>
      {!hasAllDimensions && <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">Para o executivo, confirme largura, profundidade e altura do ambiente. Sem isso, a prancha fica somente conceitual.</div>}
    </Card>

    <Modal isOpen={open} onClose={() => setOpen(false)} title={<span className="flex items-center gap-2"><FileText className="text-indigo-500" size={18}/> {mode === 'executive' ? 'Desenho executivo 2D' : 'Prancha conceitual 2D'}</span>} footer={<div className="flex w-full flex-wrap justify-end gap-2"><Button onClick={downloadSvg} variant="secondary" icon={Download}>Baixar prancha</Button><Button onClick={printSheet} variant="primary" icon={Printer}>Imprimir / PDF</Button></div>}>
      <div className="space-y-3">
        {mode === 'executive' && !executiveReady && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">O desenho executivo fica bloqueado até o ambiente real estar confirmado e com as medidas principais validadas.</div>}
        <div className="overflow-auto rounded-lg border border-slate-200 bg-white p-2" dangerouslySetInnerHTML={{ __html: drawing }} />
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1"><Ruler size={12}/> Largura {formatM(roomWidth)} · Profundidade {formatM(roomDepth)} · Altura {formatM(roomHeight)}</span><button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-slate-100" aria-label="Fechar"><X size={14}/></button></div>
      </div>
    </Modal>
  </>;
};
