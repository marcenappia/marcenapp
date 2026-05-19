import React, { useState, useMemo, useEffect } from 'react';
import { LogOut, User, LogIn, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/marcenapp-logo.jpeg';

// Modular components
import Onboarding from '../components/marcenaria/Onboarding';
import IaraModule from '@/modules/iara';
import Dashboard from '@/modules/projetos';
import { Studio } from '@/modules/ambientes';
import { Elevator } from '@/modules/ambientes/components/Elevator';
import { StudioWorker } from '@/modules/ambientes/components/StudioWorker';
import OrcamentoModule from '@/modules/orcamentos';
import CorteModule from '@/modules/patio';
import { Contrato } from '@/modules/projetos/components/Contrato';
import ClientesModule from '@/modules/projetos/components/Clientes';
import DiarioModule from '@/modules/projetos/components/Diario';

// Hooks & Config
import { modules, CATEGORY_LABELS, ModuleCategory } from '@/modules/config';
import { useProjectPersistence } from '@/modules/projetos/hooks/useProjectPersistence';
import { ProjectData } from '@/modules/projetos/types';

const defaultProject: ProjectData = {
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get('module') || 'chat';
  
  const setActiveModule = (id: string) => {
    setSearchParams({ module: id }, { replace: true });
  };

  const [budgetProject, setBudgetProject] = useState(defaultProject);
  const [parts, setParts] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const moduleData = modules.find(m => m.id === activeModule);
    if (moduleData) {
      document.title = `${moduleData.label} | Marcenapp`;
    }
  }, [activeModule]);


  // Persistence logic moved to hook
  useProjectPersistence(budgetProject, setBudgetProject);

  const activeModuleData = modules.find(m => m.id === activeModule)!;
  const ActiveIcon = activeModuleData.icon;

  const renderModule = () => {
    switch (activeModule) {
      case 'chat': return <IaraModule />;
      case 'dashboard': return <Dashboard projectData={budgetProject} partsData={parts} navigateTo={setActiveModule} />;
      case 'clientes': return <ClientesModule />;
      case 'diario': return <DiarioModule />;
      case 'studio': return <Studio setBudgetProject={setBudgetProject} navigateTo={setActiveModule} gallery={gallery} setGallery={setGallery} />;
      case 'elevator': return <Elevator setBudgetProject={setBudgetProject} navigateTo={setActiveModule} />;
      case 'orcamento': return <OrcamentoModule project={budgetProject} setProject={(p: any) => setBudgetProject(p)} />;
      case 'corte': return <CorteModule parts={parts} setParts={setParts} project={budgetProject} />;
      case 'contrato': return <Contrato />;
      default: return null;
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    const navButtons = Array.from(document.querySelectorAll('[id^="nav-"]')) as HTMLElement[];
    const currentIndex = navButtons.findIndex(btn => btn.id === `nav-${id}`);
    
    if (currentIndex === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % navButtons.length;
      navButtons[nextIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + navButtons.length) % navButtons.length;
      navButtons[prevIndex].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      navButtons[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      navButtons[navButtons.length - 1].focus();
    }
  };

  const handleMobileKeyDown = (e: React.KeyboardEvent, id: string) => {
    const mobileButtons = Array.from(document.querySelectorAll('[id^="mobile-nav-"]')) as HTMLElement[];
    const currentIndex = mobileButtons.findIndex(btn => btn.id === `mobile-nav-${id}`);
    
    if (currentIndex === -1) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % mobileButtons.length;
      mobileButtons[nextIndex].focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + mobileButtons.length) % mobileButtons.length;
      mobileButtons[prevIndex].focus();
    }
  };

  // Agrupar módulos por categoria para a sidebar
  const groupedModules = useMemo(() => {
    const categories: Partial<Record<ModuleCategory, typeof modules>> = {};
    modules.forEach(m => {
      if (!categories[m.category]) categories[m.category] = [];
      categories[m.category]!.push(m);
    });
    return categories;
  }, []);

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      <StudioWorker />
      <Onboarding onNavigate={setActiveModule} activeModule={activeModule} />
      
      {/* Desktop Sidebar - Refatorada para Camadas */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 z-20 shrink-0 shadow-2xl">
        <div className="p-4 flex items-center gap-3 font-bold text-white border-b border-slate-800 h-16">
          <img src={logo} alt="M" className="w-9 h-9 rounded-full border-2 border-indigo-500" />
          <div className="leading-tight">
            <span className="tracking-tight text-sm">MARCENA<span className="text-indigo-400">PP</span></span>
            <p className="text-[10px] text-slate-400 font-normal tracking-tight">OS — Orquestrador Inteligente</p>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto scrollbar-thin">
          {(Object.keys(groupedModules) as ModuleCategory[]).map(cat => (
            <div key={cat} className="space-y-1">
              <h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                {CATEGORY_LABELS[cat]}
                <ChevronRight size={10} className="opacity-50" />
              </h3>
              {groupedModules[cat]!.map(m => (
                <button
                  key={m.id}
                  id={`nav-${m.id}`}
                  aria-label={m.label}
                  aria-current={activeModule === m.id ? 'page' : undefined}
                  onClick={() => setActiveModule(m.id)}
                  onKeyDown={(e) => handleKeyDown(e, m.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeModule === m.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'hover:bg-white/5 hover:text-white text-slate-400'
                  }`}
                >
                  <m.icon size={18} aria-hidden="true" />
                  <span className="font-semibold text-sm">{m.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          {user ? (
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-left"
            >
              <LogOut size={18} />
              <span className="font-medium text-sm">Sair</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-left"
            >
              <LogIn size={18} />
              <span className="font-medium text-sm">Entrar / Cadastrar</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 h-16 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 truncate">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <ActiveIcon size={20} className="shrink-0" />
            </div>
            <div className="flex flex-col">
              <span className="truncate leading-none">{activeModuleData.label}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{CATEGORY_LABELS[activeModuleData.category].split(' — ')[0]}</span>
            </div>
          </h2>
          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {profile?.name?.charAt(0)?.toUpperCase() || <User size={16} />}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[10px] font-bold text-slate-700 leading-none">{profile?.name || 'Usuário'}</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Conta Pro</p>
                  </div>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-12 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-56 animate-in zoom-in-95 duration-200">
                      <div className="px-3 py-2 border-b border-slate-100 mb-2">
                        <p className="font-bold text-slate-800 text-sm truncate">{profile?.name || 'Usuário'}</p>
                        <p className="text-xs text-slate-500 truncate">{profile?.company || ''}</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (window.confirm('Deseja reiniciar o tutorial completo?')) {
                            localStorage.removeItem('marcenapp_onboarding_seen');
                            localStorage.removeItem('marcenapp_onboarding_step');
                            localStorage.removeItem('marcenapp_onboarding_completed');
                            if (user) {
                              supabase.from('profiles').update({ 
                                onboarding_step: 0, 
                                onboarding_completed: [] 
                              }).eq('user_id', user.id).then(() => window.location.reload());
                            } else {
                              window.location.reload();
                            }
                          }
                        }} 
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <Sparkles size={16} className="text-amber-500" /> Reiniciar Tutorial
                      </button>
                      <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <LogOut size={16} /> Sair
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2 p-2 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
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

        {/* Mobile Bottom Nav - Refatorado */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-1 py-1 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          {modules.filter(m => ['intelligence', 'portal', 'studio', 'finance'].includes(m.category)).slice(0, 5).map(m => (
            <button
              key={m.id}
              id={`mobile-nav-${m.id}`}
              aria-label={m.label}
              aria-current={activeModule === m.id ? 'page' : undefined}
              onClick={() => setActiveModule(m.id)}
              onKeyDown={(e) => handleMobileKeyDown(e, m.id)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all flex-1 focus-visible:outline-none ${
                activeModule === m.id ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${activeModule === m.id ? 'bg-indigo-50' : 'bg-transparent'}`}>
                <m.icon size={20} strokeWidth={activeModule === m.id ? 2.5 : 2} aria-hidden="true" />
              </div>
              <span className="text-[9px] font-bold tracking-tight uppercase">{m.mobileLabel}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default Index;
