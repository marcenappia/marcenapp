import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import AppShell from "./pages/AppShell";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import MarceneiroPublico from "./pages/MarceneiroPublico";
import PerfilMarcenaria from "./modules/perfil/PerfilMarcenaria";
import Planos from "./pages/Planos";
import Conexoes from "./pages/Conexoes";
import SeoPage from "./pages/SeoPage";
import AIProviderAdmin from "./modules/admin/AIProviderAdmin";
import AdminDashboard from "./modules/admin/AdminDashboard";
import AdminAIUsage from "./modules/admin/AdminAIUsage";
import AdminUsers from "./modules/admin/AdminUsers";
import AdminProjects from "./modules/admin/AdminProjects";
import AdminGuard from "./modules/admin/AdminGuard";
import NotFound from "./pages/NotFound";
import { supabaseConfigured } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const SEO_SLUGS = [
  "marcena",
  "marcenaria",
  "moveis-planejados",
  "projeto-3d-marcenaria",
  "projeto-2d-marcenaria",
  "orcamento-marcenaria",
  "plano-de-corte",
  "software-para-marceneiro",
] as const;

const ConfigurationNotice = () => (
  <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-400/30 bg-white/5 p-8 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">MARCENAPP</p>
      <h1 className="mt-3 text-2xl font-black">Configuração do ambiente pendente</h1>
      <p className="mt-3 leading-relaxed text-slate-300">O ambiente do aplicativo ainda não recebeu as variáveis públicas do Supabase. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na hospedagem para habilitar login, dados e recursos que dependem do banco.</p>
    </div>
  </main>
);

const PublicRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/marceneiro/:slug" element={<MarceneiroPublico />} />
    {SEO_SLUGS.map((slug) => <Route key={slug} path={`/${slug}`} element={<SeoPage />} />)}
    <Route path="*" element={<ProtectedApp />} />
  </Routes>
);

const ProtectedApp = () => {
  const location = useLocation();

  if (!supabaseConfigured) return <ConfigurationNotice />;

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/perfil" element={<PerfilMarcenaria />} />
      <Route path="/planos" element={<Planos />} />
      <Route path="/conexoes" element={<Conexoes />} />
      <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="/admin/ia" element={<AdminGuard><AIProviderAdmin /></AdminGuard>} />
      <Route path="/admin/ia/uso" element={<AdminGuard><AdminAIUsage /></AdminGuard>} />
      <Route path="/admin/usuarios" element={<AdminGuard><AdminUsers /></AdminGuard>} />
      <Route path="/admin/obras" element={<AdminGuard><AdminProjects /></AdminGuard>} />
      <Route path="/app" element={<AppShell />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PublicRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
