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

const PublicationTestMarker = () => (
  <div className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 rounded-full border-4 border-black bg-yellow-300 px-6 py-3 text-center text-sm font-black uppercase tracking-wider text-black shadow-[0_8px_0_0_#000]">
    TESTE DE PUBLICAÇÃO — FRONTEND ATUALIZADO
  </div>
);

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-950" aria-label="Carregando Marcenapp" />;
  return user ? <Workspace /> : <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SeoRoute />
          <PublicationTestMarker />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/forgot-password" element={<Auth />} />
            <Route path="/reset-password" element={<Auth />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/app" element={<Index />} />
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
