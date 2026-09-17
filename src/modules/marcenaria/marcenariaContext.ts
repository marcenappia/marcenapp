import { supabase } from '@/integrations/supabase/client';
import { dnaContext, loadDnaRules, type DnaRule } from './dnaRules';

export interface MarcenariaContext {
  materiais: Array<{ nome: string; categoria?: string | null; unidade?: string | null; espessura?: number | null; preco?: number | null; fornecedor?: string | null }>;
  fornecedores: Array<{ nome: string; contato?: string | null; site?: string | null }>;
  estoque: Array<{ nome_item: string; quantidade: number; unidade?: string | null; localizacao?: string | null }>;
  documentos: Array<{ nome: string; tipo: string; status: string }>;
  dna: Record<string, unknown> | null;
}

export async function loadMarcenariaContext(userId: string): Promise<MarcenariaContext> {
  const results = await Promise.allSettled([
    supabase.from('marcenaria_materiais').select('nome,categoria,unidade,espessura,preco,fornecedor').eq('user_id', userId).eq('ativo', true).limit(200),
    supabase.from('marcenaria_fornecedores').select('nome,contato,site').eq('user_id', userId).limit(100),
    supabase.from('marcenaria_estoque').select('nome_item,quantidade,unidade,localizacao').eq('user_id', userId).limit(200),
    supabase.from('marcenaria_documentos').select('nome,tipo,status').eq('user_id', userId).limit(100),
    supabase.from('marcenaria_dna').select('*').eq('user_id', userId).maybeSingle(),
    loadDnaRules(userId),
  ]);

  const unwrap = <T,>(index: number, fallback: T): T => {
    const result = results[index];
    if (result?.status !== 'fulfilled') return fallback;
    const value = result.value as { data?: T; error?: unknown };
    return value.error ? fallback : (value.data ?? fallback);
  };

  const structuredRules = unwrap(5, [] as DnaRule[]) as DnaRule[];
  const dnaRow = unwrap(4, null as Record<string, unknown> | null);
  const baseDna = dnaRow ? (dnaRow as Record<string, unknown>) : {};
  const enrichedDna = structuredRules.length ? { ...baseDna, structured: dnaContext(structuredRules) } : dnaRow ? baseDna : null;

  return {
    materiais: unwrap(0, []),
    fornecedores: unwrap(1, []),
    estoque: unwrap(2, []),
    documentos: unwrap(3, []),
    dna: enrichedDna,
  };
}
