import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((window.navigator as NavigatorWithStandalone).standalone);

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    if (isIos()) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    setInstallEvent(null);
    setShowIosHint(false);
  };

  if (!installEvent && !showIosHint) return null;

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setInstallEvent(null);
  };

  return (
    <aside
      className="fixed inset-x-4 bottom-24 z-[80] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:bottom-6"
      aria-label="Instalar Marcenapp"
    >
      <div className="flex items-start gap-3">
        <img src="/pwa-icon.svg" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-950">Instale o Marcenapp</p>
          {installEvent ? (
            <p className="mt-1 text-xs leading-5 text-slate-600">Tenha o Marcenapp na tela inicial e abra seu espaço de trabalho como um aplicativo.</p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-slate-600">No iPhone ou iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {installEvent && (
              <button type="button" onClick={() => void install()} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
                Instalar
              </button>
            )}
            <button type="button" onClick={dismiss} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">
              Agora não
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
