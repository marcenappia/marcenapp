/**
 * Fonte única da configuração pública do backend.
 * As variáveis VITE_* continuam tendo prioridade; os valores abaixo são a
 * reserva usada quando a plataforma de publicação não injeta as variáveis.
 * São chaves públicas (URL + publishable/anon), seguras no navegador.
 */
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://bawzbqwmijbvgopyylqt.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhd3picXdtaWpidmdvcHl5bHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzQyOTcsImV4cCI6MjA5MjU1MDI5N30.hRQU1FhIB8RVrDDvA7DK96objrxs0d-H7l0dd-X-gdU';
