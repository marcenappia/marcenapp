export type CutIntegrationTarget =
  | 'marceneiro'
  | 'cutlist-cloud'
  | 'cutlist-optimizer'
  | 'cnc'
  | 'saw-machine'
  | 'custom';

export type CutExportFormat = 'json' | 'csv' | 'xml' | 'dxf' | 'cnc';

export interface CutIntegrationProfile {
  id: string;
  name: string;
  target: CutIntegrationTarget;
  format: CutExportFormat;
  enabled: boolean;
  notes?: string;
}

export interface CutIntegrationJob {
  id: string;
  projectId: string;
  profileId: string;
  status: 'draft' | 'ready' | 'exported' | 'sent' | 'failed';
  createdAt: string;
  exportedAt?: string;
  externalJobId?: string;
  payloadVersion: '1.0';
}

/**
 * Contrato estável para futuras integrações.
 * O plano interno do MARCENAPP continua sendo a fonte de verdade;
 * cada conector poderá transformar este payload para o formato exigido
 * por um software de plano de corte, CNC ou máquina de corte.
 */
export interface CutIntegrationPayload {
  version: '1.0';
  project: { id: string; name?: string };
  sheet: { width: number; height: number; thickness: number; material: string };
  parts: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    quantity: number;
    x?: number;
    y?: number;
    rotated?: boolean;
    grain?: string;
  }>;
  kerf: number;
  metadata: { generatedAt: string; source: 'marcenapp' };
}

export function createCutIntegrationPayload(input: {
  projectId: string;
  projectName?: string;
  sheet: { width: number; height: number; thickness: number; material: string };
  kerf: number;
  parts: CutIntegrationPayload['parts'];
}): CutIntegrationPayload {
  return {
    version: '1.0',
    project: { id: input.projectId, name: input.projectName },
    sheet: input.sheet,
    parts: input.parts,
    kerf: input.kerf,
    metadata: { generatedAt: new Date().toISOString(), source: 'marcenapp' },
  };
}

export const DEFAULT_CUT_INTEGRATIONS: CutIntegrationProfile[] = [
  { id: 'internal', name: 'Plano de corte MARCENAPP', target: 'marceneiro', format: 'json', enabled: true },
  { id: 'cutlist-cloud', name: 'Sistema externo de plano de corte', target: 'cutlist-cloud', format: 'csv', enabled: false },
  { id: 'cutlist-optimizer', name: 'Otimizador de corte', target: 'cutlist-optimizer', format: 'csv', enabled: false },
  { id: 'cnc', name: 'CNC / Router', target: 'cnc', format: 'dxf', enabled: false },
  { id: 'saw-machine', name: 'Máquina de corte / seccionadora', target: 'saw-machine', format: 'xml', enabled: false },
  { id: 'custom', name: 'Conector personalizado', target: 'custom', format: 'json', enabled: false },
];
