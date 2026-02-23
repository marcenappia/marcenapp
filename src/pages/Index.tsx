import React, { useState, useEffect } from 'react';
import { 
  Home, Wand2, ArrowUpFromLine, Calculator, Scissors, Scale, LogOut, User, LogIn
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ModuleDashboard from '../components/marcenaria/ModuleDashboard';
import ModuleStudio from '../components/marcenaria/ModuleStudio';
import ModuleElevator from '../components/marcenaria/ModuleElevator';
import ModuleOrcamento from '../components/marcenaria/ModuleOrcamento';
import ModuleCorte from '../components/marcenaria/ModuleCorte';
import ModuleContrato from '../components/marcenaria/ModuleContrato';
import logo from '@/assets/marcenapp-logo.jpeg';

const modules = [
  { id: 'dashboard', label: 'Visão Geral', mobileLabel: 'Início', icon: Home },
  { id: 'studio', label: 'Studio 3D', mobileLabel: 'Studio', icon: Wand2 },
  { id: 'elevator', label: 'Elevador Planta', mobileLabel: 'Planta', icon: ArrowUpFromLine },
  { id: 'orcamento', label: 'Orçamento', mobileLabel: 'Custo', icon: Calculator },
  { id: 'corte', label: 'Plano de Corte', mobileLabel: 'Corte', icon: Scissors },
  { id: 'contrato', label: 'Contrato', mobileLabel: 'Legal', icon: Scale },
];

const defaultProject = {
  width: 2.40,
  height: 2.60,
  depth: 0.60,
  modules: 3,
  drawers: 4,
  doors: 6,
  internalMaterial: 'mdf15_white',
  externalMaterial: 'mdf18_white',
  backMaterial: 'mdf6_white',
  handleType: 'external',
  profitMargin: 35,
  laborRate: 100,
};

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('studio');
  const [budgetProject, setBudgetProject] = useState(defaultProject);
  const [parts, setParts] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeModuleData = modules.find(m => m.id === activeModule)!;
  const ActiveIcon = activeModuleData.icon;

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <ModuleDashboard projectData={budgetProject} partsData={parts} navigateTo={setActiveModule} />;
      case 'studio': return <ModuleStudio setBudgetProject={setBudgetProject} navigateTo={setActiveModule} gallery={gallery} setGallery={setGallery} />;
      case 'elevator': return <ModuleElevator setBudgetProject={setBudgetProject} navigateTo={setActiveModule} />;
      case 'orcamento': return <ModuleOrcamento project={budgetProject} setProject={(p: any) => setBudgetProject(p)} />;
      case 'corte': return <ModuleCorte parts={parts} setParts={setParts} project={budgetProject} />;
      case 'contrato': return <ModuleContrato />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-text))] flex-col border-r border-[hsl(var(--sidebar-border))] z-20 shrink-0">
        <div className="p-4 flex items-center gap-3 font-bold text-white border-b border-[hsl(var(--sidebar-border))] h-16">
          <img src={logo} alt="M" className="w-9 h-9 rounded-full border-2 border-[hsl(var(--sidebar-active))]" />
          <div className="leading-tight">
            <span className="tracking-tight text-sm">MARCENA<span className="text-[hsl(var(--sidebar-active))]">PP</span></span>
            <p className="text-[10px] text-[hsl(var(--sidebar-text))] font-normal">Marcenaria 4.0</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                activeModule === m.id
                  ? 'bg-[hsl(var(--sidebar-active))] text-white shadow-lg shadow-[hsl(var(--sidebar-active)/0.4)]'
                  : 'hover:bg-white/5 hover:text-white text-[hsl(var(--sidebar-text))]'
              }`}
            >
              <m.icon size={18} />
              <span className="font-medium text-sm">{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
          {user ? (
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-[hsl(var(--sidebar-text))] hover:bg-white/5 hover:text-red-400 transition-all text-left"
            >
              <LogOut size={18} />
              <span className="font-medium text-sm">Sair</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-[hsl(var(--sidebar-text))] hover:bg-white/5 hover:text-green-400 transition-all text-left"
            >
              <LogIn size={18} />
              <span className="font-medium text-sm">Entrar / Cadastrar</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
            <ActiveIcon size={20} className="text-[hsl(var(--sidebar-active))] shrink-0" />
            <span className="truncate">{activeModuleData.label}</span>
          </h2>
          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--sidebar-active))] flex items-center justify-center text-white text-sm font-bold">
                    {profile?.name?.charAt(0)?.toUpperCase() || <User size={16} />}
                  </div>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-12 z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-56">
                      <div className="px-3 py-2 border-b border-border mb-2">
                        <p className="font-semibold text-foreground text-sm truncate">{profile?.name || 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.company || ''}</p>
                      </div>
                      <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <LogOut size={16} /> Sair
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2 p-2 px-4 rounded-xl bg-[hsl(var(--sidebar-active))] text-white text-sm font-medium hover:opacity-90 transition-colors"
              >
                <LogIn size={16} /> Entrar
              </button>
            )}
          </div>
        </header>

        {/* Module Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {renderModule()}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-1 py-1 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all flex-1 ${
                activeModule === m.id ? 'text-[hsl(var(--sidebar-active))]' : 'text-muted-foreground'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${activeModule === m.id ? 'bg-[hsl(var(--sidebar-active)/0.1)]' : 'bg-transparent'}`}>
                <m.icon size={20} strokeWidth={activeModule === m.id ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-semibold tracking-tight">{m.mobileLabel}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default Index;
