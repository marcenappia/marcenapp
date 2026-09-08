export type CortecloudMaterialType = 'boards' | 'edges' | 'components';

export type CortecloudEnvironment = 'staging' | 'production';

export interface CortecloudService {
  id: number | string;
  internal_code?: number | string | null;
  status?: number | null;
  [key: string]: unknown;
}

export interface CortecloudMaterial {
  internal_code?: string | number;
  price?: number;
  stock?: number;
  unit?: number;
  active?: boolean;
  [key: string]: unknown;
}

export interface CortecloudListServicesInput {
  status?: number;
  limit?: number;
  offset?: number;
  internal_code?: string | number;
  date_start?: string;
  date_end?: string;
}

export interface CortecloudUpdateServiceInput {
  serviceId: string | number;
  internal_code: string | number;
}

export interface CortecloudMaterialInput {
  type: CortecloudMaterialType;
  internalCode?: string | number;
}

export interface CortecloudUpdateMaterialInput {
  type: CortecloudMaterialType;
  internalCode: string | number;
  price?: number;
  stock?: number;
  unit?: number;
  active?: boolean;
}

export type CortecloudAction =
  | 'list_services'
  | 'get_service'
  | 'mark_service_imported'
  | 'list_materials'
  | 'get_material'
  | 'update_material';
