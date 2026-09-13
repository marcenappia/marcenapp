import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_PATHS = new Set(['/']);
const TRACKING_QUERY_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']);

function upsertMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function upsertCanonical(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.href = href;
}

export default function SeoRoute() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const hasNonTrackingQuery = [...params.keys()].some((key) => !TRACKING_QUERY_PARAMS.has(key));
    const isPublic = PUBLIC_PATHS.has(pathname) && !hasNonTrackingQuery;

    if (isPublic) {
      document.documentElement.lang = 'pt-BR';
      document.title = 'Marcenapp — Do projeto à produção, tudo no lugar.';
      upsertMeta(
        'description',
        'O Marcenapp reúne projeto, dimensionamento, visualização, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho para marcenaria.',
      );
      upsertMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      upsertCanonical('https://www.marcenapp.com.br/');
      return;
    }

    const privateTitles: Record<string, string> = {
      '/auth': 'Entrar — Marcenapp',
      '/auth/callback': 'Entrar — Marcenapp',
      '/login': 'Entrar — Marcenapp',
      '/signup': 'Criar conta — Marcenapp',
      '/register': 'Criar conta — Marcenapp',
      '/forgot-password': 'Recuperar acesso — Marcenapp',
      '/reset-password': 'Redefinir acesso — Marcenapp',
      '/cliente/revisao': 'Revisão de projeto — Marcenapp',
      '/admin/agentes': 'Administração — Marcenapp',
    };

    document.title = privateTitles[pathname] ?? 'Marcenapp';
    upsertMeta('robots', 'noindex, nofollow, noarchive');
  }, [pathname, search]);

  return null;
}
