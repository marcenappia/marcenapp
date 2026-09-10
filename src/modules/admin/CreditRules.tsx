import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CreditRule {
  operation_type: string;
  credit_type: string;
  credit_cost: number | null;
  enabled: boolean;
  version: number;
  idempotency: boolean;
  updated_at: string;
}

const emptyRule = {
  operation_type: '',
  credit_type: '',
  credit_cost: '',
  enabled: true,
  version: '1',
  idempotency: true,
};

export default function CreditRules() {
  const [rules, setRules] = useState<CreditRule[]>([]);
  const [form, setForm] = useState(emptyRule);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRules = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setMessage('Sessão autenticada necessária.');
      setLoading(false);
      return;
    }

    const { data: admin, error: adminError } = await supabase.rpc('is_admin_user', { p_user_id: userId });
    if (adminError || !admin) {
      setMessage('Acesso restrito a administradores.');
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    const { data, error } = await supabase.rpc('admin_list_billing_credit_rules');
    if (error) {
      setMessage(error.message);
    } else {
      setRules((data ?? []) as CreditRule[]);
      setMessage('');
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const saveRule = async () => {
    const creditCost = Number(form.credit_cost);
    const version = Number(form.version);
    if (!form.operation_type.trim() || !form.credit_type.trim() || !Number.isInteger(creditCost) || creditCost <= 0 || !Number.isInteger(version) || version <= 0) {
      setMessage('Preencha operação, tipo de crédito, custo inteiro positivo e versão positiva.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('admin_upsert_billing_credit_rule', {
      p_operation_type: form.operation_type.trim(),
      p_credit_type: form.credit_type.trim(),
      p_credit_cost: creditCost,
      p_enabled: form.enabled,
      p_version: version,
      p_idempotency: form.idempotency,
    });
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Regra salva.');
    setForm(emptyRule);
    await loadRules();
  };

  if (loading) return <div className="p-6">Carregando regras comerciais…</div>;
  if (!isAdmin) return <div className="p-6 text-red-600">{message || 'Acesso negado.'}</div>;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Regras comerciais de créditos</h2>
        <p className="text-sm text-slate-500">Configure apenas políticas comerciais oficialmente definidas. Nenhum valor é pré-configurado pelo sistema.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-2">
        <input className="rounded-lg border p-2" placeholder="Operação" value={form.operation_type} onChange={e => setForm({ ...form, operation_type: e.target.value })} />
        <input className="rounded-lg border p-2" placeholder="Tipo de crédito" value={form.credit_type} onChange={e => setForm({ ...form, credit_type: e.target.value })} />
        <input className="rounded-lg border p-2" type="number" min="1" placeholder="Custo em créditos" value={form.credit_cost} onChange={e => setForm({ ...form, credit_cost: e.target.value })} />
        <input className="rounded-lg border p-2" type="number" min="1" placeholder="Versão" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Ativa</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.idempotency} onChange={e => setForm({ ...form, idempotency: e.target.checked })} /> Exigir idempotência</label>
        <button type="button" disabled={saving} onClick={() => void saveRule()} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-2">
          <Save size={16} /> {saving ? 'Salvando…' : 'Salvar regra'}
        </button>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-3">Operação</th><th className="p-3">Crédito</th><th className="p-3">Custo</th><th className="p-3">Versão</th><th className="p-3">Ativa</th><th className="p-3">Idempotência</th></tr></thead>
          <tbody>{rules.map(rule => <tr key={`${rule.operation_type}:${rule.version}`} className="border-b last:border-0"><td className="p-3">{rule.operation_type}</td><td className="p-3">{rule.credit_type}</td><td className="p-3">{rule.credit_cost ?? '—'}</td><td className="p-3">{rule.version}</td><td className="p-3">{rule.enabled ? 'Sim' : 'Não'}</td><td className="p-3">{rule.idempotency ? 'Sim' : 'Não'}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
