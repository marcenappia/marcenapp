import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, LogIn, Sparkles, ChevronRight, MessageCircle, EllipsisVertical, Building2, Settings2, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/marcenapp-logo.svg';
const Onboarding = lazy(() => import('../components/marcenaria/Onboarding'));
import { modules, CATEGORY_LABELS, ModuleCategory, MOBILE_NAV_IDS } from '@/modules/config';
import { useProjectPersistence } from '@/modules/projetos/hooks/useProjectPersistence';
import { ProjectData } from '@/modules/projetos/types';
import type { Part } from '@/modules/patio';
import { BuildVersion } from '@/components/BuildVersion';

const StudioWorker = lazy(() => import('@/modules/ambientes/components/StudioWorker').then(m => ({ default: m.StudioWorker })));
const CreditRules = lazy(() => import('@/modules/admin/CreditRules'));
const BillingPortal = lazy(() => import('@/modules/billing/BillingPortal'));
const OperationalIntelligence = lazy(() => import('@/modules/inteligencia/OperationalIntelligence'));
const Home = lazy(() => import('@/modules/jornada/Home'));
const NovoProjeto = lazy(() => import('@/modules/jornada/NovoProjeto'));
const StudioHub = lazy(() => import('@/modules/ambientes/StudioHub').then(m => ({ default: m.StudioHub })));
const Elevator = lazy(() => import('@/modules/ambientes/components/Elevator').then(m => ({ default: m.Elevator })));
const OrcamentoModule = lazy(() => import('@/modules/orcamentos'));
const CorteModule = lazy(() => import('@/modules/patio'));
const Contrato = lazy(() => import('@/modules/projetos/components/Contrato').then(m => ({ default: m.Contrato })));
const ClientesModule = lazy(() => import('@/modules/projetos/components/Clientes'));
const DiarioModule = lazy(() => import('@/modules/projetos/components/Diario'));
const ConfiguracoesModule = lazy(() => import('@/modules/configuracoes'));

const emptyProject: ProjectData = { width: 0, height: 0, depth: 0, modules: 0, drawers: 0, doors: 0, internalMaterial: '', externalMaterial: '', backMaterial: '', handleType: '', profitMargin: 0, laborRate: 0 };

class ModuleErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[workspace-module] crashed', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="min-h-[320px] flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-8 text-center"><p className="text-sm font-black text-slate-900">Este módulo encontrou um erro.</p><p className="mt-1 text-xs text-slate-500">O restante do espaço de trabalho continua disponível.</p><button type="button" onClick={() => this.setState({ error: null })} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Tentar novamente</button></div>;
  }
}

