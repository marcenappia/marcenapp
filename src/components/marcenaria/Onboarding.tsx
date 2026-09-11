import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, MessageSquare, Wand2, Calculator, Scissors, Scale, Sparkles, CheckCircle2, Circle } from 'lucide-react';
import { Button } from './shared';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Step { id: string; title: string; description: string; icon: React.ElementType; color: string; targetId?: string; routeId?: string; }

const steps: Step[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Marcenapp',
    description: 'Do primeiro projeto às informações para produção, vamos mostrar como organizar as principais etapas do seu trabalho em um só lugar.',
    icon: Sparkles,
    color: 'text-primary',
  },
  {
    id: 'chat',
    title: 'Yara',
    description: 'A assistente de inteligência artificial do Marcenapp. Ela ajuda a interpretar informações e acompanhar etapas do projeto. Você continua no controle.',
    icon: MessageSquare,
    color: 'text-primary',
    targetId: 'nav-chat',
    routeId: 'chat',
  },
  {
    id: 'studio',
    title: 'Visualização 2D e 3D',
    description: 'Desenvolva o projeto e visualize o móvel antes de seguir para as próximas etapas.',
    icon: Wand2,
    color: 'text-primary',
    targetId: 'nav-studio',
    routeId: 'studio',
  },
  {
    id: 'orcamento',
    title: 'Orçamento',
    description: 'Leve as informações do projeto para organizar o orçamento e revisar os dados antes de finalizar.',
    icon: Calculator,
    color: 'text-primary',
    targetId: 'nav-orcamento',
    routeId: 'orcamento',
  },
  {
    id: 'corte',
    title: 'Lista de corte',
    description: 'Reúna as informações do projeto necessárias para preparar a etapa de corte e produção.',
    icon: Scissors,
    color: 'text-primary',
    targetId: 'nav-corte',
    routeId: 'corte',
  },
  {
    id: 'contrato',
    title: 'Contratos',
    description: 'Organize os documentos relacionados ao projeto e revise as informações antes de finalizar.',
    icon: Scale,
    color: 'text-primary',
    targetId: 'nav-contrato',
    routeId: 'contrato',
  },
  {
    id: 'checklist',
    title: 'Seu projeto, organizado',
    description: 'Você conheceu as principais etapas. Agora é só escolher por onde continuar.',
    icon: CheckCircle2,
    color: 'text-primary',
  },
];

interface OnboardingProps { onNavigate: (moduleId: string) => void; activeModule: string; }
type ProfileUpdates = { onboarding_completed?: string[]; reduce_motion?: boolean; onboarding_step?: number };

