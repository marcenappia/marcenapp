import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, FlaskConical, Loader2, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { callAIText } from '@/services/ai';
import { getAIProvider, isLovableProviderConfigured, setAIProvider, type AIProvider } from '@/services/aiProvider';

const options: Array<{ id: AIProvider; label: string; description: string }> = [
  { id: 'automatic', label: 'Automático', description: 'Usa o provedor padrão (Gemini enquanto Lovable não estiver configurado).' },
  { id: 'gemini', label: 'Gemini', description: 'Provedor atual de IA do MARCENAPP.' },
  { id: 'lovable', label: 'Lovable', description: 'Modo de teste. Requer integração/backend configurado.' },
];

export default function AIProviderAdmin() {
  const [provider, setProvider] = useState<AIProvider>('automatic');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; ms: number; message: string } | null>(null);

  useEffect(() => { getAIProvider().then(setProvider).finally(() => setLoading(false)); }, []);

  const changeProvider = async (next: AIProvider) => {
    setProvider(next);
    setTest(null);
    try { await setAIProvider(next); } catch { setTest({ ok: false, ms: 0, message: 'Não foi possível salvar a configuração.' }); }
  };

  const testProvider = async () => {
    setTesting(true); setTest(null); const started = performance.now();
    try {
      if (provider === 'lovable' && !isLovableProviderConfigured()) {
        throw new Error('Lovable ainda não está configurado no backend. Gemini continua disponível.');
      }
      const text = await callAIText('Responda somente: TESTE IARA OK');
      setTest({ ok: true, ms: Math.round(performance.now() - started), message: text || 'Provedor respondeu sem texto.' });
    } catch (error) {
      setTest({ ok: false, ms: Math.round(performance.now() - started), message: error instanceof Error ? error.message : 'Falha no teste.' });
    } finally { setTesting(false); }
  };

  if (loading) return <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" size={18} /> Carregando configuração…</div>;

  return <section className="max-w-3xl mx-auto space-y-5">
    <div><div className="flex items-center gap-2"><Sparkles className="text-indigo-600" size={22} /><h1 className="text-2xl font-black text-slate-900">Provedor de IA</h1></div><p className="text-sm text-slate-500 mt-1">Escolha qual motor a IARA deve usar para os testes e operações de IA.</p></div>
    <div className="grid gap-3">
      {options.map(option => <button key={option.id} onClick={() => changeProvider(option.id)} className={`text-left rounded-2xl border p-4 transition-all ${provider === option.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
        <div className="flex items-start justify-between gap-4"><div><p className="font-extrabold text-slate-900">{option.label}</p><p className="text-sm text-slate-500 mt-1">{option.description}</p></div>{provider === option.id && <CheckCircle2 className="text-indigo-600 shrink-0" size={20} />}</div>
        {option.id === 'lovable' && <p className="mt-3 text-xs font-semibold text-amber-700">{isLovableProviderConfigured() ? 'Integração detectada.' : 'Integração ainda não configurada.'}</p>}
      </button>)}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><p className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600" /> Configuração segura</p><p className="text-xs text-slate-500 mt-1">Nenhuma chave de API é armazenada no navegador ou nesta configuração.</p></div><button onClick={testProvider} disabled={testing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{testing ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />} Testar IA</button></div>
    {test && <div className={`rounded-2xl border p-4 ${test.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><div className="flex items-center gap-2 font-bold text-sm">{test.ok ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}{test.ok ? 'Teste concluído' : 'Teste falhou'}<span className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500"><Clock3 size={13} /> {test.ms} ms</span></div><p className="text-sm mt-2 text-slate-700 whitespace-pre-wrap">{test.message}</p></div>}
  </section>;
}