const ModuleFallback = () => (
  <div className="min-h-[320px] flex items-center justify-center rounded-2xl border border-slate-200 bg-white" aria-busy="true" aria-live="polite">
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-500"><div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" aria-hidden="true" />Abrindo módulo…</div>
  </div>
);

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawModule = searchParams.get('module') || 'dashboard';
  const activeModule = rawModule === 'chat' ? 'studio' : rawModule;
  const projetoParam = searchParams.get('projeto');
  const setActiveModule = (id: string, params: Record<string, string> = {}) => setSearchParams({ module: id, ...params });
  const [budgetProject, setBudgetProject] = useState<ProjectData>(emptyProject);
  const [parts, setParts] = useState<Part[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
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
  useEffect(() => { if (!showMobileSidebar) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowMobileSidebar(false); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [showMobileSidebar]);

  const groupedModules = useMemo(() => { const categories: Partial<Record<ModuleCategory, typeof modules>> = {}; modules.filter(m => !m.hidden).forEach(m => { if (!categories[m.category]) categories[m.category] = []; categories[m.category]!.push(m); }); return categories; }, []);
  const mobileModules = useMemo(() => MOBILE_NAV_IDS.map(id => modules.find(m => m.id === id)).filter(Boolean) as typeof modules, []);

  const openMakerData = () => { setMakerName(profile?.name ?? ''); setMakerCompany(profile?.company ?? ''); setShowUserMenu(false); setShowMakerData(true); };
  const openSettings = () => { setShowUserMenu(false); setActiveModule('configuracoes'); };
  const saveMakerData = async () => { if (!user) return; setSavingMakerData(true); try { const { error } = await supabase.from('profiles').update({ name: makerName.trim(), company: makerCompany.trim() }).eq('user_id', user.id); if (error) throw error; setShowMakerData(false); window.location.reload(); } catch (error) { console.error('Falha ao salvar dados da marcenaria', error); } finally { setSavingMakerData(false); } };

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      <h1 className="sr-only">Marcenapp — do projeto à produção, tudo no lugar.</h1>
      <ModuleErrorBoundary><Suspense fallback={null}><StudioWorker /></Suspense><Onboarding onNavigate={setActiveModule} activeModule={activeModule} /></ModuleErrorBoundary>
      <aside className="hidden md:flex w-64 bg-white text-slate-700 flex-col border-r border-slate-200 z-20 shrink-0">
        <div className="p-4 border-b border-slate-100 h-16"><button type="button" onClick={() => setActiveModule('dashboard')} aria-label="Ir para o início do Marcenapp" className="w-full flex items-center gap-3 font-bold text-slate-900 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><img src={logo} alt="Marcenapp" className="w-9 h-9 rounded-xl" /><div className="leading-tight"><span className="tracking-tight text-sm">MARCENAPP</span><p className="text-[10px] text-slate-500 font-normal tracking-tight">Do projeto à produção</p></div></button></div>
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto scrollbar-thin">{(Object.keys(groupedModules) as ModuleCategory[]).map(cat => <div key={cat} className="space-y-1"><h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">{CATEGORY_LABELS[cat]}<ChevronRight size={10} className="opacity-50" /></h3>{groupedModules[cat]!.map(m => <button key={m.id} id={`nav-${m.id}`} aria-label={m.label} aria-current={activeModule === m.id ? 'page' : undefined} onClick={() => setActiveModule(m.id)} onKeyDown={e => handleKeyDown(e, m.id)} className={`group w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeModule === m.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-600'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${activeModule === m.id ? 'bg-blue-100 text-blue-700' : m.category === 'studio' || m.category === 'intelligence' ? 'bg-violet-50 text-violet-600 group-hover:bg-violet-100' : m.category === 'finance' ? 'bg-amber-50 text-amber-700 group-hover:bg-amber-100' : m.category === 'production' ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}><m.icon size={18} strokeWidth={activeModule === m.id ? 2.4 : 2} aria-hidden="true" /></span><span className="font-semibold text-sm">{m.label}</span></button>)}</div>)}</nav>
        <div className="p-3 border-t border-slate-100">{user ? <button onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-left"><LogOut size={18} /><span className="font-medium text-sm">Sair</span></button> : <button onClick={() => navigate('/auth')} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-left"><LogIn size={18} /><span className="font-medium text-sm">Entrar / Cadastrar</span></button>}</div>
      </aside>

      {showMobileSidebar && <div className="md:hidden fixed inset-0 z-[100]">
        <button type="button" aria-label="Fechar menu de navegação" className="absolute inset-0 h-full w-full bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setShowMobileSidebar(false)} />
        <aside id="mobile-navigation-drawer" role="dialog" aria-modal="true" aria-label="Navegação principal" className="absolute inset-y-0 left-0 flex w-[min(84vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl animate-in slide-in-from-left duration-200">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <button type="button" onClick={() => { setActiveModule('dashboard'); setShowMobileSidebar(false); }} aria-label="Ir para o início do Marcenapp" className="flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <img src={logo} alt="Marcenapp" className="h-9 w-9 rounded-xl" /><span className="min-w-0"><span className="block text-sm font-black tracking-tight text-slate-900">MARCENAPP</span><span className="block text-[10px] text-slate-500">Do projeto à produção</span></span>
            </button>
            <button type="button" onClick={() => setShowMobileSidebar(false)} aria-label="Fechar menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X size={20} /></button>
          </div>
          <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {(Object.keys(groupedModules) as ModuleCategory[]).map(cat => <section key={cat} className="space-y-1">
              <h3 className="flex items-center justify-between px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{CATEGORY_LABELS[cat]}<ChevronRight size={10} className="opacity-50" /></h3>
              {groupedModules[cat]!.map(m => <button key={m.id} type="button" id={`mobile-drawer-nav-${m.id}`} aria-label={m.label} aria-current={activeModule === m.id ? 'page' : undefined} onClick={() => { setActiveModule(m.id); setShowMobileSidebar(false); }} className={`group flex min-h-11 w-full items-center gap-3 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeModule === m.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeModule === m.id ? 'bg-blue-100 text-blue-700' : m.category === 'studio' || m.category === 'intelligence' ? 'bg-violet-50 text-violet-600' : m.category === 'finance' ? 'bg-amber-50 text-amber-700' : m.category === 'production' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><m.icon size={18} strokeWidth={activeModule === m.id ? 2.4 : 2} aria-hidden="true" /></span>
                <span className="flex-1 text-sm font-semibold">{m.label}</span>{activeModule === m.id && <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />}
              </button>)}
            </section>)}
          </nav>
          <div className="shrink-0 border-t border-slate-100 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
            {user ? <button type="button" onClick={() => { setShowMobileSidebar(false); signOut(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><LogOut size={18} />Sair</button> : <button type="button" onClick={() => { setShowMobileSidebar(false); navigate('/auth'); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"><LogIn size={18} />Entrar / Cadastrar</button>}
          </div>
        </aside>
      </div>}

      <main className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-3 sm:px-4 md:px-8 h-16 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <button type="button" onClick={() => setShowMobileSidebar(true)} aria-label="Abrir menu de navegação" aria-haspopup="dialog" aria-expanded={showMobileSidebar} aria-controls="mobile-navigation-drawer" className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"><Menu size={22} /></button>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 truncate min-w-0"><button type="button" onClick={() => setActiveModule('dashboard')} aria-label="Ir para o início do Marcenapp" className="p-2 bg-blue-50 rounded-lg text-blue-700 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{activeModule === 'studio' ? <img src={logo} alt="M" className="w-5 h-5 object-contain" /> : <ActiveIcon size={20} className="shrink-0" />}</button><div className="flex flex-col min-w-0"><span className="truncate leading-none">{activeTitle}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate">{activeSubtitle}</span></div></h2>
          <div className="relative shrink-0">
            {user ? <>
              <button onClick={() => setShowUserMenu(!showUserMenu)} aria-label="Abrir menu da marcenaria" aria-expanded={showUserMenu} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:rounded-full md:py-1.5 md:pr-3"><EllipsisVertical className="md:hidden" size={20} /><div className="hidden md:flex w-8 h-8 rounded-full bg-blue-600 items-center justify-center text-white text-sm font-bold shadow-md">{profile?.name?.charAt(0)?.toUpperCase() || <User size={16} />}</div><div className="hidden sm:block text-left"><p className="text-[10px] font-bold text-slate-700 leading-none">{profile?.name || 'Usuário'}</p><p className="text-[8px] text-slate-500 uppercase tracking-tighter">{profile?.company || 'Marcenaria'}</p></div></button>
              {showUserMenu && <><div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} /><div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150"><div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">Sua marcenaria</p><p className="mt-1 truncate text-sm font-black text-slate-900">{profile?.company || 'Configure sua marcenaria'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{profile?.name || 'Responsável'}</p></div><div className="p-2"><button onClick={openSettings} className="group w-full rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Settings2 size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-slate-800">Configurações</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">Perfil, dados da marcenaria, preferências e recursos</span></span><ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" /></div></button><button onClick={openMakerData} className="group w-full rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"><div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-600"><Building2 size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">Dados da marcenaria</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">Acesso rápido para nome e responsável</span></span></div></button><div className="my-1 border-t border-slate-100" /><button onClick={() => { if (window.confirm('Deseja reiniciar o tutorial completo?')) { localStorage.removeItem('marcenapp_onboarding_seen'); localStorage.removeItem('marcenapp_onboarding_step'); localStorage.removeItem('marcenapp_onboarding_completed'); if (user) { supabase.from('profiles').update({ onboarding_step: 0, onboarding_completed: [] }).eq('user_id', user.id).then(() => window.location.reload()); } else { window.location.reload(); } } }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"><Sparkles size={16} className="text-amber-500" /> Reiniciar tutorial</button><button onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"><LogOut size={16} /> Sair</button></div></div></>}
            </> : <button onClick={() => navigate('/auth')} className="flex items-center gap-2 p-2 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-indigo-600/20"><LogIn size={16} /> Entrar</button>}
          </div>
        </header>

        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-8 pb-24 md:pb-8 scroll-smooth"><div className="w-full min-w-0 max-w-7xl mx-auto"><AnimatePresence mode="wait"><motion.div className="min-w-0" key={activeModule} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}><ModuleErrorBoundary key={activeModule}><Suspense fallback={<ModuleFallback />}>{renderModule()}</Suspense></ModuleErrorBoundary></motion.div></AnimatePresence></div></div>
        <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-2 text-right text-[10px] font-semibold text-slate-400 md:px-8"><BuildVersion /></footer>

      </main>

      {showMakerData && <div className="fixed inset-0 z-[200] bg-slate-950/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" role="dialog" aria-modal="true" aria-labelledby="maker-data-title"><div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"><div className="p-5 border-b border-slate-200 flex items-center justify-between"><div><h3 id="maker-data-title" className="text-base font-black text-slate-800">Dados rápidos da marcenaria</h3><p className="text-xs text-slate-500 mt-1">Edite os dados básicos sem sair da tela.</p></div><button type="button" onClick={() => setShowMakerData(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label="Fechar">×</button></div><div className="p-5 space-y-4"><label className="block"><span className="text-xs font-bold text-slate-600">Responsável</span><input value={makerName} onChange={e => setMakerName(e.target.value)} placeholder="Seu nome" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><label className="block"><span className="text-xs font-bold text-slate-600">Nome da marcenaria</span><input value={makerCompany} onChange={e => setMakerCompany(e.target.value)} placeholder="Nome comercial" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label></div><div className="p-5 pt-0 flex gap-2"><button type="button" onClick={() => setShowMakerData(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancelar</button><button type="button" onClick={saveMakerData} disabled={savingMakerData} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{savingMakerData ? 'Salvando...' : 'Salvar dados'}</button></div></div></div>}
    </div>
  );
};
export default Index;
