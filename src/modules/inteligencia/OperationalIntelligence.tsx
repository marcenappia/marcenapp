import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Save, Settings2, Sparkles, ShoppingCart, Factory, WalletCards } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type DNA = { user_id: string; standard_mdf_thickness_mm: number | null; back_thickness_mm: number | null; minimum_margin_pct: number | null; construction_rules: Record<string, unknown> };
type Project = { id: string; nome: string | null; name: string; profit_margin: number | null; external_material: string | null; doors: number | null; drawers: number | null; modules: number | null };
type Cost = { sale_price: number | null; material_cost: number | null; hardware_cost: number | null; labor_cost: number | null; other_cost: number | null };
type AlertRow = { id: string; alert_type: string; severity: 'INFO' | 'ATENCAO' | 'ERRO' | 'CRITICO'; entity_id: string | null; message: string; evidence: Record<string, unknown>; suggested_action: string | null };
type Hardware = { id: string; name: string; category: string; unit: string; unit_price: number | null; minimum_stock: number; supplier_id: string | null };
type Requirement = { hardware_id: string; quantity_required: number; rule_key: string | null };
type Stock = { hardware_id: string; quantity_on_hand: number };
type Stage = { id: string; stage_key: string; stage_name: string; status: string; responsible: string | null; due_at: string | null; blocked_reason: string | null };
type Sale = { sale_price: number; status: string };
type Receivable = { installment_number: number; amount: number; due_at: string; received_at: string | null; status: string };

const emptyCost: Cost = { sale_price: null, material_cost: null, hardware_cost: null, labor_cost: null, other_cost: null };
const severityIcon = (severity: AlertRow['severity']) => severity === 'INFO' ? <CheckCircle2 size={18} /> : severity === 'CRITICO' ? <CircleAlert size={18} /> : <AlertTriangle size={18} />;
const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value);

