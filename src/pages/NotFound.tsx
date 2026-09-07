import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFound = () => {
  useEffect(() => {
    // Atualizar meta tags para SEO mesmo na 404
    document.title = '404 — Página Não Encontrada | Marcenapp OS';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Página não encontrada no Marcenapp OS. Retorne ao início para acessar orçamento, 3D e contratos para marcenarias.';
      document.head.appendChild(meta);
    }
    console.warn('404 — Página não encontrada:', window.location.pathname);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4" role="main" aria-labelledby="not-found-title">
      <article className="text-center max-w-md w-full" aria-label="Página não encontrada">
        {/* Número 404 grande */}
        <p className="text-9xl font-black text-slate-200 select-none" aria-hidden="true">404</p>

        <h1 id="not-found-title" className="text-3xl font-bold text-foreground mb-3 -mt-4">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          A página que você procura não existe ou foi movida.
          Volte ao início para acessar orçamento, visualização 3D e contratos com IA.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:brightness-110 transition-all"
            aria-label="Voltar para a página inicial"
          >
            <Home size={18} aria-hidden="true" />
            Voltar ao Início
          </Link>
          <Link
            to="/?module=studio"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
            aria-label="Ir para o Estúdio 3D com IA"
          >
            <Search size={18} aria-hidden="true" />
            Explorar Recursos
          </Link>
        </div>

        <nav aria-label="Links úteis" className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
            Links populares
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {[
              { to: '/?module=novo', label: 'Novo Projeto' },
              { to: '/?module=orcamento', label: 'Orçamento' },
              { to: '/?module=studio', label: 'Estúdio 3D' },
              { to: '/?module=contrato', label: 'Contratos' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors text-xs font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </article>
    </main>
  );
};

export default NotFound;
