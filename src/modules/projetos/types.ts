import type { CutPlanningPart } from '@/core/cutPlanning';

/** Valor serializável em JSON (usado nas colunas JSONB do backend). */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Fotografia da produção liberada a partir do orçamento aprovado. */
export interface ProductionSnapshot {
  parts?: CutPlanningPart[];
  status?: string;
  approvedTotal?: number;
  generatedAt?: string;
  updatedAt?: string;
}

/** Dados da jornada da obra guardados junto ao projeto. */
export interface JornadaData {
  id?: string;
  nome?: string;
  cliente?: string;
  production?: ProductionSnapshot;
  orcamentoAprovado?: boolean;
  orcamentoAprovadoEm?: string;
  statusAprovacao?: string;
  valorAprovado?: number;
  [key: string]: unknown;
}

export interface ProjectData {
  /** ID do projeto persistido (definido após carregar/salvar no backend) */
  id?: string;
  /** Nome da obra, quando já informado pelo marceneiro */
  name?: string;
  width: number;
  height: number;
  depth: number;
  modules: number;
  drawers: number;
  doors: number;
  internalMaterial: string;
  externalMaterial: string;
  backMaterial: string;
  handleType: string;
  profitMargin: number;
  discountPercent?: number;
  laborRate: number;
  jornada?: JornadaData;
}
