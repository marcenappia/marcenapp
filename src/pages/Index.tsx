import React, { useState, useMemo, useEffect } from 'react';
import { LogOut, User, LogIn, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/marcenapp-logo.jpeg';

import Onboarding from '../components/marcenaria/Onboarding';
import Home from '@/modules/jornada/Home';
import NovoProjeto from '@/modules/jornada/NovoProjeto';
import { StudioHub } from '@/modules/ambientes/StudioHub';
import { Elevator } from '@/modules/ambientes/components/Elevator';
import { StudioWorker } from '@/modules/ambientes/components/StudioWorker';
import OrcamentoModule from '@/modules/orcamentos';
import CorteModule from '@/modules/patio';
import { Contrato } from '@/modules/projetos/components/Contrato';
import ClientesModule from '@/modules/projetos/components/Clientes';
import DiarioModule from '@/modules/projetos/components/Diario';
import { modules, CATEGORY_LABELS, ModuleCategory, MOBILE_NAV_IDS } from '@/modules/config';
import { useProjectPersistence } from '@/modules/projetos/hooks/useProjectPersistence';
import { ProjectData } from '@/modules/projetos/types';

const defaultProject: ProjectData = { width: 2.40, height: 2.60, depth: 0.60, modules: 3, drawers: 4, doors: 6, internalMaterial: 'mdf15_white', externalMaterial: 'mdf18_white', backMaterial: 'mdf6_white', handleType: 'external', profitMargin: 35, laborRate: 100 };

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawModule = searchParams.get('module') || 'dashboard';
  const activeModule = rawModule === 'chat' ? 'studio' : rawModule;
  const projetoParam = searchParams.get('projeto');
  const setActiveModule = (id: string, params: Record<string, string> = {}) => setSearchParams({ module: id, ...params }, { replace: true });
  const [budgetProject, setBudgetProject] = useState(defaultProject);
  const [parts, setParts] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => { const moduleData = modules.find(m => m.id === activeModule); if (moduleData) document.title = `${moduleData.label} | Marcenapp`; }, [activeModule]);
  useProjectPersistence(budgetProject, setBudgetProject);
  const activeModuleData = modules.find(m => m.id === activeModule) ?? modules[0];
  const ActiveIcon = activeModuleData.icon;

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <Home navigateTo={setActiveModule} />;
      case 'novo': return <NovoProjeto key={projetoParam ?? 'novo'} projectId={projetoParam} setBudgetProject={setBudgetProject} navigateTo={setActiveModule} />;
      case 'clientes': return <ClientesModule />;
      case 'diario': return <DiarioModule />;
      case 'studio': return <StudioHub setBudgetProject={setBudgetProject} navigateTo={setActiveModule} gallery={gallery} setGallery={setGallery} budgetProject={budgetProject} />;
      case 'elevator': return <Elevator setBudgetProject={setBudgetProject} navigateTo={setActiveModule} />;
      case 'orcamento': return <OrcamentoModule project={budgetProject} setProject={setBudgetProject} setParts={setParts} />;
      case 'corte': return <CorteModule parts={parts} setParts={setParts} project={budgetProject} />;
      case 'contrato': return <Contrato />;
      default: return null;
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => { const navButtons = Array.from(document.querySelectorAll('[id^="nav-"]')) as HTMLElement[]; const currentIndex = navButtons.findIndex(btn => btn.id === `nav-${id}`); if (currentIndex === -1) return; if (e.key === 'ArrowDown') { e.preventDefault(); navButtons[(currentIndex + 1) % navButtons.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); navButtons[(currentIndex - 1 + navButtons.length) % navButtons.length].focus(); } else if (e.key === 'Home') { e.preventDefault(); navButtons[0].focus(); } else if (e.key === 'End') { e.preventDefault(); navButtons[navButtons.length - 1].focus(); } };
  const handleMobileKeyDown = (e: React.KeyboardEvent, id: string) => { const mobileButtons = Array.from(document.querySelectorAll('[id^="mobile-nav-"]')) as HTMLElement[]; const currentIndex = mobileButtons.findIndex(btn => btn.id === `mobile-nav-${id}`); if (currentIndex === -1) return; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); mobileButtons[(currentIndex + 1) % mobileButtons.length].focus(); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); mobileButtons[(currentIndex - 1 + mobileButtons.length) % mobileButtons.length].focus(); } };
  const groupedModules = useMemo(() => { const categories: Partial<Record<ModuleCategory, typeof modules>> = {}; modules.filter(m => !m.hidden).forEach(m => { if (!categories[m.category]) categories[m.category] = []; categories[m.category]!.push(m); }); return categories; }, []);
  const mobileModules = useMemo(() => MOBILE_NAV_IDS.map(id => modules.find(m => m.id === id)).filter(Boolean) as typeof modules, []);

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      <h1 className="sr-only">Marcenapp OS — Plataforma completa para marcenarias: orçamento, 3D, plano de corte e contratos</h1>
      <StudioWorker />
      <Onboarding onNavigate={setActiveModule} activeModule={activeModule} />
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 z-20 shrink-0 shadow-2xl">
        <div className="p-4 flex items-center gap-3 font-bold text-white border-b border-slate-800 h-16"><img src={logo} alt="M" className="w-9 h-9 rounded-full border-2 border-indigo-500" /><div className="leading-tight"><span className="tracking-tight text-sm">MARCENA<span className="text-indigo-400">PP</span></span><p className="text-[10px] text-slate-400 font-normal tracking-tight">OS — Orquestrador Inteligente</p></div></div>
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto scrollbar-thin">
          {(Object.keys(groupedModules) as ModuleCategory[]).map(cat => <div key={cat} className="space-y-1"><h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">{CATEGORY_LABELS[cat]}<ChevronRight size={10} className="opacity-50" /></h3>{groupedModules[cat]!.map(m => <button key={m.id} id={`nav-${m.id}`} aria-label={m.label} aria-current={activeModule === m.id ? 'page' : undefined} onClick={() => setActiveModule(m.id)} onKeyDown={(e) => handleKeyDown(e, m.id)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeModule === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/5 hover:text-white text-slate-400'}`}><m.icon size={18} aria-hidden="true" /><span className="font-semibold text-sm">{m.label}</span></button>)}</div>)}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto"><div className="max-w-[1400px] mx-auto p-4 md:p-6">{renderModule()}</div></main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"><div className="grid grid-cols-5 gap-1 p-2">{mobileModules.map(m => <button key={m.id} id={`mobile-nav-${m.id}`} onClick={() => setActiveModule(m.id)} onKeyDown={(e) => handleMobileKeyDown(e, m.id)} aria-label={m.label} className={`flex flex-col items-center gap-1 py-1.5 rounded-lg ${activeModule === m.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}><m.icon size={18} /><span className="text-[10px] font-medium">{m.label}</span></button>)}</div></nav>
    </div>
  );
};

export default Index;
