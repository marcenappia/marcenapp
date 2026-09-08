import { supabase } from '../supabase/client';
import type {
  CortecloudAction,
  CortecloudListServicesInput,
  CortecloudMaterialInput,
  CortecloudUpdateMaterialInput,
  CortecloudUpdateServiceInput,
} from './types';

export interface CortecloudRequest {
  action: CortecloudAction;
  input?:
    | CortecloudListServicesInput
    | CortecloudMaterialInput
    | CortecloudUpdateMaterialInput
    | CortecloudUpdateServiceInput;
}

export async function cortecloudRequest<T>(request: CortecloudRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke('cortecloud', {
    body: request,
  });

  if (error) {
    throw new Error(`Cortecloud: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(`Cortecloud: ${data.error}`);
  }

  return data as T;
}

export const cortecloud = {
  listServices: (input: CortecloudListServicesInput = {}) =>
    cortecloudRequest({ action: 'list_services', input }),
  getService: (serviceId: string | number) =>
    cortecloudRequest({ action: 'get_service', input: { serviceId } }),
  markServiceImported: (input: CortecloudUpdateServiceInput) =>
    cortecloudRequest({ action: 'mark_service_imported', input }),
  listMaterials: (type: CortecloudMaterialInput['type']) =>
    cortecloudRequest({ action: 'list_materials', input: { type } }),
  getMaterial: (input: CortecloudMaterialInput) =>
    cortecloudRequest({ action: 'get_material', input }),
  updateMaterial: (input: CortecloudUpdateMaterialInput) =>
    cortecloudRequest({ action: 'update_material', input }),
};