export default function OperationalIntelligence() {
  const { user } = useAuth();
  const db = supabase as any;
  const [dna, setDna] = useState<DNA | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [costs, setCosts] = useState<Record<string, Cost>>({});
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [sale, setSale] = useState<Sale | null>(null);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [margin, setMargin] = useState('');
  const [thickness, setThickness] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ruleHardwareId, setRuleHardwareId] = useState('');
  const [ruleBasis, setRuleBasis] = useState('doors');
  const [ruleQty, setRuleQty] = useState('');
  const [stageName, setStageName] = useState('');
  const [stageDue, setStageDue] = useState('');
  const [stageResponsible, setStageResponsible] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentDue, setInstallmentDue] = useState('');

  const selectedProjectData = projects.find(p => p.id === selectedProject) ?? null;
  const selectedCost = costs[selectedProject] ?? emptyCost;
  const currentMargin = useMemo(() => {
    const c = selectedCost;
    if (c.sale_price == null || c.sale_price <= 0 || c.material_cost == null || c.hardware_cost == null || c.labor_cost == null) return null;
    const total = c.material_cost + c.hardware_cost + c.labor_cost + (c.other_cost ?? 0);
    return ((c.sale_price - total) / c.sale_price) * 100;
  }, [selectedCost]);
  const hardwareView = useMemo(() => requirements.map(r => {
    const item = hardware.find(h => h.id === r.hardware_id);
    const onHand = stock.find(s => s.hardware_id === r.hardware_id)?.quantity_on_hand ?? 0;
    return { ...r, item, onHand, deficit: Math.max(0, r.quantity_required - onHand) };
  }), [requirements, hardware, stock]);
  const financial = useMemo(() => {
    if (!sale) return null;
    const cost = selectedCost.material_cost != null && selectedCost.hardware_cost != null && selectedCost.labor_cost != null ? selectedCost.material_cost + selectedCost.hardware_cost + selectedCost.labor_cost + (selectedCost.other_cost ?? 0) : null;
    if (cost == null) return null;
    const result = sale.sale_price - cost;
    return { revenue: sale.sale_price, cost, result, margin: (result / sale.sale_price) * 100 };
  }, [sale, selectedCost]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: dnaRow }, { data: projectRows }, { data: alertRows }, { data: costRows }, { data: hardwareRows }, { data: stockRows }, { data: reqRows }, { data: stageRows }, { data: saleRow }, { data: receivableRows }] = await Promise.all([
      db.from('marcenaria_dna').select('user_id,standard_mdf_thickness_mm,back_thickness_mm,minimum_margin_pct,construction_rules').eq('user_id', user.id).maybeSingle(),
      db.from('projects').select('id,nome,name,profit_margin,external_material,doors,drawers,modules').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20),
      db.from('operational_alerts').select('id,alert_type,severity,entity_id,message,evidence,suggested_action').eq('user_id', user.id).eq('status', 'open').order('created_at', { ascending: false }).limit(50),
      db.from('project_cost_snapshots').select('project_id,sale_price,material_cost,hardware_cost,labor_cost,other_cost').eq('user_id', user.id),
      db.from('hardware_items').select('id,name,category,unit,unit_price,minimum_stock,supplier_id').eq('user_id', user.id).eq('active', true).order('name'),
      db.from('hardware_stock').select('hardware_id,quantity_on_hand').eq('user_id', user.id),
      selectedProject ? db.from('project_hardware_requirements').select('hardware_id,quantity_required,rule_key').eq('user_id', user.id).eq('project_id', selectedProject) : Promise.resolve({ data: [] }),
      selectedProject ? db.from('project_production_stages').select('id,stage_key,stage_name,status,responsible,due_at,blocked_reason').eq('user_id', user.id).eq('project_id', selectedProject).order('due_at') : Promise.resolve({ data: [] }),
      selectedProject ? db.from('project_sales').select('sale_price,status').eq('user_id', user.id).eq('project_id', selectedProject).maybeSingle() : Promise.resolve({ data: null }),
      selectedProject ? db.from('project_receivables').select('installment_number,amount,due_at,received_at,status').eq('user_id', user.id).eq('project_id', selectedProject).order('installment_number') : Promise.resolve({ data: [] }),
    ]);
    const nextDna = dnaRow as DNA | null;
    setDna(nextDna); setMargin(nextDna?.minimum_margin_pct?.toString() ?? ''); setThickness(nextDna?.standard_mdf_thickness_mm?.toString() ?? '');
    const nextProjects = (projectRows ?? []) as Project[]; setProjects(nextProjects); if (!selectedProject && nextProjects[0]) setSelectedProject(nextProjects[0].id);
    setAlerts((alertRows ?? []) as AlertRow[]);
    const nextCosts: Record<string, Cost> = {}; for (const row of (costRows ?? []) as Array<Cost & { project_id: string }>) nextCosts[row.project_id] = row; setCosts(nextCosts);
    setHardware((hardwareRows ?? []) as Hardware[]); setStock((stockRows ?? []) as Stock[]); setRequirements((reqRows ?? []) as Requirement[]); setStages((stageRows ?? []) as Stage[]); setSale((saleRow ?? null) as Sale | null); setReceivables((receivableRows ?? []) as Receivable[]);
  }, [user, selectedProject, db]);
  useEffect(() => { void load(); }, [load]);

  const saveDNA = async () => {
    if (!user) return; setSaving(true); setMessage(null);
    const currentRules = (dna?.construction_rules ?? {}) as Record<string, unknown>;
    const payload = { user_id: user.id, minimum_margin_pct: numberOrNull(margin), standard_mdf_thickness_mm: numberOrNull(thickness), construction_rules: currentRules };
    const { error } = await db.from('marcenaria_dna').upsert(payload, { onConflict: 'user_id' });
    setSaving(false); setMessage(error ? error.message : 'DNA atualizado. Campos vazios continuam significando “Regra não configurada”.'); if (!error) await load();
  };

  const addHardwareRule = async () => {
    if (!user || !ruleHardwareId || !Number(ruleQty) || Number(ruleQty) <= 0) { setMessage('Selecione a ferragem e informe uma quantidade real positiva.'); return; }
    setSaving(true); const existing = Array.isArray(dna?.construction_rules?.hardware_rules) ? dna?.construction_rules?.hardware_rules as Array<Record<string, unknown>> : [];
    const nextRules = [...existing, { key: `${ruleBasis}_${ruleHardwareId}`, hardware_id: ruleHardwareId, basis: ruleBasis, quantity_per_unit: Number(ruleQty) }];
    const { error } = await db.from('marcenaria_dna').upsert({ user_id: user.id, minimum_margin_pct: dna?.minimum_margin_pct ?? null, standard_mdf_thickness_mm: dna?.standard_mdf_thickness_mm ?? null, construction_rules: { ...(dna?.construction_rules ?? {}), hardware_rules: nextRules } }, { onConflict: 'user_id' });
    setSaving(false); setMessage(error ? error.message : 'Regra de ferragem registrada no DNA.'); setRuleQty(''); if (!error) { await load(); if (selectedProject) await analyze(selectedProject); }
  };

  const updateCost = (field: keyof Cost, value: string) => setCosts(prev => ({ ...prev, [selectedProject]: { ...(prev[selectedProject] ?? emptyCost), [field]: numberOrNull(value) } }));
  const saveCost = async () => { if (!user || !selectedProject) return; setSaving(true); const c = costs[selectedProject] ?? emptyCost; const { error } = await db.from('project_cost_snapshots').upsert({ user_id: user.id, project_id: selectedProject, ...c, source: 'manual' }, { onConflict: 'user_id,project_id' }); setSaving(false); setMessage(error ? error.message : null); if (!error) await analyze(selectedProject); };
  const analyze = async (projectId: string) => { const { error } = await db.rpc('refresh_project_operational_alerts', { p_project_id: projectId }); if (error) { setMessage(error.message); return; } setMessage('Projeto analisado com dados reais: custos, ferragens, produção, recebimentos e regras disponíveis.'); await load(); };

  const addStage = async () => { if (!user || !selectedProject || !stageName.trim() || !stageDue) { setMessage('Informe etapa e prazo reais.'); return; } setSaving(true); const stageKey = stageName.trim().toLowerCase().replace(/\s+/g, '_'); const { error } = await db.from('project_production_stages').upsert({ user_id: user.id, project_id: selectedProject, stage_key: stageKey, stage_name: stageName.trim(), due_at: new Date(`${stageDue}T23:59:00`).toISOString(), responsible: stageResponsible.trim() || null, status: 'pending' }, { onConflict: 'user_id,project_id,stage_key' }); setSaving(false); setMessage(error ? error.message : 'Etapa registrada.'); if (!error) { setStageName(''); setStageDue(''); setStageResponsible(''); await analyze(selectedProject); } };
  const saveSale = async () => { if (!user || !selectedProject || !Number(salePrice) || Number(salePrice) <= 0) { setMessage('Informe o preço real de venda.'); return; } setSaving(true); const { error } = await db.from('project_sales').upsert({ user_id: user.id, project_id: selectedProject, sale_price: Number(salePrice), status: 'sold' }, { onConflict: 'user_id,project_id' }); setSaving(false); setMessage(error ? error.message : 'Venda real registrada.'); if (!error) await analyze(selectedProject); };
  const addReceivable = async () => { if (!user || !selectedProject || !Number(installmentAmount) || !installmentDue) { setMessage('Informe valor e vencimento reais.'); return; } const nextNumber = receivables.length + 1; setSaving(true); const { error } = await db.from('project_receivables').insert({ user_id: user.id, project_id: selectedProject, installment_number: nextNumber, amount: Number(installmentAmount), due_at: new Date(`${installmentDue}T23:59:00`).toISOString(), status: 'open' }); setSaving(false); setMessage(error ? error.message : 'Parcela registrada.'); if (!error) { setInstallmentAmount(''); setInstallmentDue(''); await analyze(selectedProject); } };

  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Entre na sua conta para acessar a inteligência operacional.</div>;
  const attentionCount = alerts.filter(a => a.severity !== 'INFO').length;
  return <div className="space-y-6">
    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-indigo-600 font-bold text-sm"><Sparkles size={18} /> Inteligência Operacional</div><h2 className="text-2xl font-black text-slate-900 mt-1">Encontrei {attentionCount} pontos que precisam da sua atenção.</h2><p className="text-sm text-slate-500 mt-2">A central consolida somente dados reais e regras configuradas da sua marcenaria.</p></div><button disabled={!selectedProject || saving} onClick={() => void analyze(selectedProject)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-bold disabled:opacity-50">Analisar agora</button></div>{message && <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">{message}</div>}</section>

    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"><div className="flex items-center gap-2 mb-4"><Settings2 size={18} className="text-indigo-600" /><h3 className="font-black text-slate-900">DNA da Marcenaria</h3></div><p className="text-sm text-slate-500 mb-4">O DNA é conhecimento persistente por marcenaria. Nada é preenchido automaticamente com preço, margem ou regra comercial.</p><div className="grid md:grid-cols-2 gap-4"><label className="text-sm font-semibold text-slate-700">Margem mínima (%)<input value={margin} onChange={e => setMargin(e.target.value)} type="number" min="0" step="0.1" placeholder="Regra não configurada" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-sm font-semibold text-slate-700">MDF padrão externo (mm)<input value={thickness} onChange={e => setThickness(e.target.value)} type="number" min="0" step="1" placeholder="Regra não configurada" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><button disabled={saving} onClick={() => void saveDNA()} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar DNA'}</button></section>

    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"><div className="flex items-center gap-2 mb-3"><ShoppingCart size={18} className="text-indigo-600" /><h3 className="font-black text-slate-900">Ferragens → Estoque → Compra</h3></div><div className="grid md:grid-cols-4 gap-3"><select value={ruleHardwareId} onChange={e => setRuleHardwareId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2"><option value="">Selecione a ferragem real</option>{hardware.map(h => <option key={h.id} value={h.id}>{h.name} · {h.category}</option>)}</select><select value={ruleBasis} onChange={e => setRuleBasis(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="doors">por porta</option><option value="drawers">por gaveta</option><option value="modules">por módulo</option></select><input value={ruleQty} onChange={e => setRuleQty(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Qtd por unidade" className="rounded-xl border border-slate-200 px-3 py-2.5" /></div><button disabled={saving} onClick={() => void addHardwareRule()} className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-white font-bold disabled:opacity-50">Adicionar regra ao DNA</button><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Ferragem</th><th className="p-2">Necessária</th><th className="p-2">Estoque</th><th className="p-2">Déficit</th><th className="p-2">Fornecedor/preço</th></tr></thead><tbody>{hardwareView.map(r => <tr key={r.hardware_id} className="border-b last:border-0"><td className="p-2">{r.item?.name ?? 'Item não configurado'}</td><td className="p-2">{r.quantity_required}</td><td className="p-2">{r.onHand}</td><td className={`p-2 font-bold ${r.deficit > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.deficit}</td><td className="p-2">{r.item?.supplier_id ? 'cadastrado' : 'ausente'} / {r.item?.unit_price != null ? 'preço real' : 'sem preço'}</td></tr>)}</tbody></table>{requirements.length === 0 && <p className="text-sm text-slate-500 mt-3">Nenhuma regra de ferragem foi aplicada. Isso significa “Regra não configurada”, não uma quantidade inventada.</p>}</div></section>

    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"><div className="flex items-center gap-2 mb-3"><Factory size={18} className="text-indigo-600" /><h3 className="font-black text-slate-900">Produção → Prazo → Atraso</h3></div><div className="grid md:grid-cols-3 gap-3"><input value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Nome da etapa real" className="rounded-xl border border-slate-200 px-3 py-2.5" /><input value={stageDue} onChange={e => setStageDue(e.target.value)} type="date" className="rounded-xl border border-slate-200 px-3 py-2.5" /><input value={stageResponsible} onChange={e => setStageResponsible(e.target.value)} placeholder="Responsável (opcional)" className="rounded-xl border border-slate-200 px-3 py-2.5" /></div><button disabled={saving || !selectedProject} onClick={() => void addStage()} className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-white font-bold disabled:opacity-50">Registrar etapa</button><div className="mt-4 space-y-2">{stages.map(s => <div key={s.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-3"><div><p className="font-bold text-slate-800">{s.stage_name}</p><p className="text-xs text-slate-500">{s.status} · {s.responsible || 'sem responsável'} · {s.due_at ? new Date(s.due_at).toLocaleDateString('pt-BR') : 'sem prazo'}</p></div><span className="text-xs font-black uppercase text-slate-500">{s.blocked_reason ? 'bloqueado' : 'monitorado'}</span></div>)}{stages.length === 0 && <p className="text-sm text-slate-500">Nenhuma etapa configurada para este projeto.</p>}</div></section>

    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"><div className="flex items-center gap-2 mb-3"><WalletCards size={18} className="text-indigo-600" /><h3 className="font-black text-slate-900">Venda → Recebimento → Lucro real</h3></div><div className="grid md:grid-cols-3 gap-3"><input value={salePrice} onChange={e => setSalePrice(e.target.value)} type="number" min="0" step="0.01" placeholder="Preço real de venda" className="rounded-xl border border-slate-200 px-3 py-2.5" /><input value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Valor da parcela" className="rounded-xl border border-slate-200 px-3 py-2.5" /><input value={installmentDue} onChange={e => setInstallmentDue(e.target.value)} type="date" className="rounded-xl border border-slate-200 px-3 py-2.5" /></div><div className="flex gap-3 mt-3"><button disabled={saving || !selectedProject} onClick={() => void saveSale()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-white font-bold disabled:opacity-50">Registrar venda</button><button disabled={saving || !selectedProject} onClick={() => void addReceivable()} className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold disabled:opacity-50">Registrar parcela</button></div><div className="mt-4 grid md:grid-cols-4 gap-3">{financial ? <><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Receita</span><strong className="block">R$ {financial.revenue.toFixed(2)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Custos</span><strong className="block">R$ {financial.cost.toFixed(2)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Resultado</span><strong className="block">R$ {financial.result.toFixed(2)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Margem</span><strong className="block">{financial.margin.toFixed(2)}%</strong></div></> : <p className="text-sm text-slate-500">Lucro ainda não calculável com os dados atuais.</p>}</div><div className="mt-4 space-y-2">{receivables.map(r => <div key={r.installment_number} className="text-sm rounded-xl border border-slate-200 p-3">Parcela {r.installment_number}: R$ {r.amount.toFixed(2)} · vencimento {new Date(r.due_at).toLocaleDateString('pt-BR')} · {r.received_at ? 'recebida' : r.status}</div>)}</div></section>

    <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm"><h3 className="font-black text-slate-900 mb-4">Projeto monitorado</h3>{projects.length > 0 ? <><select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 mb-4">{projects.map(p => <option key={p.id} value={p.id}>{p.nome || p.name} · {p.doors ?? 0} portas · {p.drawers ?? 0} gavetas · {p.modules ?? 0} módulos</option>)}</select><div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">{([['sale_price','Preço de venda'],['material_cost','Materiais'],['hardware_cost','Ferragens'],['labor_cost','Mão de obra'],['other_cost','Outros']] as Array<[keyof Cost,string]>).map(([field,label]) => <label key={field} className="text-xs font-bold text-slate-600">{label}<input value={selectedCost[field] ?? ''} onChange={e => updateCost(field,e.target.value)} type="number" min="0" step="0.01" placeholder="Não informado" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>)}</div><div className="mt-4 flex flex-wrap items-center gap-4"><div className="rounded-xl bg-slate-50 px-4 py-3"><span className="text-xs text-slate-500">Margem do snapshot</span><strong className="block text-lg text-slate-900">{currentMargin == null ? 'Dados insuficientes' : `${currentMargin.toFixed(2)}%`}</strong></div>{dna?.minimum_margin_pct != null && currentMargin != null && <div className={currentMargin < dna.minimum_margin_pct ? 'rounded-xl bg-amber-50 px-4 py-3 text-amber-800' : 'rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800'}><span className="text-xs">Mínimo do DNA</span><strong className="block text-lg">{dna.minimum_margin_pct}%</strong></div>}<button disabled={saving || !selectedProject} onClick={() => void saveCost()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-bold disabled:opacity-50"><Save size={16} />Salvar e analisar</button></div></> : <p className="text-sm text-slate-500">Nenhum projeto disponível.</p>}</section>

    <section className="space-y-3">{alerts.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Nenhum alerta aberto. O sistema não inventa problemas quando não há evidência.</div>}{alerts.map(alert => <article key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex gap-3"><div className="text-amber-500 mt-0.5">{severityIcon(alert.severity)}</div><div className="flex-1"><div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-wider text-slate-400">{alert.severity}</span><span className="text-xs text-slate-400">{alert.alert_type}</span></div><p className="font-bold text-slate-800 mt-1">{alert.message}</p>{Object.keys(alert.evidence).length > 0 && <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(alert.evidence, null, 2)}</pre>}<p className="text-sm text-slate-500 mt-3">Ação sugerida: {alert.suggested_action ?? 'Nenhuma ação configurada.'}</p></div></div></article>)}</section>
  </div>;
}
