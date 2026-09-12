export interface ProjectData {
  /** ID do projeto persistido (definido após carregar/salvar no backend) */
  id?: string;
  /** Optional display metadata supplied by an existing project source when available. */
  name?: string | null;
  clientName?: string | null;
  environmentName?: string | null;
  status?: string | null;
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
  laborRate: number;
}
