import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  MessageSquare, 
  Home, 
  Wand2, 
  ArrowUpFromLine, 
  Calculator, 
  Scissors, 
  Scale,
  Sparkles
} from 'lucide-react';
import { Button } from './shared';

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const steps: Step[] = [
  {
    title: "Bem-vindo ao MarcenApp!",
    description: "Sua marcenaria digital 4.0. Vamos te mostrar como usar nossas ferramentas de IA e gestão para transformar seus projetos.",
    icon: Sparkles,
    color: "text-amber-500"
  },
  {
    title: "IARA Chat",
    description: "Nossa IA assistente. Peça orçamentos, tire dúvidas técnicas ou peça sugestões de design. Ela entende tudo de marcenaria.",
    icon: MessageSquare,
    color: "text-blue-500"
  },
  {
    title: "Studio 3D",
    description: "Visualize seus projetos em 3D em tempo real. Teste materiais, cores e layouts com facilidade.",
    icon: Wand2,
    color: "text-purple-500"
  },
  {
    title: "Orçamento & Corte",
    description: "Gere orçamentos precisos em segundos e obtenha o plano de corte otimizado para economizar material.",
    icon: Calculator,
    color: "text-emerald-500"
  },
  {
    title: "Contratos Automáticos",
    description: "Gere contratos profissionais para seus clientes com apenas alguns cliques, garantindo segurança jurídica.",
    icon: Scale,
    color: "text-slate-500"
  }
];

const Onboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('marcenapp_onboarding_seen');
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeOnboarding = () => {
    localStorage.setItem('marcenapp_onboarding_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className={`absolute inset-0 blur-2xl opacity-20 ${step.color.replace('text', 'bg')}`} />
            <div className={`w-20 h-20 rounded-2xl bg-muted flex items-center justify-center relative border border-border shadow-inner`}>
              <Icon size={40} className={step.color} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground tracking-tight italic uppercase">
              {step.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-primary' : 'w-1.5 bg-muted'}`} 
              />
            ))}
          </div>
        </div>

        <div className="p-6 bg-muted/30 border-t border-border flex items-center justify-between">
          <button 
            onClick={closeOnboarding}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular tour
          </button>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="secondary" onClick={handlePrev} className="px-3">
                <ChevronLeft size={20} />
              </Button>
            )}
            <Button onClick={handleNext} className="min-w-[120px]">
              {currentStep === steps.length - 1 ? 'Começar agora' : 'Próximo'}
              {currentStep < steps.length - 1 && <ChevronRight size={18} className="ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;