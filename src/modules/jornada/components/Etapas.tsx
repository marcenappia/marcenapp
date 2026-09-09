import React from 'react';
import { Camera, Image as ImageIcon, Loader2, RefreshCcw, Sparkles, ThumbsUp, Download, Share2, ArrowRight, Calculator, Factory } from 'lucide-react';
import { AnaliseIara } from '../types';

const inputCls =
  'w-full text-lg p-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 outline-none focus:border-indigo-500 placeholder:text-slate-400';

export const BotaoPrincipal = ({
  children, onClick, disabled, loading, icon: Icon = ArrowRight, variante = 'primary',
}: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; loading?: boolean;
  icon?: React.ElementType; variante?: 'primary' | 'ok' | 'secundario';
}) => {
  const cores = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25',
    ok: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25',
    secundario: 'bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200',
  }[variante];
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}
      className={`w-full min-h-[60px] rounded-2xl text-lg font-extrabold flex items-center justify-center gap-3 transition-all active:scale-[0.98] touch-manipulation focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed ${cores}`}>
      {loading ? <Loader2 className="animate-spin" size={22} /> : <Icon size={22} />}
      {children}
    </button>
  );
};

export const Titulo = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div className="mb-5"><h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{children}</h2>{sub && <p className="text-slate-500 mt-1 text-base">{sub}</p>}</div>
);

export const EtapaNome = (p: { nome: string; setNome: (v: string) => void; clienteNome: string; setClienteNome: (v: string) => void; onNext: () => void; loading: boolean; precisaLogin?: boolean }) => (
  <div className="space-y-4">
    <Titulo sub="Só o básico para começar. O resto a IARA ajuda.">Como vai se chamar essa obra?</Titulo>
    <label className="block"><span className="text-sm font-bold text-slate-700 mb-1.5 block">Nome da obra</span><input className={inputCls} value={p.nome} onChange={(e) => p.setNome(e.target.value)} placeholder="Ex.: Cozinha da Dona Maria" autoFocus /></label>
    <label className="block"><span className="text-sm font-bold text-slate-700 mb-1.5 block">Cliente <span className="font-normal text-slate-400">(opcional)</span></span><input className={inputCls} value={p.clienteNome} onChange={(e) => p.setClienteNome(e.target.value)} placeholder="Ex.: Maria Silva" /></label>
    {p.precisaLogin && <p className="text-sm text-slate-500 rounded-xl bg-slate-50 border border-slate-200 p-3">Para guardar esta obra e continuar depois em outro aparelho, vamos pedir seu acesso ao salvar.</p>}
    <BotaoPrincipal onClick={p.onNext} disabled={!p.nome.trim()} loading={p.loading}>Começar a obra</BotaoPrincipal>
  </div>
);

export const EtapaFoto = (p: { foto: string | null; onFile: (f: File) => void; onClear: () => void; onNext: () => void; loading?: boolean }) => (
  <div className="space-y-4">
    <Titulo sub="Pode ser do celular mesmo. Mostre a parede ou o canto onde vai o móvel.">Tire uma foto do ambiente</Titulo>
    {p.foto ? <div className="space-y-3"><img src={p.foto} alt="Foto do ambiente" className="w-full max-h-[50vh] object-contain rounded-2xl bg-slate-900" /><button type="button" onClick={p.onClear} className="w-full min-h-[52px] rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2"><RefreshCcw size={18} /> Trocar foto</button><BotaoPrincipal onClick={p.onNext} loading={p.loading}>{p.loading ? 'Guardando a foto…' : 'Usar esta foto'}</BotaoPrincipal></div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="min-h-[140px] rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/25 focus-within:ring-4 focus-within:ring-indigo-200"><Camera size={36} /><span className="text-lg font-extrabold">Tirar foto</span><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && p.onFile(e.target.files[0])} /></label><label className="min-h-[140px] rounded-2xl bg-white border-2 border-dashed border-slate-300 text-slate-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 active:scale-[0.98] transition-all focus-within:ring-4 focus-within:ring-indigo-200"><ImageIcon size={36} className="text-slate-400" /><span className="text-lg font-extrabold">Escolher da galeria</span><input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && p.onFile(e.target.files[0])} /></label></div>}
  </div>
);

export const EtapaPedido = (p: { pedido: string; setPedido: (v: string) => void; onNext: () => void; loading: boolean }) => (
  <div className="space-y-4">
    <Titulo sub="Escreva do seu jeito, como o cliente falou. Não precisa de termo técnico.">O que o cliente quer?</Titulo>
    <textarea className={`${inputCls} min-h-[140px] resize-none`} value={p.pedido} onChange={(e) => p.setPedido(e.target.value)} placeholder="Ex.: Armário até o teto nessa parede, com espaço pra geladeira e gavetão embaixo. Cor branca com madeira." />
    <div className="flex flex-wrap gap-2">{['Armário de cozinha até o teto', 'Guarda-roupa com portas de correr', 'Painel de TV com nichos', 'Bancada com gavetas'].map((s) => <button key={s} type="button" onClick={() => p.setPedido(p.pedido ? `${p.pedido} ${s}` : s)} className="px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700">{s}</button>)}</div>
    <BotaoPrincipal onClick={p.onNext} disabled={!p.pedido.trim()} loading={p.loading} icon={Sparkles}>{p.loading ? 'IARA está analisando…' : 'Pedir para a IARA conferir'}</BotaoPrincipal>
  </div>
);

