import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PROFESSIONAL_PROFILES } from "@/modules/admin/ProfessionalProfiles";
import SeoRoute from "@/components/SeoRoute";

type LazyImporter<T extends React.ComponentType<unknown>> = () => Promise<{ default: T }>;

const lazyWithRetry = <T extends React.ComponentType<unknown>>(importer: LazyImporter<T>, key: string) =>
  lazy(async () => {
    const retryKey = `marcenapp:chunk-retry:${key}`;

    try {
      const module = await importer();
      sessionStorage.removeItem(retryKey);
      return module;
    } catch (error) {
      // A stale browser cache can keep the HTML from one deployment while a
      // lazy chunk belongs to another deployment. Retry the page once so the
      // browser gets a consistent asset set instead of rendering a blank app.
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, "1");
        const url = new URL(window.location.href);
        url.searchParams.set('marcenapp_reload', String(Date.now()));
        window.location.replace(url.toString());
      }
      throw error;
    }
  });

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Marcenapp frontend crashed:", error, info.componentStack);
  }

  handleReload = () => {
    sessionStorage.removeItem("marcenapp:chunk-retry:index");
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[.05] p-7 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <img src="/marcenapp-logo.svg" alt="Marcenapp" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-black tracking-wide">MARCENAPP</p>
              <p className="text-xs text-slate-400">Falha ao abrir o espaço de trabalho</p>
            </div>
          </div>
          <h1 className="text-xl font-black">O aplicativo encontrou um erro inesperado.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A sessão continua preservada. Recarregue para reconstruir a aplicação com os arquivos atuais.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
          >
            Recarregar Marcenapp
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-black/30 p-3 text-[11px] text-red-300">
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
        </section>
      </main>
    );
  }
}

const Index = lazyWithRetry(() => import("./pages/Index"), "index");
const Auth = lazyWithRetry(() => import("./pages/Auth"), "auth");
const Landing = lazyWithRetry(() => import("./pages/LandingV2"), "landing");
const ProfessionalProfileSelection = lazyWithRetry(
  () => import("./pages/ProfessionalProfileSelection"),
  "professional-profile",
);
const ClientReview = lazyWithRetry(() => import("./pages/ClientReview"), "client-review");
const AdminAgents = lazyWithRetry(() => import("./pages/AdminAgents"), "admin-agents");
const AdminHub = lazyWithRetry(() => import("./pages/AdminHub"), "admin-hub");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "not-found");

const queryClient = new QueryClient();
const PROFESSIONAL_PROFILE_VALUES = new Set(PROFESSIONAL_PROFILES.map(({ value }) => value));

const RouteFallback = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white" aria-busy="true" aria-live="polite">
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center"><div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-white/70" aria-hidden="true" /><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl"><img src="/marcenapp-logo.svg" alt="Marcenapp" className="h-full w-full object-contain" /></div></div>
      <div><p className="text-sm font-black tracking-wide">MARCENAPP</p><p className="mt-1 text-xs text-slate-400">Abrindo seu espaço de trabalho…</p></div>
    </div>
  </main>
);

const HomeRoute = () => {
  const { user, loading, profile, profileLoading } = useAuth();

  if (!user && loading) return <Landing />;
  if (loading || (user && profileLoading)) return <RouteFallback />;
  if (!user) return <Landing />;
  if (!profile || !PROFESSIONAL_PROFILE_VALUES.has(profile.profession as (typeof PROFESSIONAL_PROFILES)[number]['value'])) return <ProfessionalProfileSelection />;
  return <Index />;
};

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster /><Sonner />
          <BrowserRouter>
            <SeoRoute />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<Auth />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/signup" element={<Auth />} />
                <Route path="/register" element={<Auth />} />
                <Route path="/forgot-password" element={<Auth />} />
                <Route path="/reset-password" element={<Auth />} />
                <Route path="/perfil-profissional" element={<ProfessionalProfileSelection />} />
                <Route path="/cliente/revisao" element={<ClientReview />} />
                <Route path="/admin" element={<AdminHub />} />
                <Route path="/admin/agentes" element={<AdminAgents />} />
                <Route path="/" element={<HomeRoute />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