const Onboarding = ({ onNavigate, activeModule }: OnboardingProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const isUpdating = useRef(false);
  const userId = user?.id ?? null;
  const profileStep = profile?.onboarding_step ?? null;
  const profileReduceMotion = profile?.reduce_motion ?? null;
  const profileCompletedKey = profile ? JSON.stringify(profile.onboarding_completed ?? []) : null;
  const hasProfile = !!profile;

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('marcenapp_onboarding_seen');
    if (userId && hasProfile) {
      const completed: string[] = profileCompletedKey ? JSON.parse(profileCompletedKey) : [];
      setReduceMotion(profileReduceMotion ?? false);
      setCompletedSteps(completed);
      setCurrentStep(profileStep ?? 0);
      const allDone = completed.length >= steps.length - 2;
      if (!allDone && hasSeenOnboarding !== 'true') setIsOpen(true);
    } else {
      const savedStep = localStorage.getItem('marcenapp_onboarding_step');
      const savedCompleted = localStorage.getItem('marcenapp_onboarding_completed');
      const savedReduceMotion = localStorage.getItem('marcenapp_reduce_motion') === 'true';
      setReduceMotion(savedReduceMotion);
      if (savedCompleted) setCompletedSteps(JSON.parse(savedCompleted));
      if (hasSeenOnboarding !== 'true') {
        setIsOpen(true);
        if (savedStep) setCurrentStep(parseInt(savedStep, 10));
      }
    }
  }, [userId, hasProfile, profileStep, profileReduceMotion, profileCompletedKey]);

  const updateProfilePreferences = useCallback(async (updates: ProfileUpdates) => {
    if (!user || isUpdating.current) return;
    isUpdating.current = true;
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
    } finally {
      isUpdating.current = false;
    }
  }, [user, refreshProfile]);

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
          pointerEvents: 'none',
        });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    if (step.routeId && step.routeId !== activeModule) onNavigate(step.routeId);

    if (!completedSteps.includes(step.id)) {
      const newCompleted = [...completedSteps, step.id];
      setCompletedSteps(newCompleted);
      localStorage.setItem('marcenapp_onboarding_completed', JSON.stringify(newCompleted));
      if (user) void updateProfilePreferences({ onboarding_completed: newCompleted, onboarding_step: currentStep });
    } else if (user && profileStep !== currentStep) {
      void updateProfilePreferences({ onboarding_step: currentStep });
    }

    localStorage.setItem('marcenapp_onboarding_step', currentStep.toString());
    localStorage.setItem('marcenapp_onboarding_seen', 'false');
    const timeoutId = setTimeout(updateHighlight, 350);
    window.addEventListener('resize', updateHighlight);
    if (modalRef.current) modalRef.current.focus();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [currentStep, isOpen, activeModule, onNavigate, updateHighlight, user, profileStep, completedSteps, updateProfilePreferences]);

  const toggleReduceMotion = () => {
    const newVal = !reduceMotion;
    setReduceMotion(newVal);
    localStorage.setItem('marcenapp_reduce_motion', newVal.toString());
    if (user) void updateProfilePreferences({ reduce_motion: newVal });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else finishOnboarding();
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
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
      {!reduceMotion && (
        <div
          role="presentation"
          aria-hidden="true"
          className="fixed z-[190] border-2 border-primary ring-[2000px] ring-slate-950/70 rounded-xl transition-all ease-in-out shadow-[0_0_20px_rgba(37,99,235,0.22)]"
          style={{ ...highlightStyle, transitionDuration: '500ms' }}
        />
      )}
      {reduceMotion && <div className="fixed inset-0 z-[190] bg-slate-950/50 backdrop-blur-sm" />}
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div ref={modalRef} tabIndex={-1} className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col pointer-events-auto focus:outline-none">
          <div className="p-6 flex flex-col items-center text-center space-y-6">
            <div className="relative">
              {!reduceMotion && <div className="absolute inset-0 blur-2xl opacity-15 bg-primary" />}
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center relative border border-primary/15 shadow-inner">
                <Icon size={40} className="text-primary" />
              </div>
            </div>
            <div className="space-y-2 w-full">
              <h2 id="onboarding-title" className="text-2xl font-black text-foreground tracking-tight">{step.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              {isChecklist && (
                <div className="grid grid-cols-1 gap-2 mt-6 text-left">
                  {steps.filter(s => s.id !== 'welcome' && s.id !== 'checklist').map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-3">
                        <s.icon size={18} className="text-primary" />
                        <span className="text-sm font-bold">{s.title}</span>
                      </div>
                      {completedSteps.includes(s.id) ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!isChecklist && (
              <div className="flex gap-1.5" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
                {steps.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-primary' : 'w-1.5 bg-muted'}`} />)}
              </div>
            )}
          </div>
          <div className="p-6 bg-muted/30 border-t border-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button onClick={() => finishOnboarding()} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pular tour</button>
              <div className="flex gap-3">
                {currentStep > 0 && <Button variant="secondary" onClick={handlePrev} className="px-3" aria-label="Passo anterior"><ChevronLeft size={20} /></Button>}
                {!isChecklist ? (
                  <Button onClick={handleNext} className="min-w-[120px]">
                    {currentStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                    {currentStep < steps.length - 1 && <ChevronRight size={18} className="ml-1" />}
                  </Button>
                ) : (
                  <Button onClick={() => finishOnboarding('chat')} className="min-w-[120px]">Começar agora</Button>
                )}
              </div>
            </div>
            <div className="flex justify-center border-t border-border pt-4">
              <button onClick={toggleReduceMotion} className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                <div className={`w-8 h-4 rounded-full relative transition-colors ${reduceMotion ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${reduceMotion ? 'left-4' : 'left-0.5'}`} />
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
