import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Mic, Pencil, Loader2, Trash2, CheckCircle2, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { callAIText } from '@/services/ai';
import {
  DiarioRegistro, atualizarRegistro, carregarCabecalhoObra, criarRegistro, enviarFotoDiario,
  listarRegistros, removerRegistro,
} from './services/diarioObraService';

interface Props {
  projectId?: string | null;
  navigateTo?: (id: string, params?: Record<string, string>) => void;
}

const btn = 'flex-1 min-h-[86px] rounded-2xl font-extrabold text-base flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] touch-manipulation focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200';

export const DiarioObra = ({ projectId, navigateTo }: Props) => {
  const { user } = useAuth();
  const [obra, setObra] = useState<{ nome: string; cliente: string } | null>(null);
  const [registros, setRegistros] = useState<DiarioRegistro[]>([]);
  const [texto, setTexto] = useState('');
  const [escrevendo, setEscrevendo] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumoIara, setResumoIara] = useState<string | null>(null);
  const fotoInput = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async () => {
    if (!projectId || !user) return;
    setCarregando(true);
    try { setRegistros(await listarRegistros(projectId)); setErro(null); }
    catch { setErro('Não consegui carregar os registros agora.'); }
    finally { setCarregando(false); }
  }, [projectId, user]);

  useEffect(() => { if (projectId) carregarCabecalhoObra(projectId).then(setObra).catch(() => setObra(null)); }, [projectId]);
  useEffect(() => { recarregar(); }, [recarregar]);

  const registrar = async (tipo: 'foto' | 'nota' | 'voz', conteudo: string, fotoPath?: string) => {
    if (!projectId || !user) return;
    try {
      const novo = await criarRegistro({ userId: user.id, projectId, tipo, texto: conteudo, fotoPath });
      setTexto(''); setEscrevendo(false);
      setRegistros((prev) => [novo, ...prev]);
      if (fotoPath) recarregar();
    } catch { setErro('Não consegui salvar este registro.'); }
  };

  const adicionarFoto = async (file?: File) => {
    if (!file || !projectId || !user) return;
    setCarregando(true);
    try { const path = await enviarFotoDiario(user.id, projectId, file); await registrar('foto', texto.trim(), path); }
    catch { setErro('Não consegui enviar a foto.'); }
    finally { setCarregando(false); }
  };

  const falar = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setErro('Este aparelho não permite ditar por voz. Use "Escrever".'); return; }
    const rec = new SR();
    rec.lang = 'pt-BR'; rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results?.[0]?.[0]?.transcript?.trim(); if (t) registrar('voz', t); };
    rec.onerror = () => { setOuvindo(false); setErro('Não consegui ouvir. Tente de novo.'); };
    rec.onend = () => setOuvindo(false);
    setErro(null); setOuvindo(true); rec.start();
  };

  const alternarPendencia = async (r: DiarioRegistro) => {
    const resolvida = !r.pendencia_resolvida;
    setRegistros((prev) => prev.map((x) => (x.id === r.id ? { ...x, pendencia_resolvida: resolvida } : x)));
    try { await atualizarRegistro(r.id, { pendencia_resolvida: resolvida }); } catch { /* volta na próxima carga */ }
  };

  const excluir = async (r: DiarioRegistro) => {
    setRegistros((prev) => prev.filter((x) => x.id !== r.id));
    try { await removerRegistro(r.id); } catch { recarregar(); }
  };

  const organizarComIara = async () => {
    if (registros.length === 0) return;
    setCarregando(true); setErro(null);
    try {
      const lista = registros.map((r, i) => `${i + 1}. [${r.tipo}] ${r.texto || '(somente foto)'}`).join('\n');
      const prompt = `Você é a IARA, assistente técnica de marcenaria. Organize os registros do diário de obra abaixo.
Classifique cada item como: pedido do cliente, ponto de atenção, pendência ou medida.
REGRA OBRIGATÓRIA: nenhuma medida anotada no diário pode ser tratada como confirmada. Toda medida deve ser marcada como PRECISA CONFERIR.
Responda em português, curto, em tópicos, com as seções: PEDIDOS, ATENÇÃO, PENDÊNCIAS, MEDIDAS (PRECISA CONFERIR).

Registros:
${lista}`;
      const texto = await callAIText(prompt);
      setResumoIara(texto);
      const medidas = registros.filter((r) => /\d+\s?(cm|m|mm|metros?)/i.test(r.texto));
      await Promise.all(medidas.map((r) => atualizarRegistro(r.id, { categoria: 'medida', evidencia: 'precisa_conferir' })));
      if (medidas.length) recarregar();
    } catch (e: any) { setErro(e?.message || 'A IARA não conseguiu organizar agora.'); }
    finally { setCarregando(false); }
  };

  if (!projectId) return (
    <div className="max-w-xl mx-auto p-6 text-center space-y-4">
      <h2 className="text-2xl font-black text-slate-900">Diário da obra</h2>
      <p className="text-slate-500">Abra uma obra para registrar fotos, falas e anotações da visita.</p>
      <button onClick={() => navigateTo?.('dashboard')} className="w-full min-h-[60px] rounded-2xl bg-indigo-600 text-white font-extrabold">Ver minhas obras</button>
    </div>
  );

  if (!user) return (
    <div className="max-w-xl mx-auto p-6 text-center space-y-3">
      <h2 className="text-2xl font-black text-slate-900">Diário da obra</h2>
      <p className="text-slate-500">Entre na sua conta para guardar os registros desta obra.</p>
    </div>
  );

  const pendencias = registros.filter((r) => r.categoria === 'pendencia' || (!r.pendencia_resolvida && /pendente|falta|conferir|verificar/i.test(r.texto)));
  const confirmados = registros.filter((r) => r.pendencia_resolvida || r.categoria === 'confirmado');

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-5">
      <header>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">Diário da obra</h2>
        <p className="text-slate-500 mt-0.5">{obra?.nome ?? 'Obra'}{obra?.cliente ? ` · ${obra.cliente}` : ''}</p>
      </header>

      <div className="flex gap-3">
        <button className={`${btn} bg-indigo-600 text-white shadow-lg shadow-indigo-600/25`} onClick={() => fotoInput.current?.click()}>
          <Camera size={26} /> Foto
        </button>
        <button className={`${btn} ${ouvindo ? 'bg-red-600 text-white' : 'bg-white text-slate-800 border-2 border-slate-200'}`} onClick={falar}>
          {ouvindo ? <Loader2 size={26} className="animate-spin" /> : <Mic size={26} />} {ouvindo ? 'Ouvindo…' : 'Falar'}
        </button>
        <button className={`${btn} bg-white text-slate-800 border-2 border-slate-200`} onClick={() => setEscrevendo((v) => !v)}>
          <Pencil size={26} /> Escrever
        </button>
      </div>
      <input ref={fotoInput} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { adicionarFoto(e.target.files?.[0]); e.currentTarget.value = ''; }} />

      {escrevendo && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 space-y-3">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus
            placeholder="Ex.: cliente quer nicho à direita; tomada a 35 cm do piso (conferir)"
            className="w-full min-h-28 text-base outline-none resize-none text-slate-800 placeholder:text-slate-400" />
          <button disabled={!texto.trim()} onClick={() => registrar('nota', texto.trim())}
            className="w-full min-h-[52px] rounded-xl bg-slate-900 text-white font-extrabold disabled:opacity-40">Salvar anotação</button>
        </div>
      )}

      {erro && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{erro}</p>}

      <button onClick={organizarComIara} disabled={carregando || registros.length === 0}
        className="w-full min-h-[52px] rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-800 font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
        {carregando ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} IARA organizar o diário
      </button>

      {resumoIara && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-amber-700 mb-2">Resumo da IARA</p>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{resumoIara}</p>
          <p className="mt-3 text-xs text-amber-800">Medidas anotadas aqui ficam como <strong>PRECISA CONFERIR</strong> e não entram no orçamento, produção ou corte sem conferência.</p>
        </div>
      )}

      {(pendencias.length > 0 || confirmados.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/60 p-4">
            <p className="font-black text-orange-800 flex items-center gap-2 text-sm"><AlertTriangle size={16} /> Pendências ({pendencias.length})</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">{pendencias.slice(0, 5).map((r) => <li key={r.id} className="truncate">• {r.texto || 'Foto'}</li>)}</ul>
          </div>
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
            <p className="font-black text-emerald-800 flex items-center gap-2 text-sm"><CheckCircle2 size={16} /> Confirmado ({confirmados.length})</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">{confirmados.slice(0, 5).map((r) => <li key={r.id} className="truncate">• {r.texto || 'Foto'}</li>)}</ul>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="font-black text-slate-800">Linha do tempo</h3>
        {registros.length === 0 && !carregando && (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
            Nada registrado ainda. Tire uma foto ou fale o que viu na visita.
          </p>
        )}
        {registros.map((r) => (
          <article key={r.id} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                {new Date(r.created_at).toLocaleString('pt-BR')} · {r.tipo}
              </span>
              <button onClick={() => excluir(r)} aria-label="Excluir registro" className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            {r.texto && <p className="mt-1 text-slate-800 whitespace-pre-wrap">{r.texto}</p>}
            {r.fotoUrl && <img src={r.fotoUrl} alt="Registro da obra" loading="lazy" className="mt-3 w-full max-h-64 object-cover rounded-xl border border-slate-200" />}
            {r.evidencia === 'precisa_conferir' && (
              <p className="mt-2 inline-block rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-1">Medida — precisa conferir</p>
            )}
            <button onClick={() => alternarPendencia(r)}
              className={`mt-3 text-xs font-bold ${r.pendencia_resolvida ? 'text-emerald-600' : 'text-orange-600'}`}>
              {r.pendencia_resolvida ? '✓ Resolvido — desmarcar' : 'Marcar como resolvido'}
            </button>
          </article>
        ))}
      </section>

      <button onClick={() => navigateTo?.('novo', { projeto: projectId })}
        className="w-full min-h-[60px] rounded-2xl bg-slate-900 text-white font-extrabold flex items-center justify-center gap-2">
        Continuar a obra <ArrowRight size={20} />
      </button>
    </div>
  );
};

export default DiarioObra;
