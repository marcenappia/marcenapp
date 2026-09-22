import { supabase } from '@/integrations/supabase/client';

export type PhotoDestination = {
  projectId: string;
  environmentId: string;
  clientId?: string | null;
  clientName?: string | null;
  projectName?: string | null;
  environmentName?: string | null;
};

const PHOTO_HANDOFF_KEY = 'marcenapp.iara.environment-photo-handoff.v1';

export function rememberIaraPhotoHandoff(upload: { base64: string; baseRaw?: string; maskRaw?: string; kind?: string }) {
  try { sessionStorage.setItem(PHOTO_HANDOFF_KEY, JSON.stringify(upload)); } catch { /* best effort */ }
}

export function consumeIaraPhotoHandoff(): { base64: string; baseRaw?: string; maskRaw?: string; kind?: 'environment' | 'reference' | 'sketch' | 'plan' } | null {
  try {
    const raw = sessionStorage.getItem(PHOTO_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PHOTO_HANDOFF_KEY);
    const parsed = JSON.parse(raw);
    return parsed?.base64 ? parsed : null;
  } catch { return null; }
}

async function uploadEnvironmentPhoto(userId: string, projectId: string, environmentId: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${projectId}/ambientes/${environmentId}.jpg`;
  const { error } = await supabase.storage.from('obras').upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
  if (error) throw error;
  return path;
}

async function nextEnvironment(projectId: string) {
  const { data, error } = await supabase.from('project_environments').select('id,name,position').eq('project_id', projectId).order('position', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  const position = Number(data?.position ?? -1) + 1;
  return { name: `Ambiente ${position + 1}`, position };
}

export async function attachIaraEnvironmentPhoto(args: { userId: string; projectId: string; dataUrl: string; clientId?: string | null }) : Promise<PhotoDestination> {
  const next = await nextEnvironment(args.projectId);
  const { data: environment, error: environmentError } = await supabase.from('project_environments').insert({ project_id: args.projectId, name: next.name, position: next.position, type: 'ambiente', metadata: { source: 'iara_camera' } }).select('id,name,position').single();
  if (environmentError) throw environmentError;

  const storagePath = await uploadEnvironmentPhoto(args.userId, args.projectId, environment.id, args.dataUrl);
  const { error: projectError } = await supabase.from('projects').update({ foto_ambiente_path: storagePath }).eq('id', args.projectId).eq('user_id', args.userId);
  if (projectError) throw projectError;

  const { data: project, error: projectLoadError } = await supabase.from('projects').select('id,nome,name,cliente_id').eq('id', args.projectId).eq('user_id', args.userId).maybeSingle();
  if (projectLoadError) throw projectLoadError;
  if (!project) throw new Error('Projeto não encontrado.');

  return {
    projectId: project.id,
    environmentId: environment.id,
    clientId: project.cliente_id ?? args.clientId ?? null,
    projectName: project.nome || project.name || null,
    environmentName: environment.name,
  };
}

export async function createIaraClientAndProject(args: { userId: string; clientName: string; projectName: string }) {
  const { data: client, error: clientError } = await supabase.from('clientes').insert({ user_id: args.userId, nome: args.clientName.trim() }).select('id,nome').single();
  if (clientError) throw clientError;

  const payload = {
    user_id: args.userId,
    nome: args.projectName.trim(),
    name: args.projectName.trim(),
    cliente_id: client.id,
    status: 'rascunho',
    width: 0,
    height: 0,
    depth: 0,
    modules: 0,
    drawers: 0,
    doors: 0,
    internal_material: '',
    external_material: '',
    back_material: '',
    handle_type: '',
    profit_margin: 0,
    labor_rate: 0,
  };
  const { data: project, error: projectError } = await supabase.from('projects').insert(payload).select('id,nome,name,cliente_id').single();
  if (projectError) throw projectError;
  return { client, project };
}

export async function loadIaraPhotoDestinations(userId: string) {
  const [{ data: clients, error: clientsError }, { data: projects, error: projectsError }] = await Promise.all([
    supabase.from('clientes').select('id,nome').eq('user_id', userId).order('nome', { ascending: true }).limit(100),
    supabase.from('projects').select('id,nome,name,cliente_id,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(100),
  ]);
  if (clientsError) throw clientsError;
  if (projectsError) throw projectsError;
  return { clients: clients ?? [], projects: projects ?? [] };
}
