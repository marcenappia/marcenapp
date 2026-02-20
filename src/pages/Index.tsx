import React, { useState, useEffect } from 'react';
import { 
  Home, Wand2, ArrowUpFromLine, Calculator, Scissors, Scale, Box
} from 'lucide-react';
import ModuleDashboard from '../components/marcenaria/ModuleDashboard';
import ModuleStudio from '../components/marcenaria/ModuleStudio';
import ModuleElevator from '../components/marcenaria/ModuleElevator';
import ModuleOrcamento from '../components/marcenaria/ModuleOrcamento';
import ModuleCorte from '../components/marcenaria/ModuleCorte';
import ModuleContrato from '../components/marcenaria/ModuleContrato';

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
  const [activeModule, setActiveModule] = useState('studio');
  const [budgetProject, setBudgetProject] = useState(defaultProject);
  const [parts, setParts] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);

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
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 z-20 shrink-0">
        <div className="p-4 flex items-center gap-2.5 font-bold text-white border-b border-slate-800 h-16">
          <div className="p-1.5 bg-indigo-600 rounded-lg">
            <Box size={18} className="text-white" />
          </div>
          <span className="tracking-tight">Marcenaria<span className="text-indigo-400">.OS</span></span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                activeModule === m.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`}
            >
              <m.icon size={18} />
              <span className="font-medium text-sm">{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-600 text-center">
            Powered by Gemini AI
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 h-16 flex items-center sticky top-0 z-10 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
            <ActiveIcon size={20} className="text-indigo-600 shrink-0" />
            <span className="truncate">{activeModuleData.label}</span>
          </h2>
        </header>

        {/* Module Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {renderModule()}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-1 py-1 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all flex-1 ${
                activeModule === m.id ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${activeModule === m.id ? 'bg-indigo-50' : 'bg-transparent'}`}>
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
