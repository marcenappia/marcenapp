import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  MessageSquare, 
  Wand2, 
  Calculator, 
  Scissors, 
  Scale,
  Sparkles,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Button } from './shared';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  targetId?: string;
  routeId?: string;
}

const steps: Step[] = [
  {
    id: 'welcome',
    title: "Bem-vindo ao MarcenApp!",
    description: "Sua marcenaria digital 4.0. Vamos te mostrar como usar nossas ferramentas de IA e gestão para transformar seus projetos.",
    icon: Sparkles,
    color: "text-amber-500"
  },
  {
    id: 'chat',
    title: "IARA Chat",
    description: "Nossa IA assistente. Peça orçamentos, tire dúvidas técnicas ou peça sugestões de design. Ela entende tudo de marcenaria.",
    icon: MessageSquare,
    color: "text-blue-500",
    targetId: "nav-chat",
    routeId: "chat"
  },
  {
    id: 'studio',
    title: "Studio 3D",
    description: "Visualize seus projetos em 3D em tempo real. Teste materiais, cores e layouts com facilidade.",
    icon: Wand2,
    color: "text-purple-500",
    targetId: "nav-studio",
    routeId: "studio"
  },
  {
    id: 'orcamento',
    title: "Orçamento & Custo",
    description: "Gere orçamentos precisos em segundos. Controle seus custos e margem de lucro de forma profissional.",
    icon: Calculator,
    color: "text-emerald-500",
    targetId: "nav-orcamento",
    routeId: "orcamento"
  },
  {
    id: 'corte',
    title: "Plano de Corte",
    description: "Obtenha o plano de corte otimizado para economizar material e agilizar sua produção.",
    icon: Scissors,
    color: "text-orange-500",
    targetId: "nav-corte",
    routeId: "corte"
  },
  {
    id: 'contrato',
    title: "Contratos",
    description: "Gere contratos profissionais para seus clientes com apenas alguns cliques, garantindo segurança jurídica.",
    icon: Scale,
    color: "text-slate-500",
    targetId: "nav-contrato",
    routeId: "contrato"
  },
  {
    id: 'checklist',
    title: "Sua Jornada 4.0",
    description: "Acompanhe seu progresso e comece a produzir:",
    icon: CheckCircle2,
    color: "text-green-500"
  }
];

interface OnboardingProps {
  onNavigate: (moduleId: string) => void;
  activeModule: string;
}

