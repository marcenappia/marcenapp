import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import AppShell from "./pages/AppShell";
import Auth from "./pages/Auth";
import PasswordRecovery from "./pages/PasswordRecovery";
import Checkout from "./pages/Checkout";
import Loja from "./pages/Loja";
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
import AdminSkills from "./modules/admin/AdminSkills";
import AdminGuard from "./modules/admin/AdminGuard";
import NotFound from "./pages/NotFound";
import AppSplash from "./components/AppSplash";
import { supabaseConfigured } from "@/integrations/supabase/client";

const queryClient = new QueryClient();
const SEO_SLUGS = ["marcena", "marcenaria", "moveis-planejados", "projeto-3d-marcenaria", "projeto-2d-marcenaria", "orcamento-marcenaria", "plano-de-corte", "software-para-marceneiro"] as const;

const ConfigurationNotice = () => <main className="min-h-screen bg-slate-950 px-6 py-16 text-white"><div className="mx-auto max-w-xl rounded-2xl border border-amber-400/30 bg-white/5 p-8 shadow-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">MARCENAPP</p><h1 className="mt-3 text-2xl font-black">Configuração do ambiente pendente</h1><p className="mt-3 leading-relaxed text-slate-300">O ambiente do aplicativo ainda não recebeu as variáveis públicas do Supabase. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na hospedagem para habilitar login, dados e recursos que dependem do banco.</p></div></main>;

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const e2eBypassAuth = import.meta.env.DEV && import.meta.env.VITE_E2E_BYPASS_AUTH === 'true';
  if (loading && !e2eBypassAuth) return <AppSplash message="Verificando sua sessão…" />;
  if (!user && !e2eBypassAuth) return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
};

const PublicRoutes = () => <Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/loja" element={<Loja />} />
  <Route path="/marceneiro/:slug" element={<MarceneiroPublico />} />
  {SEO_SLUGS.map((slug) => <Route key={slug} path={`/${slug}`} element={<SeoPage />} />)}
  <Route path="*" element={<ProtectedApp />} />
</Routes>;

const ProtectedApp = () => {
  if (!supabaseConfigured) return <ConfigurationNotice />;
  return <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/password-recovery" element={<PasswordRecovery />} />
    <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
    <Route path="/perfil" element={<RequireAuth><PerfilMarcenaria /></RequireAuth>} />
    <Route path="/planos" element={<RequireAuth><Planos /></RequireAuth>} />
    <Route path="/conexoes" element={<RequireAuth><Conexoes /></RequireAuth>} />
    <Route path="/admin" element={<RequireAuth><AdminGuard><AdminDashboard /></AdminGuard></RequireAuth>} />
    <Route path="/admin/ia" element={<RequireAuth><AIProviderAdmin /></AdminGuard></RequireAuth>} />
    <Route path="/admin/ia/uso" element={<RequireAuth><AdminGuard><AdminAIUsage /></AdminGuard></RequireAuth>} />
    <Route path="/admin/usuarios" element={<RequireAuth><AdminGuard><AdminUsers /></AdminGuard></RequireAuth>} />
    <Route path="/admin/obras" element={<RequireAuth><AdminGuard><AdminProjects /></AdminGuard></RequireAuth>} />
    <Route path="/admin/skills" element={<RequireAuth><AdminGuard><AdminSkills /></AdminGuard></RequireAuth>} />
    <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>} />
    <Route path="*" element={<NotFound />} />
  </Routes>;
};

const App = () => <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><Toaster /><Sonner /><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PublicRoutes /></BrowserRouter></TooltipProvider></AuthProvider></QueryClientProvider>;
export default App;
