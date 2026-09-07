import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MarceneiroPublico from "./pages/MarceneiroPublico";
import PerfilMarcenaria from "./modules/perfil/PerfilMarcenaria";
import Planos from "./pages/Planos";
import AIProviderAdmin from "./modules/admin/AIProviderAdmin";
import AdminDashboard from "./modules/admin/AdminDashboard";
import AdminAIUsage from "./modules/admin/AdminAIUsage";
import AdminUsers from "./modules/admin/AdminUsers";
import AdminProjects from "./modules/admin/AdminProjects";
import AdminGuard from "./modules/admin/AdminGuard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/marceneiro/:slug" element={<MarceneiroPublico />} />
            <Route path="/perfil" element={<PerfilMarcenaria />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/ia" element={<AdminGuard><AIProviderAdmin /></AdminGuard>} />
            <Route path="/admin/ia/uso" element={<AdminGuard><AdminAIUsage /></AdminGuard>} />
            <Route path="/admin/usuarios" element={<AdminGuard><AdminUsers /></AdminGuard>} />
            <Route path="/admin/obras" element={<AdminGuard><AdminProjects /></AdminGuard>} />
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
