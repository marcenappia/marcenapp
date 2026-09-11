import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_PATHS = new Set(['/']);

function upsertMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

export default function SeoRoute() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.has(pathname);

    if (isPublic) {
      document.title = 'Marcenapp — Do projeto à produção, tudo no lugar.';
      upsertMeta(
        'description',
        'O Marcenapp reúne projeto, dimensionamento, visualização, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho para marcenaria.',
      );
      upsertMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      return;
    }

    const privateTitles: Record<string, string> = {
      '/auth': 'Entrar — Marcenapp',
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
  }, [pathname]);

  return null;
}