export const EtapaAnalise = (p: { analise: AnaliseIara; respostas: Record<string, string>; setRespostas: (r: Record<string, string>) => void; onNext: () => void; loading: boolean }) => {
  const m = p.analise.medidas || {};
  const temMedida = m.width || m.height || m.depth;
  return <div className="space-y-4"><Titulo sub="A IARA entendeu assim. Confira e responda só o que ela perguntou.">Entendi o pedido</Titulo><div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4"><p className="text-slate-800 text-lg font-semibold">{p.analise.resumo}</p>{temMedida && <p className="text-sm text-indigo-700 mt-2 font-bold">Medidas estimadas pela foto: {m.width ? `${m.width} m de largura` : ''}{m.height ? ` · ${m.height} m de altura` : ''}{m.depth ? ` · ${m.depth} m de fundo` : ''}</p>}</div>{p.analise.perguntas.length === 0 ? <p className="text-emerald-700 font-bold flex items-center gap-2"><ThumbsUp size={18} /> Não falta nada. Pode gerar a apresentação.</p> : <div className="space-y-3">{p.analise.perguntas.map((q) => <label key={q.id} className="block"><span className="text-base font-bold text-slate-800 block mb-1.5">{q.pergunta}</span><input className={inputCls} value={p.respostas[q.id] ?? ''} onChange={(e) => p.setRespostas({ ...p.respostas, [q.id]: e.target.value })} placeholder={q.dica || 'Sua resposta'} /></label>)}</div>}<BotaoPrincipal onClick={p.onNext} loading={p.loading} icon={Sparkles}>{p.loading ? 'Montando a apresentação…' : 'Gerar apresentação para o cliente'}</BotaoPrincipal></div>;
};

export const EtapaApresentacao = (p: { imagem: string | null; onNext: () => void; loading?: boolean; nome: string }) => {
  const baixar = () => { if (!p.imagem) return; const a = document.createElement('a'); a.href = p.imagem; a.download = `${p.nome || 'apresentacao'}.png`; a.click(); };
  return <div className="space-y-4"><Titulo sub="A apresentação está pronta. Confira antes de mostrar ao cliente.">Apresentação pronta</Titulo>{p.imagem ? <img src={p.imagem} alt="Apresentação do móvel no ambiente" className="w-full rounded-2xl shadow-xl" /> : <p className="text-slate-500">A imagem ainda está sendo preparada.</p>}<div className="grid grid-cols-2 gap-3"><button type="button" onClick={baixar} className="min-h-[52px] rounded-2xl bg-white border-2 border-slate-200 font-bold text-slate-700 flex items-center justify-center gap-2"><Download size={18} /> Baixar</button><BotaoPrincipal onClick={p.onNext} loading={p.loading} icon={ArrowRight}>Ir para aprovação</BotaoPrincipal></div></div>;
};

export const EtapaAprovacao = (p: { imagem: string | null; onAprovar: () => void; loading: boolean }) => (
  <div className="space-y-4"><Titulo sub="Mostre esta apresentação ao cliente e registre a decisão.">Aprovação do cliente</Titulo>{p.imagem && <img src={p.imagem} alt="Apresentação para aprovação do cliente" className="w-full rounded-2xl shadow-xl" />}<BotaoPrincipal onClick={p.onAprovar} variante="ok" icon={ThumbsUp} loading={p.loading}>Cliente aprovou — continuar</BotaoPrincipal></div>
);

export const EtapaOrcamento = (p: { onOrcamento: () => void; onProducao: () => void }) => (
  <div className="space-y-4"><Titulo sub="A aprovação ficou registrada. As medidas seguem para o orçamento.">Orçamento</Titulo><BotaoPrincipal onClick={p.onOrcamento} icon={Calculator}>Abrir orçamento</BotaoPrincipal><BotaoPrincipal onClick={p.onProducao} variante="secundario" icon={ArrowRight}>Continuar para produção</BotaoPrincipal></div>
);

export const EtapaProducao = (p: { onProducao: () => void; onInicio: () => void }) => (
  <div className="space-y-4"><Titulo sub="A obra está pronta para entrar no fluxo de fabricação.">Produção</Titulo><BotaoPrincipal onClick={p.onProducao} icon={Factory}>Abrir produção</BotaoPrincipal><BotaoPrincipal onClick={p.onInicio} variante="secundario">Voltar ao início</BotaoPrincipal></div>
);
