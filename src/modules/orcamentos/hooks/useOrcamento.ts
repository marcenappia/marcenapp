import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectData } from '@/modules/projetos/types';
import { persistProjectTechnicalStructure } from '@/core/projectTechnicalPersistence';
import type { ProjectBudgetDraft } from '@/core/yara/projectIngestion';

const db = supabase as unknown as SupabaseClient;
export interface RealBudgetData { salePrice: number | null; materialCost: number | null; hardwareCost: number | null; laborCost: number | null; otherCost: number | null; freightCost: number | null; installationCost: number | null; designCost: number | null; taxCost: number | null; contingencyCost: number | null; discount: number | null; paymentTerms: string; notes: string; updatedAt: string | null; }
type EditableBudgetField = 'salePrice' | 'materialCost' | 'hardwareCost' | 'laborCost' | 'otherCost' | 'freightCost' | 'installationCost' | 'designCost' | 'taxCost' | 'contingencyCost' | 'discount';
const emptyBudget: RealBudgetData = { salePrice: null, materialCost: null, hardwareCost: null, laborCost: null, otherCost: null, freightCost: 0, installationCost: 0, designCost: 0, taxCost: 0, contingencyCost: 0, discount: 0, paymentTerms: '', notes: '', updatedAt: null };
const toNullableNumber = (value: string | number): number | null => { const n = typeof value === 'number' ? value : Number(value.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };

export const useOrcamento = (project: ProjectData) => {
  const { user } = useAuth();
  const [budget, setBudget] = useState<RealBudgetData>(emptyBudget);
  const [draft, setDraft] = useState<ProjectBudgetDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    if (!user || !project.id) { setBudget(emptyBudget); return; }
    setLoading(true); setError(null);
    const [{ data, error: loadError }, { data: draftRow, error: draftError }] = await Promise.all([
      db.from('project_cost_snapshots').select('sale_price,material_cost,hardware_cost,labor_cost,other_cost,freight_cost,installation_cost,design_cost,tax_cost,contingency_cost,discount,payment_terms,notes,updated_at').eq('user_id', user.id).eq('project_id', project.id).maybeSingle(),
      db.from('project_budget_drafts').select('source_files,evidences,items,missing_information,assumptions,status').eq('user_id', user.id).eq('project_id', project.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setLoading(false);
    if (loadError) { setError(`Não foi possível carregar o orçamento real: ${loadError.message}`); return; }
    if (draftError) { setError(`Não foi possível carregar o rascunho técnico: ${draftError.message}`); return; }
    if (draftRow) {
      const sourceFiles = Array.isArray(draftRow.source_files) ? draftRow.source_files.map((entry: unknown) => typeof entry === 'string' ? entry : entry && typeof entry === 'object' && 'name' in entry ? String((entry as { name: unknown }).name) : '').filter(Boolean) : [];
      setDraft({ sourceFiles, evidences: (Array.isArray(draftRow.evidences) ? draftRow.evidences : []) as ProjectBudgetDraft['evidences'], items: (Array.isArray(draftRow.items) ? draftRow.items : []) as ProjectBudgetDraft['items'], missingInformation: (Array.isArray(draftRow.missing_information) ? draftRow.missing_information : []) as string[], assumptions: (Array.isArray(draftRow.assumptions) ? draftRow.assumptions : []) as string[], status: draftRow.status as ProjectBudgetDraft['status'] });
    } else setDraft(null);
    const row = data as { sale_price?: number | null; material_cost?: number | null; hardware_cost?: number | null; labor_cost?: number | null; other_cost?: number | null; freight_cost?: number | null; installation_cost?: number | null; design_cost?: number | null; tax_cost?: number | null; contingency_cost?: number | null; discount?: number | null; payment_terms?: string | null; notes?: string | null; updated_at?: string | null } | null;
    setBudget(row ? { salePrice: row.sale_price == null ? null : Number(row.sale_price), materialCost: row.material_cost == null ? null : Number(row.material_cost), hardwareCost: row.hardware_cost == null ? null : Number(row.hardware_cost), laborCost: row.labor_cost == null ? null : Number(row.labor_cost), otherCost: row.other_cost == null ? null : Number(row.other_cost), freightCost: Number(row.freight_cost ?? 0), installationCost: Number(row.installation_cost ?? 0), designCost: Number(row.design_cost ?? 0), taxCost: Number(row.tax_cost ?? 0), contingencyCost: Number(row.contingency_cost ?? 0), discount: Number(row.discount ?? 0), paymentTerms: row.payment_terms ?? '', notes: row.notes ?? '', updatedAt: row.updated_at ?? null } : emptyBudget);
  }, [project.id, user]);
  useEffect(() => { void load(); }, [load]);
  const save = useCallback(async () => {
    if (!user) { setError('Faça login para salvar um orçamento real.'); return false; }
    if (!project.id) { setError('O projeto ainda não foi salvo. Aguarde alguns segundos e tente novamente.'); return false; }
    const required = [budget.salePrice, budget.materialCost, budget.hardwareCost, budget.laborCost];
    if (required.some(value => value == null)) { setError('Preencha preço de venda, materiais, ferragens e mão de obra com valores reais.'); return false; }
    setSaving(true); setSaved(false); setError(null);
    const { error: saveError } = await db.from('project_cost_snapshots').upsert({ user_id: user.id, project_id: project.id, sale_price: budget.salePrice, material_cost: budget.materialCost, hardware_cost: budget.hardwareCost, labor_cost: budget.laborCost, other_cost: budget.otherCost ?? 0, freight_cost: budget.freightCost ?? 0, installation_cost: budget.installationCost ?? 0, design_cost: budget.designCost ?? 0, tax_cost: budget.taxCost ?? 0, contingency_cost: budget.contingencyCost ?? 0, discount: budget.discount ?? 0, payment_terms: budget.paymentTerms || null, notes: budget.notes || null, source: 'manual', updated_at: new Date().toISOString() }, { onConflict: 'user_id,project_id' });
    setSaving(false);
    if (saveError) { setError(`Não foi possível salvar o orçamento real: ${saveError.message}`); return false; }
    try {
      await persistProjectTechnicalStructure({ project, userId: user.id });
    } catch (technicalError) {
      setError(`Orçamento salvo, mas a estrutura técnica não pôde ser sincronizada: ${technicalError instanceof Error ? technicalError.message : 'erro desconhecido'}`);
      setSaving(false);
      return false;
    }
    setSaved(true); await load(); return true;
  }, [budget, load, project, user]);
  const calc = useMemo(() => { const costs = [budget.materialCost, budget.hardwareCost, budget.laborCost, budget.otherCost, budget.freightCost, budget.installationCost, budget.designCost, budget.taxCost, budget.contingencyCost].map(v => v ?? 0); const custoTotal = Number(costs.reduce((sum, value) => sum + value, 0).toFixed(2)); const precoLiquido = budget.salePrice == null ? null : Number(Math.max(0, budget.salePrice - (budget.discount ?? 0)).toFixed(2)); const lucro = precoLiquido == null ? null : Number((precoLiquido - custoTotal).toFixed(2)); const margemPct = precoLiquido && precoLiquido > 0 && lucro != null ? Number(((lucro / precoLiquido) * 100).toFixed(2)) : null; return { custoTotal, precoLiquido, lucro, margemPct, isComplete: budget.salePrice != null && budget.materialCost != null && budget.hardwareCost != null && budget.laborCost != null }; }, [budget]);
  return { budget, draft, setBudget: (field: EditableBudgetField, value: string | number) => setBudget(prev => ({ ...prev, [field]: toNullableNumber(value) })), setBudgetText: (field: 'paymentTerms' | 'notes', value: string) => setBudget(prev => ({ ...prev, [field]: value })), calc, loading, saving, saved, error, save, reload: load, formatBRL: (v: number | null) => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) };
};
