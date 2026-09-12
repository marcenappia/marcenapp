import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, LogIn, Sparkles, ChevronRight, MessageCircle, EllipsisVertical, Building2, Settings2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/marcenapp-logo.svg';
import CreditRules from '@/modules/admin/CreditRules';
import BillingPortal from '@/modules/billing/BillingPortal';
import OperationalIntelligence from '@/modules/inteligencia/OperationalIntelligence';
import Onboarding from '../components/marcenaria/Onboarding';
import ProfessionalProfileGate from '@/components/marcenaria/ProfessionalProfileGate';
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
import ConfiguracoesModule from '@/modules/configuracoes';
import { modules, CATEGORY_LABELS, ModuleCategory, MOBILE_NAV_IDS } from '@/modules/config';
import { useProjectPersistence } from '@/modules/projetos/hooks/useProjectPersistence';
import { ProjectData } from '@/modules/projetos/types';

const emptyProject: ProjectData = { width: 0, height: 0, depth: 0, modules: 0, drawers: 0, doors: 0, internalMaterial: '', externalMaterial: '', backMaterial: '', handleType: '', profitMargin: 0, laborRate: 0 };

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawModule = searchParams.get('module') || 'dashboard';
  const activeModule = rawModule === 'chat' ? 'studio' : rawModule;
  const projetoParam = searchParams.get('projeto');
  const setActiveModule = (id: string, params: Record<string, string> = {}) => setSearchParams({ module: id, ...params });
  const [budgetProject, setBudgetProject] = useState<ProjectData>(emptyProject);
  const [parts, setParts] = useState<React.ComponentProps<typeof CorteModule>['parts']>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMakerData, setShowMakerData] = useState(false);
  const [makerName, setMakerName] = useState(profile?.name ?? '');
  const [makerCompany, setMakerCompany] = useState(profile?.company ?? '');
  const [savingMakerData, setSavingMakerData] = useState(false);

  useEffect(() => { const moduleData = modules.find(m => m.id === activeModule); if (moduleData) document.title = `${moduleData.label} | Marcenapp`; else if (activeModule === 'configuracoes') document.title = 'Configurações | Marcenapp'; }, [activeModule]);
  useEffect(() => { setMakerName(profile?.name ?? ''); setMakerCompany(profile?.company ?? ''); }, [profile?.name, profile?.company]);
  useProjectPersistence(budgetProject, setBudgetProject);
  const activeModuleData = modules.find(m => m.id === activeModule) ?? modules[0];
  const ActiveIcon = activeModule === 'studio' ? MessageCircle : activeModule === 'configuracoes' ? Settings2 : activeModuleData.icon;
  const activeTitle = activeModule === 'studio' ? 'IARA' : activeModule === 'configuracoes' ? 'Configurações' : activeModuleData.label;
  const activeSubtitle = activeModule === 'studio' ? 'Inteligência do seu projeto' : activeModule === 'configuracoes' ? 'Central da marcenaria' : CATEGORY_LABELS[activeModuleData.category];

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <Home navigateTo={setActiveModule} />;
      case 'inteligencia': return <OperationalIntelligence />;
      case 'novo': return <NovoProjeto key={projetoParam ?? 'novo'} projectId={projetoParam} setBudgetProject={setBudgetProject} navigateTo={setActiveModule} />;
      case 'clientes': return <ClientesModule />;
      case 'diario': return <DiarioModule navigateTo={setActiveModule} />;
      case 'billing': return <BillingPortal />;
      case 'studio': return <StudioHub setBudgetProject={setBudgetProject} navigateTo={setActiveModule} gallery={gallery} setGallery={setGallery} budgetProject={budgetProject} />;
      case 'elevator': return <Elevator setBudgetProject={setBudgetProject} navigateTo={setActiveModule} />;
      case 'orcamento': return <OrcamentoModule project={budgetProject} setProject={setBudgetProject} />;
      case 'corte': return <CorteModule parts={parts} setParts={setParts} project={budgetProject} />;
      case 'contrato': return <Contrato />;
      case 'admin-billing': return <CreditRules />;
      case 'configuracoes': return <ConfiguracoesModule userId={user?.id} profile={profile} onNavigate={setActiveModule} onSaved={() => window.location.reload()} />;
      default: return null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => { const navButtons = Array.from(document.querySelectorAll('[id^="nav-"]')) as HTMLElement[]; const currentIndex = navButtons.findIndex(btn => btn.id === `nav-${id}`); if (currentIndex === -1) return; if (e.key === 'ArrowDown') { e.preventDefault(); navButtons[(currentIndex + 1) % navButtons.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); navButtons[(currentIndex - 1 + navButtons.length) % navButtons.length].focus(); } else if (e.key === 'Home') { e.preventDefault(); navButtons[0].focus(); } else if (e.key === 'End') { e.preventDefault(); navButtons[navButtons.length - 1].focus(); } };
  const handleMobileKeyDown = (e: React.KeyboardEvent, id: string) => { const mobileButtons = Array.from(document.querySelectorAll('[id^="mobile-nav-"]')) as HTMLElement[]; const currentIndex = mobileButtons.findIndex(btn => btn.id === `mobile-nav-${id}`); if (currentIndex === -1) return; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); mobileButtons[(currentIndex + 1) % mobileButtons.length].focus(); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); mobileButtons[(currentIndex - 1 + mobileButtons.length) % mobileButtons.length].focus(); } };
  const groupedModules = useMemo(() => { const categories: Partial<Record<ModuleCategory, typeof modules>> = {}; modules.filter(m => !m.hidden).forEach(m => { if (!categories[m.category]) categories[m.category] = []; categories[m.category]!.push(m); }); return categories; }, []);
  const mobileModules = useMemo(() => MOBILE_NAV_IDS.map(id => modules.find(m => m.id === id)).filter(Boolean) as typeof modules, []);

  const openMakerData = () => { setMakerName(profile?.name ?? ''); setMakerCompany(profile?.company ?? ''); setShowUserMenu(false); setShowMakerData(true); };
  const openSettings = () => { setShowUserMenu(false); setActiveModule('configuracoes'); };
  const saveMakerData = async () => {
    if (!user) return;
    setSavingMakerData(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: makerName.trim(), company: makerCompany.trim() }).eq('user_id', user.id);
      if (error) throw error;
      setShowMakerData(false);
      window.location.reload();
    } catch (error) {
      console.error('Falha ao salvar dados da marcenaria', error);
    } finally {
      setSavingMakerData(false);
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      <h1 className="sr-only">Marcenapp — do projeto à produção, tudo no lugar.</h1>
      <StudioWorker /><ProfessionalProfileGate /><Onboarding onNavigate={setActiveModule} activeModule={activeModule} />
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 z-20 shrink-0 shadow-2xl">
        <div className="p-4 flex items-center gap-3 font-bold text-white border-b border-slate-800 h-16"><img src={logo} alt="Marcenapp" className="w-9 h-9 rounded-xl" /><div className="leading-tight"><span className="tracking-tight text-sm">MARCENAPP</span><p className="text-[10px] text-slate-400 font-normal tracking-tight">Do projeto à produção</p></div></div>
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto scrollbar-thin">{(Object.keys(groupedModules) as ModuleCategory[]).map(cat => <div key={cat} className="space-y-1"><h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">{CATEGORY_LABELS[cat]}<ChevronRight size={10} className="opacity-50" /></h3>{groupedModules[cat]!.map(m => <button key={m.id} id={`nav-${m.id}`} aria-label={m.label} aria-current={activeModule === m.id ? 'page' : undefined} onClick={() => setActiveModule(m.id)} onKeyDown={e => handleKeyDown(e, m.id)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeModule === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/5 hover:text-white text-slate-400'}`}><m.icon size={18} aria-hidden="true" /><span className="font-semibold text-sm">{m.label}</span></button>)}</div>)}</nav>
        <div className="p-3 border-t border-slate-800">{user ? <button onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-left"><LogOut size={18} /><span className="font-medium text-sm">Sair</span></button> : <button onClick={() => navigate('/auth')} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-left"><LogIn size={18} /><span className="font-medium text-sm">Entrar / Cadastrar</span></button>}</div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-full overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-3 sm:px-4 md:px-8 h-16 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 truncate min-w-0"><div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">{activeModule === 'studio' ? <img src={logo} alt="M" className="w-5 h-5 object-contain" /> : <ActiveIcon size={20} className="shrink-0" />}</div><div className="flex flex-col min-w-0"><span className="truncate leading-none">{activeTitle}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate">{activeSubtitle}</span></div></h2>
          <div className="relative shrink-0">
            {user ? <>
              <button onClick={() => setShowUserMenu(!showUserMenu)} aria-label="Abrir menu da marcenaria" aria-expanded={showUserMenu} className="flex items-center gap-2 p-2 md:p-1.5 md:pr-3 rounded-xl md:rounded-full bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200">
                <EllipsisVertical className="md:hidden" size={20} />
                <div className="hidden md:flex w-8 h-8 rounded-full bg-indigo-600 items-center justify-center text-white text-sm font-bold shadow-md">{profile?.name?.charAt(0)?.toUpperCase() || <User size={16} />}</div>
                <div className="hidden sm:block text-left"><p className="text-[10px] font-bold text-slate-700 leading-none">{profile?.name || 'Usuário'}</p><p className="text-[8px] text-slate-500 uppercase tracking-tighter">{profile?.company || 'Marcenaria'}</p></div>
              </button>
              {showUserMenu && <><div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} /><div className="absolute right-0 top-12 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-64 animate-in zoom-in-95 duration-200"><div className="px-3 py-2 border-b border-slate-100 mb-2"><p className="font-bold text-slate-800 text-sm truncate">{profile?.company || 'Sua marcenaria'}</p><p className="text-xs text-slate-500 truncate">{profile?.name || 'Responsável'}</p></div><button onClick={openSettings} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><Settings2 size={17} className="text-indigo-600" /> Central da marcenaria</button><button onClick={openMakerData} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><Building2 size={17} className="text-indigo-600" /> Dados rápidos</button><button onClick={() => { if (window.confirm('Deseja reiniciar o tutorial completo?')) { localStorage.removeItem('marcenapp_onboarding_seen'); localStorage.removeItem('marcenapp_onboarding_step'); localStorage.removeItem('marcenapp_onboarding_completed'); if (user) { supabase.from('profiles').update({ onboarding_step: 0, onboarding_completed: [] }).eq('user_id', user.id).then(() => window.location.reload()); } else { window.location.reload(); } } }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><Sparkles size={16} className="text-amber-500" /> Reiniciar Tutorial</button><button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={16} /> Sair</button></div></>}
            </> : <button onClick={() => navigate('/auth')} className="flex items-center gap-2 p-2 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"><LogIn size={16} /> Entrar</button>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 scroll-smooth"><div className="max-w-7xl mx-auto"><AnimatePresence mode="wait"><motion.div key={activeModule} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>{renderModule()}</motion.div></AnimatePresence></div></div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">{mobileModules.map(m => <button key={m.id} id={`mobile-nav-${m.id}`} aria-label={m.mobileLabel} aria-current={activeModule === m.id ? 'page' : undefined} onClick={() => setActiveModule(m.id)} onKeyDown={e => handleMobileKeyDown(e, m.id)} className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all flex-1 max-w-[120px] focus-visible:outline-none ${activeModule === m.id ? 'text-indigo-600' : 'text-slate-400'}`}><div className={`p-1.5 rounded-xl transition-colors ${activeModule === m.id ? 'bg-indigo-50' : 'bg-transparent'}`}>{m.id === 'studio' ? <img src={logo} alt="M" className="w-5 h-5 object-contain" /> : <m.icon size={20} strokeWidth={activeModule === m.id ? 2.5 : 2} aria-hidden="true" />}</div><span className="text-[9px] font-bold tracking-tight uppercase">{m.mobileLabel}</span></button>)}</nav>
      </main>

      {showMakerData && <div className="fixed inset-0 z-[200] bg-slate-950/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" role="dialog" aria-modal="true" aria-labelledby="maker-data-title">
        <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between"><div><h3 id="maker-data-title" className="text-base font-black text-slate-800">Dados rápidos da marcenaria</h3><p className="text-xs text-slate-500 mt-1">Edite os dados básicos sem sair da tela.</p></div><button type="button" onClick={() => setShowMakerData(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label="Fechar">×</button></div>
          <div className="p-5 space-y-4"><label className="block"><span className="text-xs font-bold text-slate-600">Responsável</span><input value={makerName} onChange={e => setMakerName(e.target.value)} placeholder="Seu nome" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><label className="block"><span className="text-xs font-bold text-slate-600">Nome da marcenaria</span><input value={makerCompany} onChange={e => setMakerCompany(e.target.value)} placeholder="Nome comercial" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label></div>
          <div className="p-5 pt-0 flex gap-2"><button type="button" onClick={() => setShowMakerData(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancelar</button><button type="button" onClick={saveMakerData} disabled={savingMakerData} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{savingMakerData ? 'Salvando...' : 'Salvar dados'}</button></div>
        </div>
      </div>}
    </div>
  );
};
export default Index;
