import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectData } from '@/modules/projetos/types';

const db = supabase as unknown as SupabaseClient;
export type BudgetStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';
export interface RealBudgetData { salePrice: number | null; materialCost: number | null; hardwareCost: number | null; laborCost: number | null; otherCost: number | null; discountPct: number; marginPct: number | null; status: BudgetStatus; approvedAt: string | null; proposalReference: string; updatedAt: string | null; }
type EditableBudgetField = 'salePrice' | 'materialCost' | 'hardwareCost' | 'laborCost' | 'otherCost' | 'discountPct' | 'marginPct';
const emptyBudget: RealBudgetData = { salePrice: null, materialCost: null, hardwareCost: null, laborCost: null, otherCost: null, discountPct: 0, marginPct: null, status: 'draft', approvedAt: null, proposalReference: '', updatedAt: null };
const toNullableNumber = (value: string | number): number | null => { const n = typeof value === 'number' ? value : Number(value.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };

export const useOrcamento = (project: ProjectData) => {
  const { user } = useAuth();
  const [budget, setBudgetState] = useState<RealBudgetData>(emptyBudget);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    if (!user || !project.id) { setBudgetState(emptyBudget); return; }
    setLoading(true); setError(null);
    const { data, error: loadError } = await db.from('project_cost_snapshots').select('sale_price,material_cost,hardware_cost,labor_cost,other_cost,discount_pct,margin_pct,status,approved_at,proposal_reference,updated_at').eq('user_id', user.id).eq('project_id', project.id).maybeSingle();
    setLoading(false);
    if (loadError) { setError(`Não foi possível carregar o orçamento real: ${loadError.message}`); return; }
    const row = data as { sale_price?: number|null; material_cost?: number|null; hardware_cost?: number|null; labor_cost?: number|null; other_cost?: number|null; discount_pct?: number|null; margin_pct?: number|null; status?: BudgetStatus; approved_at?: string|null; proposal_reference?: string|null; updated_at?: string|null } | null;
    setBudgetState(row ? { salePrice: row.sale_price == null ? null : Number(row.sale_price), materialCost: row.material_cost == null ? null : Number(row.material_cost), hardwareCost: row.hardware_cost == null ? null : Number(row.hardware_cost), laborCost: row.labor_cost == null ? null : Number(row.labor_cost), otherCost: row.other_cost == null ? null : Number(row.other_cost), discountPct: Number(row.discount_pct ?? 0), marginPct: row.margin_pct == null ? null : Number(row.margin_pct), status: row.status ?? 'draft', approvedAt: row.approved_at ?? null, proposalReference: row.proposal_reference ?? '', updatedAt: row.updated_at ?? null } : emptyBudget);
  }, [project.id, user]);
  useEffect(() => { void load(); }, [load]);

  const costs = useMemo(() => [budget.materialCost, budget.hardwareCost, budget.laborCost, budget.otherCost].map(v => v ?? 0), [budget]);
  const custoTotal = Number(costs.reduce((sum, value) => sum + value, 0).toFixed(2));
  const setBudget = useCallback((field: EditableBudgetField, value: string | number) => {
    const next = toNullableNumber(value);
    setBudgetState(prev => {
      if (field !== 'marginPct') return { ...prev, [field]: next };
      if (next == null || next >= 100 || custoTotal <= 0) return { ...prev, marginPct: next };
      const salePrice = Number((custoTotal / (1 - next / 100)).toFixed(2));
      return { ...prev, marginPct: next, salePrice };
    });
  }, [custoTotal]);
  const setProposalReference = useCallback((value: string) => setBudgetState(prev => ({ ...prev, proposalReference: value })), []);
  const setStatus = useCallback((status: BudgetStatus) => setBudgetState(prev => ({ ...prev, status, approvedAt: status === 'approved' ? new Date().toISOString() : prev.approvedAt })), []);

  const save = useCallback(async () => {
    if (!user) { setError('Faça login para salvar um orçamento real.'); return false; }
    if (!project.id) { setError('O projeto ainda não foi salvo. Aguarde alguns segundos e tente novamente.'); return false; }
    const required = [budget.salePrice, budget.materialCost, budget.hardwareCost, budget.laborCost];
    if (required.some(value => value == null)) { setError('Preencha preço de venda, materiais, ferragens e mão de obra com valores reais.'); return false; }
    setSaving(true); setSaved(false); setError(null);
    const { error: saveError } = await db.from('project_cost_snapshots').upsert({ user_id: user.id, project_id: project.id, sale_price: budget.salePrice, material_cost: budget.materialCost, hardware_cost: budget.hardwareCost, labor_cost: budget.laborCost, other_cost: budget.otherCost ?? 0, discount_pct: budget.discountPct, margin_pct: budget.marginPct, status: budget.status, approved_at: budget.status === 'approved' ? (budget.approvedAt ?? new Date().toISOString()) : null, proposal_reference: budget.proposalReference.trim() || null, source: 'manual', updated_at: new Date().toISOString() }, { onConflict: 'user_id,project_id' });
    setSaving(false);
    if (saveError) { setError(`Não foi possível salvar o orçamento real: ${saveError.message}`); return false; }
    setSaved(true); await load(); return true;
  }, [budget, load, project.id, user]);
  const calc = useMemo(() => { const lucro = budget.salePrice == null ? null : Number((budget.salePrice - custoTotal).toFixed(2)); const margemPct = budget.salePrice && budget.salePrice > 0 && lucro != null ? Number(((lucro / budget.salePrice) * 100).toFixed(2)) : null; const totalFinal = budget.salePrice == null ? null : Number((budget.salePrice * (1 - budget.discountPct / 100)).toFixed(2)); return { custoTotal, lucro, margemPct, totalFinal, isComplete: budget.salePrice != null && budget.materialCost != null && budget.hardwareCost != null && budget.laborCost != null }; }, [budget, custoTotal]);
  return { budget, setBudget, setProposalReference, setStatus, calc, loading, saving, saved, error, save, reload: load, formatBRL: (v: number | null) => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) };
};
