export interface ProjectData {
  /** ID do projeto persistido (definido após carregar/salvar no backend) */
  id?: string;
  /** Metadados já existentes no projeto, usados apenas para contexto visual. */
  name?: string;
  clientName?: string;
  environment?: string;
  status?: string;
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
