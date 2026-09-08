import { supabase } from '@/integrations/supabase/client';

/**
 * Diário da Obra — registros vinculados à obra/projeto e ao usuário autenticado.
 * Fotos vão para o bucket privado `obras` (mesmo usado pela jornada), nunca base64 no banco.
 */

export const BUCKET_OBRAS = 'obras';

export type DiarioTipoObra = 'foto' | 'nota' | 'voz';
export type DiarioCategoria = 'pedido' | 'atencao' | 'pendencia' | 'medida' | 'confirmado' | null;
export type DiarioEvidencia = 'estimada' | 'precisa_conferir' | 'confirmada' | null;

export interface DiarioRegistro {
  id: string;
  user_id: string;
  project_id: string | null;
  tipo: DiarioTipoObra;
  texto: string;
  foto_path: string | null;
  categoria: DiarioCategoria;
  evidencia: DiarioEvidencia;
  pendencia_resolvida: boolean;
  importante: boolean;
  created_at: string;
  /** URL assinada temporária da foto (não persistida) */
  fotoUrl?: string | null;
}

export interface DiarioCabecalhoObra {
  nome: string;
  cliente: string;
  etapa: number;
  status: string | null;
}

const table = () => supabase.from('diario_entradas');

export const listarRegistros = async (projectId: string): Promise<DiarioRegistro[]> => {
  const { data, error } = await table()
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const registros = (data ?? []) as DiarioRegistro[];
  await Promise.all(
    registros.map(async (r) => {
      if (!r.foto_path) return;
      const { data: signed } = await supabase.storage.from(BUCKET_OBRAS).createSignedUrl(r.foto_path, 3600);
      r.fotoUrl = signed?.signedUrl ?? null;
    }),
  );
  return registros;
};

export const criarRegistro = async (input: {
  userId: string;
  projectId: string;
  tipo: DiarioTipoObra;
  texto: string;
  fotoPath?: string | null;
}): Promise<DiarioRegistro> => {
  const { data, error } = await table()
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      tipo: input.tipo,
      texto: input.texto,
      foto_path: input.fotoPath ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DiarioRegistro;
};

export const atualizarRegistro = async (id: string, patch: Partial<DiarioRegistro>) => {
  const { error } = await table().update(patch).eq('id', id);
  if (error) throw error;
};

export const removerRegistro = async (id: string) => {
  const { error } = await table().delete().eq('id', id);
  if (error) throw error;
};

export const enviarFotoDiario = async (userId: string, projectId: string, file: File) => {
  const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${projectId}/diario/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET_OBRAS)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  return path;
};

/** Cabeçalho + posição da jornada para o Diário saber qual é o próximo passo real da obra. */
export const carregarCabecalhoObra = async (projectId: string): Promise<DiarioCabecalhoObra | null> => {
  const { data } = await supabase
    .from('projects')
    .select('id, nome, name, status, jornada, clientes(nome)')
    .eq('id', projectId)
    .maybeSingle();
  if (!data) return null;
  const cliente = (data as unknown as { clientes?: { nome?: string } | null }).clientes;
  const jornada = data.jornada && typeof data.jornada === 'object'
    ? (data.jornada as { etapa?: number })
    : {};
  const etapa = Number.isFinite(jornada.etapa) ? Number(jornada.etapa) : 1;
  const status = (data as unknown as { status?: string | null }).status ?? null;
  return {
    nome: data.nome || data.name || 'Obra sem nome',
    cliente: cliente?.nome ?? '',
    etapa: status === 'aprovado' || status === 'em_producao' || status === 'concluido' ? Math.max(etapa, 7) : etapa,
    status,
  };
};
