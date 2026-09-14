import { ArrowRight, FileText, FolderKanban, MessageCircle, Ruler, Sparkles, Users, Wand2 } from 'lucide-react';

interface Props {
  profession?: string | null;
  name?: string | null;
  navigateTo: (id: string, params?: Record<string, string>) => void;
}

const profileCopy: Record<string, { label: string; title: string; description: string }> = {
  projetista: {
    label: 'Área do projetista',
    title: 'Seu trabalho começa no projeto.',
    description: 'Tenha projeto, medidas, documentação e visualização no mesmo fluxo, sem começar de novo a cada acesso.',
  },
  outro: {
    label: 'Área profissional',
    title: 'Seu Marcenapp começa pelo que você precisa fazer.',
    description: 'Use a IARA e as ferramentas do Marcenapp a partir de um espaço simples, recorrente e orientado à ação.',
  },
};

export const ProfessionalWorkspace = ({ profession, name, navigateTo }: Props) => {
  const copy = profileCopy[profession ?? 'outro'] ?? profileCopy.outro;
  const primeiroNome = name?.trim().split(/\s+/)[0];

  if (profession === 'projetista') {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.label}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{primeiroNome ? `Olá, ${primeiroNome}.` : copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy.description}</p>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => navigateTo('novo')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><FolderKanban size={18} /></div><p className="mt-4 text-sm font-black text-slate-900">Novo projeto</p><p className="mt-1 text-xs leading-5 text-slate-500">Comece um projeto e organize o contexto.</p><ArrowRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-1" /></button>
          <button type="button" onClick={() => navigateTo('studio')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Wand2 size={18} /></div><p className="mt-4 text-sm font-black text-slate-900">Visualizar com IARA</p><p className="mt-1 text-xs leading-5 text-slate-500">Converse sobre o projeto e avance para visualização.</p><ArrowRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-1" /></button>
          <button type="button" onClick={() => navigateTo('clientes')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Users size={18} /></div><p className="mt-4 text-sm font-black text-slate-900">Clientes</p><p className="mt-1 text-xs leading-5 text-slate-500">Acesse os clientes ligados aos seus projetos.</p><ArrowRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-1" /></button>
          <button type="button" onClick={() => navigateTo('orcamento')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><FileText size={18} /></div><p className="mt-4 text-sm font-black text-slate-900">Documentar</p><p className="mt-1 text-xs leading-5 text-slate-500">Leve o projeto para orçamento e documentação.</p><ArrowRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-1" /></button>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white md:p-8"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Seu próximo movimento</p><h2 className="mt-2 text-2xl font-black">Projeto → IARA → artefato</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Mantenha o contexto do trabalho e avance para a próxima ação sem perder o projeto.</p></div><button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"><MessageCircle size={17} /> Falar com a IARA <ArrowRight size={15} /></button></div></section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header><p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.label}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{primeiroNome ? `Olá, ${primeiroNome}.` : copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy.description}</p></header>
      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => navigateTo('studio')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><Sparkles size={18} /></div><p className="mt-4 text-sm font-black text-slate-900">Falar com a IARA</p><p className="mt-1 text-xs leading-5 text-slate-500">Comece pelo que você precisa resolver agora.</p><ArrowRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-1" /></button>
        <button type="button" onClick={() => navigateTo('clientes')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Users size={18} /></div><p className="mt-4 text-sm font-black text-slate-900">Clientes</p><p className="mt-1 text-xs leading-5 text-slate-500">Encontre o contexto que já está salvo.</p><ArrowRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-1" /></button>
        <button type="button" onClick={() => navigateTo('diario')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Ruler size={18} /></div><p className="mt-4 text-sm font-black text-slate-900">Registrar trabalho</p><p className="mt-1 text-xs leading-5 text-slate-500">Foto, voz ou texto para manter o contexto.</p><ArrowRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-1" /></button>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white md:p-8"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Marcenapp</p><h2 className="mt-2 text-2xl font-black">Uma área que acompanha seu trabalho.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Você entra, encontra suas ferramentas e continua de onde parou. O perfil profissional define a porta de entrada, não cria um sistema paralelo.</p></section>
    </div>
  );
};

export default ProfessionalWorkspace;