const Onboarding = ({ onNavigate, activeModule }: OnboardingProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const isUpdating = useRef(false);

  // Sync state from profile or localStorage
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('marcenapp_onboarding_seen');
    
    if (user && profile) {
      setReduceMotion(profile.reduce_motion ?? false);
      setCompletedSteps(profile.onboarding_completed ?? []);
      setCurrentStep(profile.onboarding_step ?? 0);
      
      const allDone = profile.onboarding_completed?.length >= steps.length - 2; // Subtract welcome/checklist
      if (!allDone && hasSeenOnboarding !== 'true') {
        setIsOpen(true);
      }
    } else {
      const savedStep = localStorage.getItem('marcenapp_onboarding_step');
      const savedCompleted = localStorage.getItem('marcenapp_onboarding_completed');
      const savedReduceMotion = localStorage.getItem('marcenapp_reduce_motion') === 'true';
      
      setReduceMotion(savedReduceMotion);
      if (savedCompleted) setCompletedSteps(JSON.parse(savedCompleted));
      if (hasSeenOnboarding !== 'true') {
        setIsOpen(true);
        if (savedStep) setCurrentStep(parseInt(savedStep));
      }
    }
  }, [user, profile]);

  const updateProfilePreferences = async (updates: any) => {
    if (!user || isUpdating.current) return;
    isUpdating.current = true;
    try {
      await supabase.from('profiles').update(updates).eq('user_id', user.id);
      await refreshProfile();
    } finally {
      isUpdating.current = false;
    }
  };

  const updateHighlight = useCallback(() => {
    const step = steps[currentStep];
    if (step.targetId && !reduceMotion) {
      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          opacity: 1,
          pointerEvents: 'none'
        });
        element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      } else {
        setHighlightStyle({ opacity: 0 });
      }
    } else {
      setHighlightStyle({ opacity: 0 });
    }
  }, [currentStep, reduceMotion]);

  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    
    if (step.routeId && step.routeId !== activeModule) {
      onNavigate(step.routeId);
    }

    // Mark step as completed as soon as it's reached
    if (!completedSteps.includes(step.id)) {
      const newCompleted = [...completedSteps, step.id];
      setCompletedSteps(newCompleted);
      localStorage.setItem('marcenapp_onboarding_completed', JSON.stringify(newCompleted));
    }

    localStorage.setItem('marcenapp_onboarding_step', currentStep.toString());
    localStorage.setItem('marcenapp_onboarding_seen', 'false');

    const timeoutId = setTimeout(updateHighlight, 350);
    window.addEventListener('resize', updateHighlight);
    
    // Focus management for accessibility
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [currentStep, isOpen, activeModule, onNavigate, updateHighlight]);

  const toggleReduceMotion = () => {
    const newVal = !reduceMotion;
    setReduceMotion(newVal);
    localStorage.setItem('marcenapp_reduce_motion', newVal.toString());
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const finishOnboarding = (moduleId?: string) => {
    localStorage.setItem('marcenapp_onboarding_seen', 'true');
    localStorage.removeItem('marcenapp_onboarding_step');
    if (moduleId) onNavigate(moduleId);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const isChecklist = step.id === 'checklist';

  return (
    <>
      {/* Spotlight Overlay */}
      {!reduceMotion && (
        <div 
          role="presentation"
          aria-hidden="true"
          className="fixed z-[190] border-2 border-primary ring-[2000px] ring-slate-950/70 rounded-xl transition-all ease-in-out shadow-[0_0_20px_rgba(var(--primary),0.5)]"
          style={{
            ...highlightStyle,
            transitionDuration: reduceMotion ? '0ms' : '500ms'
          }}
        />
      )}
      {reduceMotion && (
        <div className="fixed inset-0 z-[190] bg-slate-950/50 backdrop-blur-sm" />
      )}

      <div 
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div 
          ref={modalRef}
          tabIndex={-1}
          className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col pointer-events-auto focus:outline-none"
        >
          <div className="p-6 flex flex-col items-center text-center space-y-6">
            <div className="relative">
              {!reduceMotion && <div className={`absolute inset-0 blur-2xl opacity-20 ${step.color.replace('text', 'bg')}`} />}
              <div className={`w-20 h-20 rounded-2xl bg-muted flex items-center justify-center relative border border-border shadow-inner`}>
                <Icon size={40} className={step.color} />
              </div>
            </div>

            <div className="space-y-2 w-full">
              <h2 id="onboarding-title" className="text-2xl font-black text-foreground tracking-tight italic uppercase">
                {step.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {isChecklist && (
                <div className="grid grid-cols-1 gap-2 mt-6 text-left">
                  {steps.filter(s => s.id !== 'welcome' && s.id !== 'checklist').map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <s.icon size={18} className={s.color} />
                        <span className="text-sm font-bold">{s.title}</span>
                      </div>
                      {completedSteps.includes(s.id) ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <Circle size={18} className="text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isChecklist && (
              <div className="flex gap-1.5" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-primary' : 'w-1.5 bg-muted'}`} 
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-muted/30 border-t border-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => finishOnboarding()}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pular tour
              </button>

              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button variant="secondary" onClick={handlePrev} className="px-3" aria-label="Passo anterior">
                    <ChevronLeft size={20} />
                  </Button>
                )}
                {!isChecklist ? (
                  <Button onClick={handleNext} className="min-w-[120px]">
                    {currentStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                    {currentStep < steps.length - 1 && <ChevronRight size={18} className="ml-1" />}
                  </Button>
                ) : (
                  <Button onClick={() => finishOnboarding('chat')} className="min-w-[120px]">
                    Começar agora
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex justify-center border-t border-border pt-4">
              <button 
                onClick={toggleReduceMotion}
                className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <div className={`w-8 h-4 rounded-full relative transition-colors ${reduceMotion ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${reduceMotion ? 'left-4.5' : 'left-0.5'}`} />
                </div>
                Modo reduzir movimento
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;