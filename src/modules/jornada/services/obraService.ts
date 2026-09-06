import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { AnaliseIara, EtapaId, ProgressoObra, salvarProgresso } from '../types';

/**
 * Persistência da jornada "Novo Projeto" no backend.
 * Reaproveita a tabela `projects` (colunas jornada/status/foto_ambiente_path/imagem_apresentacao_path)
 * e o bucket privado `obras` (caminho: <user_id>/<project_id>/arquivo).
 */

export const BUCKET_OBRAS = 'obras';
export type StatusObra = 'rascunho' | 'aprovado' | 'em_producao' | 'concluido';

export interface JornadaSalva {
  etapa?: EtapaId;
  pedido?: string;
  analise?: AnaliseIara | null;
  respostas?: Record<string, string>;
}

export interface ObraCarregada extends ProgressoObra {
  status: StatusObra;
  fotoPath: string | null;
  imagemPath: string | null;
  aprovadoEm: string | null;
}

export const caminhoArquivo = (userId: string, projectId: string, nome: string) =>
  `${userId}/${projectId}/${nome}`;

export const extensaoDoMime = (mime: string) => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
};

export const dataUrlParaBlob = (dataUrl: string): { blob: Blob; mime: string } => {
  const [meta, dados] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? 'image/png';
  const bin = atob(dados);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
};

export const blobParaDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

/** Mescla o progresso na coluna `jornada` e atualiza status/aprovação quando informado. */
export const salvarJornada = async (
  projectId: string,
  patch: JornadaSalva,
  extra?: { status?: StatusObra; aprovado?: boolean },
) => {
  // cache local (fallback offline / sem sessão)
  salvarProgresso(projectId, { ...patch, aprovado: extra?.aprovado });

  const { data: atual } = await supabase.from('projects').select('jornada').eq('id', projectId).maybeSingle();
  const anterior = (atual?.jornada && typeof atual.jornada === 'object' ? atual.jornada : {}) as Record<string, unknown>;
  const jornada = { ...anterior, ...patch, atualizadoEm: new Date().toISOString() } as unknown as Json;

  const update: Record<string, unknown> = { jornada };
  if (extra?.status) update.status = extra.status;
  if (extra?.aprovado) update.aprovado_em = new Date().toISOString();

  const { error } = await supabase.from('projects').update(update).eq('id', projectId);
  if (error) throw error;
};

export const enviarFotoAmbiente = async (userId: string, projectId: string, blob: Blob, mime: string) => {
  const path = caminhoArquivo(userId, projectId, `ambiente.${extensaoDoMime(mime)}`);
  const { error } = await supabase.storage.from(BUCKET_OBRAS).upload(path, blob, { upsert: true, contentType: mime });
  if (error) throw error;
  const { error: e2 } = await supabase.from('projects').update({ foto_ambiente_path: path }).eq('id', projectId);
  if (e2) throw e2;
  return path;
};

export const enviarApresentacao = async (userId: string, projectId: string, dataUrl: string) => {
  const { blob, mime } = dataUrlParaBlob(dataUrl);
  const path = caminhoArquivo(userId, projectId, `apresentacao-${Date.now()}.${extensaoDoMime(mime)}`);
  const { error } = await supabase.storage.from(BUCKET_OBRAS).upload(path, blob, { upsert: true, contentType: mime });
  if (error) throw error;
  const { error: e2 } = await supabase.from('projects').update({ imagem_apresentacao_path: path }).eq('id', projectId);
  if (e2) throw e2;
  return path;
};

export const urlAssinada = async (path: string, segundos = 60 * 60) => {
  const { data, error } = await supabase.storage.from(BUCKET_OBRAS).createSignedUrl(path, segundos);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

/** Baixa um arquivo privado do bucket e devolve como dataURL (para reenviar à IARA/Estúdio). */
export const baixarComoDataUrl = async (path: string) => {
  const { data, error } = await supabase.storage.from(BUCKET_OBRAS).download(path);
  if (error || !data) return null;
  return blobParaDataUrl(data);
};

export const carregarObra = async (projectId: string): Promise<ObraCarregada | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, nome, name, status, jornada, foto_ambiente_path, imagem_apresentacao_path, aprovado_em, updated_at, clientes(nome)')
    .eq('id', projectId)
    .maybeSingle();
  if (error || !data) return null;
  const j = (data.jornada && typeof data.jornada === 'object' ? data.jornada : {}) as JornadaSalva & { atualizadoEm?: string };
  const cliente = (data as unknown as { clientes?: { nome?: string } | null }).clientes;
  return {
    etapa: (j.etapa ?? 1) as EtapaId,
    nome: data.nome || data.name || '',
    clienteNome: cliente?.nome ?? '',
    pedido: j.pedido ?? '',
    analise: j.analise ?? null,
    respostas: j.respostas ?? {},
    aprovado: data.status === 'aprovado' || data.status === 'em_producao' || data.status === 'concluido',
    atualizadoEm: j.atualizadoEm ?? data.updated_at,
    status: (data.status as StatusObra) ?? 'rascunho',
    fotoPath: data.foto_ambiente_path,
    imagemPath: data.imagem_apresentacao_path,
    aprovadoEm: data.aprovado_em,
  };
};
