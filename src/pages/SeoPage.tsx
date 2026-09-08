import { ArrowRight, Check, Cuboid, FileText, Hammer, Scissors, Ruler, Search, Boxes } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';

type SeoContent = {
  title: string;
  description: string;
  intro: string;
  points: string[];
  related: string[];
  icon: typeof Cuboid;
};

const CONTENT: Record<string, SeoContent> = {
  marcena: {
    title: 'MARCENA — projetos de marcenaria que ajudam a vender',
    description: 'MARCENA é a experiência visual do MARCENAPP para apresentar projetos de marcenaria, móveis planejados e ambientes 2D e 3D ao cliente.',
    intro: 'MARCENA transforma o ambiente real e o pedido do cliente em uma apresentação de projeto mais clara, profissional e fácil de aprovar.',
    points: ['Projeto visual a partir da foto do ambiente', 'Apresentação de alternativas e ajustes', 'Documentação 2D para avançar o projeto', 'Orçamento e produção conectados ao mesmo projeto'],
    related: ['projeto-3d-marcenaria', 'projeto-2d-marcenaria', 'orcamento-marcenaria'],
    icon: Cuboid,
  },
  marcenaria: {
    title: 'Marcenaria inteligente — MARCENAPP',
    description: 'Conheça uma forma mais organizada de trabalhar com marcenaria: foto do ambiente, projeto 3D, projeto 2D, orçamento, aprovação e produção.',
    intro: 'MARCENAPP reúne as etapas que normalmente ficam espalhadas entre caderno, WhatsApp, planilha, desenho e produção.',
    points: ['Organize cada ambiente e pedido do cliente', 'Use projeto 3D para apresentar a ideia', 'Use projeto 2D para documentar o que foi confirmado', 'Conecte orçamento, aprovação e produção'],
    related: ['moveis-planejados', 'projeto-3d-marcenaria', 'plano-de-corte'],
    icon: Hammer,
  },
  'moveis-planejados': {
    title: 'Móveis planejados — projeto, apresentação e orçamento',
    description: 'MARCENAPP ajuda marceneiros a organizar projetos de móveis planejados, apresentar ambientes em 3D, documentar em 2D e preparar o orçamento.',
    intro: 'Para móveis planejados, a apresentação precisa deixar claro o que será feito antes de a produção começar. O MARCENAPP organiza esse caminho.',
    points: ['Cozinhas, quartos, painéis, closets e outros ambientes', 'Visualização do projeto no contexto do ambiente', 'Ajustes antes da aprovação', 'Orçamento ligado ao projeto aprovado'],
    related: ['marcenaria', 'projeto-3d-marcenaria', 'orcamento-marcenaria'],
    icon: Boxes,
  },
  'projeto-3d-marcenaria': {
    title: 'Projeto 3D de marcenaria — visualize antes de produzir',
    description: 'Entenda como usar projeto 3D de marcenaria para apresentar móveis planejados no ambiente real, ajustar a proposta e facilitar a aprovação do cliente.',
    intro: 'O projeto 3D serve para responder uma pergunta simples: como esse móvel vai ficar no ambiente do cliente?',
    points: ['Comece pela foto e pelo pedido do cliente', 'Apresente o móvel no contexto do ambiente', 'Ajuste composição, estilo e solução', 'Aprove o resultado antes de seguir para a documentação'],
    related: ['projeto-2d-marcenaria', 'moveis-planejados', 'marcena'],
    icon: Cuboid,
  },
  'projeto-2d-marcenaria': {
    title: 'Projeto 2D de marcenaria — documentação para executar melhor',
    description: 'Projeto 2D de marcenaria para organizar vistas, planta e medidas confirmadas antes de avançar para orçamento e produção.',
    intro: 'O 2D entra quando a ideia precisa virar documentação. O MARCENAPP separa o que foi confirmado do que ainda precisa de revisão.',
    points: ['Planta e vistas do ambiente', 'Medidas confirmadas antes de documentar', 'Documentação conceitual e executiva conforme o estágio', 'Base mais clara para orçamento e produção'],
    related: ['projeto-3d-marcenaria', 'plano-de-corte', 'orcamento-marcenaria'],
    icon: Ruler,
  },
  'orcamento-marcenaria': {
    title: 'Orçamento de marcenaria — do projeto aprovado ao preço',
    description: 'Organize o orçamento de marcenaria a partir do projeto, materiais, medidas e decisões confirmadas pelo cliente.',
    intro: 'Um orçamento melhor começa antes da planilha: começa com um projeto compreendido e com as informações críticas confirmadas.',
    points: ['Itens e ambientes ligados ao projeto', 'Materiais e medidas tratados com clareza', 'Margem e preço organizados', 'Aprovação do cliente antes da produção'],
    related: ['marcenaria', 'moveis-planejados', 'plano-de-corte'],
    icon: FileText,
  },
  'plano-de-corte': {
    title: 'Plano de corte para marcenaria — projeto até a produção',
    description: 'Leve o projeto de marcenaria para a produção com mais organização, conectando medidas confirmadas, materiais e plano de corte.',
    intro: 'O plano de corte é consequência de um projeto bem definido. O MARCENAPP conecta a documentação ao caminho da produção.',
    points: ['Use somente medidas e materiais confirmados', 'Separe projeto visual de documentação de produção', 'Organize informações para o corte', 'Evite levar estimativas não confirmadas para a fábrica'],
    related: ['projeto-2d-marcenaria', 'orcamento-marcenaria', 'software-para-marceneiro'],
    icon: Scissors,
  },
  'software-para-marceneiro': {
    title: 'Software para marceneiro — projeto, orçamento e produção',
    description: 'MARCENAPP é um software para marceneiros que conecta projeto 3D, projeto 2D, orçamento, aprovação e produção em um só fluxo.',
    intro: 'Em vez de trocar de ferramenta a cada etapa, o marceneiro pode manter o projeto como o centro do trabalho.',
    points: ['Projeto visual e documentação', 'Orçamento e aprovação', 'Diário e acompanhamento', 'Produção e plano de corte'],
    related: ['marcenaria', 'projeto-3d-marcenaria', 'orcamento-marcenaria'],
    icon: Hammer,
  },
};

