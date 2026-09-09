/**
 * Fonte única da configuração pública do backend.
 * As variáveis VITE_* continuam tendo prioridade; os valores abaixo são a
 * reserva usada quando a plataforma de publicação não injeta as variáveis.
 * São chaves públicas (URL + publishable/anon), seguras no navegador.
 */
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://uzhqhieqlcyncelltfjw.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'sb_publishable_o9A9xyvRYXt-Rl9MZfdArA_SdYOAySX';
