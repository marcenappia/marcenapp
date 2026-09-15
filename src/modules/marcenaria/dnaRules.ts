import { supabase } from '@/integrations/supabase/client';

export const DNA_CATEGORIES = [
  { id: 'identidade', label: 'Jeito da marcenaria' },
  { id: 'construcao', label: 'Construção' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'ferragens', label: 'Ferragens' },
  { id: 'medidas', label: 'Medidas e folgas' },
  { id: 'producao', label: 'Produção' },
  { id: 'orcamento', label: 'Orçamento' },
  { id: 'comunicacao', label: 'Comunicação' },
  { id: 'qualidade', label: 'Qualidade' },
  { id: 'preferencia', label: 'Preferências' },
] as const;

export type DnaCategory = typeof DNA_CATEGORIES[number]['id'];
export type DnaStatus = 'defined' | 'learned' | 'suggested' | 'project_exception';
export type DnaSource = 'manual' | 'observed' | 'project' | 'system';

export interface DnaRule {
  id: string;
  user_id: string;
  category: DnaCategory;
  rule_key: string;
  rule_value: Record<string, unknown>;
  status: DnaStatus;
  source: DnaSource;
  confidence: number;
  version: number;
  effective_from: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function dnaPriority(rule: Pick<DnaRule, 'status' | 'source'>): number {
  if (rule.status === 'project_exception') return 400;
  if (rule.status === 'defined') return 300;
  if (rule.status === 'learned') return 200;
  return 100;
}

export function resolveDnaRules(rules: DnaRule[]): DnaRule[] {
  const selected = new Map<string, DnaRule>();
  for (const rule of rules) {
    const current = selected.get(`${rule.category}:${rule.rule_key}`);
    if (!current || dnaPriority(rule) > dnaPriority(current) || (dnaPriority(rule) === dnaPriority(current) && rule.version > current.version)) {
      selected.set(`${rule.category}:${rule.rule_key}`, rule);
    }
  }
  return [...selected.values()].sort((a, b) => dnaPriority(b) - dnaPriority(a) || a.category.localeCompare(b.category));
}

export async function loadDnaRules(userId: string): Promise<DnaRule[]> {
  const { data, error } = await supabase
    .from('marcenaria_dna_rules')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DnaRule[];
}

export async function saveDnaRule(input: {
  userId: string;
  category: DnaCategory;
  ruleKey: string;
  value: string;
  status?: DnaStatus;
  source?: DnaSource;
}): Promise<DnaRule> {
  const rules = await loadDnaRules(input.userId);
  const previous = rules.find((rule) => rule.category === input.category && rule.rule_key === input.ruleKey);
  const nextVersion = (previous?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from('marcenaria_dna_rules')
    .insert({
      user_id: input.userId,
      category: input.category,
      rule_key: input.ruleKey,
      rule_value: { text: input.value.trim() },
      status: input.status ?? 'defined',
      source: input.source ?? 'manual',
      confidence: input.status === 'learned' ? 0.7 : 1,
      version: nextVersion,
      created_by: input.userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DnaRule;
}

export async function deleteDnaRule(userId: string, ruleId: string): Promise<void> {
  const { error } = await supabase.from('marcenaria_dna_rules').delete().eq('id', ruleId).eq('user_id', userId);
  if (error) throw error;
}

export function dnaContext(rules: DnaRule[]): Record<string, unknown> {
  const resolved = resolveDnaRules(rules);
  return {
    principle: 'DNA define como esta marcenaria trabalha. Não substitui decisões explícitas do projeto e não autoriza inventar medidas.',
    priority: 'project_exception > defined > learned > suggested',
    rules: resolved.map((rule) => ({
      category: rule.category,
      key: rule.rule_key,
      value: rule.rule_value,
      status: rule.status,
      source: rule.source,
      confidence: rule.confidence,
      version: rule.version,
    })),
  };
}
