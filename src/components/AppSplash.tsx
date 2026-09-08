import logo from '@/assets/marcenapp-logo.svg';

export default function AppSplash({ message = 'Preparando o MARCENAPP…' }: { message?: string }) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Carregando MARCENAPP"
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1015]"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-[hsl(var(--sidebar-active))]" style={{ animationDuration: '1.15s' }} />
          <div className="absolute inset-2 rounded-full border border-white/10" />
          <img src={logo} alt="MARCENAPP" className="h-16 w-16 object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,.45)]" />
        </div>
        <div>
          <p className="text-lg font-black tracking-tight text-white">MARCENA<span className="text-[hsl(var(--sidebar-active))]">PP</span></p>
          <p className="mt-1 text-xs font-medium text-white/50">{message}</p>
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[hsl(var(--sidebar-active))]" />
        </div>
      </div>
    </main>
  );
}