const LABELS: Record<string, string> = {
  marcena: 'MARCENA',
  marcenaria: 'Marcenaria inteligente',
  'moveis-planejados': 'Móveis planejados',
  'projeto-3d-marcenaria': 'Projeto 3D',
  'projeto-2d-marcenaria': 'Projeto 2D',
  'orcamento-marcenaria': 'Orçamento',
  'plano-de-corte': 'Plano de corte',
  'software-para-marceneiro': 'Software para marceneiro',
};

function upsertMeta(name: string, content: string) {
  let tag = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function upsertCanonical(url: string) {
  let tag = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.href = url;
}

const SeoPage = () => {
  const { slug = 'marcena' } = useParams();
  const navigate = useNavigate();
  const content = CONTENT[slug];
  const Icon = content?.icon ?? Search;
  const canonical = `https://marcenap40.lovable.app/${slug}`;

  useEffect(() => {
    if (!content) return;
    document.title = `${content.title} | MARCENAPP`;
    document.documentElement.lang = 'pt-BR';
    upsertMeta('description', content.description);
    upsertMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    upsertCanonical(canonical);

    const old = document.getElementById('marcenapp-seo-jsonld');
    old?.remove();
    const script = document.createElement('script');
    script.id = 'marcenapp-seo-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': 'https://marcenap40.lovable.app/#organization',
          name: 'MARCENAPP',
          alternateName: 'MARCENA',
          url: 'https://marcenap40.lovable.app/',
          logo: 'https://marcenap40.lovable.app/pwa-icon.svg',
        },
        {
          '@type': 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: content.title,
          description: content.description,
          inLanguage: 'pt-BR',
          isPartOf: { '@id': 'https://marcenap40.lovable.app/#website' },
          about: { '@id': 'https://marcenap40.lovable.app/#organization' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'MARCENAPP', item: 'https://marcenap40.lovable.app/' },
            { '@type': 'ListItem', position: 2, name: LABELS[slug] ?? 'MARCENA', item: canonical },
          ],
        },
      ],
    });
    document.head.appendChild(script);

    return () => script.remove();
  }, [canonical, content, slug]);

  if (!content) {
    navigate('/marcena', { replace: true });
    return null;
  }

  const relatedPages = content.related.filter((item) => CONTENT[item]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="MARCENAPP" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-black tracking-tight">MARCENAPP</div>
              <div className="text-[10px] text-slate-400 font-semibold">Marcenaria inteligente</div>
            </div>
          </Link>
          <button onClick={() => navigate('/auth')} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black hover:bg-indigo-500 transition">Começar</button>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10">
          <div className="max-w-5xl mx-auto px-5 py-16 md:py-24">
            <div className="flex items-center gap-3 text-indigo-300 text-sm font-black uppercase tracking-[.18em]"><Icon size={18} /> {LABELS[slug]}</div>
            <h1 className="mt-5 text-4xl md:text-6xl font-black tracking-tight leading-[1.04] max-w-4xl">{content.title}</h1>
            <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">{content.intro}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/auth')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-black hover:bg-indigo-500 transition">Conhecer o MARCENAPP <ArrowRight size={18} /></button>
              <Link to="/marcena" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 font-bold text-slate-200 hover:bg-white/10 transition">Ver MARCENA</Link>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-14 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black">O que você encontra no fluxo</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-7">
            {content.points.map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-white/[.04] p-5 flex gap-3">
                <Check size={19} className="mt-0.5 shrink-0 text-emerald-400" />
                <span className="text-slate-200 leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-900/60">
          <div className="max-w-5xl mx-auto px-5 py-14 md:py-18">
            <h2 className="text-2xl md:text-3xl font-black">Continue pelo projeto</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-7">
              {relatedPages.map((item) => (
                <Link key={item} to={`/${item}`} className="rounded-2xl border border-white/10 bg-white/[.03] p-5 hover:bg-white/[.06] transition">
                  <div className="font-extrabold">{LABELS[item]}</div>
                  <div className="mt-2 text-sm text-slate-400">Entenda como essa etapa se conecta ao trabalho da marcenaria.</div>
                  <div className="mt-4 text-sm font-bold text-indigo-300 inline-flex items-center gap-1">Abrir página <ArrowRight size={14} /></div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-14 md:py-20">
          <div className="rounded-3xl border border-indigo-400/20 bg-indigo-500/[.08] p-7 md:p-10">
            <div className="flex items-center gap-2 text-indigo-200 font-bold"><Hammer size={18} /> MARCENAPP</div>
            <h2 className="mt-3 text-2xl md:text-3xl font-black">Projeto, orçamento e produção no mesmo caminho.</h2>
            <p className="mt-4 text-slate-300 leading-relaxed max-w-2xl">A ideia é simples: o projeto aprovado continua sendo a referência para as próximas etapas. O sistema organiza o trabalho sem transformar a rotina do marceneiro em uma operação complicada.</p>
            <Link to="/" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-white hover:text-indigo-200">Voltar para MARCENAPP <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-7">
        <div className="max-w-5xl mx-auto px-5 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} MARCENAPP</span>
          <span>Marcenaria inteligente.</span>
        </div>
      </footer>
    </div>
  );
};

export default SeoPage;
