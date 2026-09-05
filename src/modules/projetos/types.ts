export interface ProjectData {
  /** ID do projeto persistido (definido após carregar/salvar no backend) */
  id?: string;
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
