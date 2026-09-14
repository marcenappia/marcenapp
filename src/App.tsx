import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import SeoRoute from "@/components/SeoRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Workspace from "./pages/Workspace";
import ClientReview from "./pages/ClientReview";
import AdminAgents from "./pages/AdminAgents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-950" aria-label="Carregando Marcenapp" />;
  return user ? <Workspace /> : <Landing />;
};

const isFirebasePreview =
  typeof window !== "undefined" && window.location.hostname.endsWith(".web.app");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SeoRoute />
          {isFirebasePreview && (
            <div
              className="fixed right-4 top-4 z-[9999] rounded-full border border-white/15 bg-slate-950/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur"
              role="status"
              aria-label="Firebase Preview ativo"
            >
              Firebase Preview • código atualizado
            </div>
          )}
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/forgot-password" element={<Auth />} />
            <Route path="/reset-password" element={<Auth />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/reset-password" element={<Auth />} />
            <Route path="/cliente/revisao" element={<ClientReview />} />
            <Route path="/admin/agentes" element={<AdminAgents />} />
            <Route path="/" element={<HomeRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
