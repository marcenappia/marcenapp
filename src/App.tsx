import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PROFESSIONAL_PROFILES } from "@/modules/admin/ProfessionalProfiles";
import SeoRoute from "@/components/SeoRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Landing = lazy(() => import("./pages/LandingV2"));
const ProfessionalProfileSelection = lazy(() => import("./pages/ProfessionalProfileSelection"));
const ClientReview = lazy(() => import("./pages/ClientReview"));
const AdminAgents = lazy(() => import("./pages/AdminAgents"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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

  // The root route is also the public landing page. It must not be blocked by
  // auth/session restoration: a stalled mobile auth request must never turn
  // the public site into an infinite spinner. Once auth resolves, an existing
  // session naturally transitions to the authenticated workspace.
  if (!user && loading) return <Landing />;
  if (loading || (user && profileLoading)) return <RouteFallback />;
  if (!user) return <Landing />;
  if (!profile || !PROFESSIONAL_PROFILES.some(({ value }) => value === profile.profession)) return <ProfessionalProfileSelection />;
  return <Index />;
};

const App = () => (
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
              <Route path="/admin/agentes" element={<AdminAgents />} />
              <Route path="/" element={<HomeRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
