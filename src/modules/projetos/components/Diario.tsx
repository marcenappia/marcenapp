import React from 'react';
import { ArrowRight, BookOpen, Camera, FileText, Mic, Sparkles } from 'lucide-react';
import DiarioIntake from './DiarioIntake';

interface Props {
  navigateTo?: (id: string, params?: Record<string, string>) => void;
}

export default function Diario({ navigateTo }: Props) {
  const goToIara = () => navigateTo?.('studio');

  return (
    <div className="min-h-full bg-slate-50/80 px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <BookOpen size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">Diário de Obra</p>
                <p className="truncate text-xs text-slate-500">Registre o que aconteceu. A IARA organiza o próximo passo.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={goToIara}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Sparkles size={15} />
              Levar para a IARA
              <ArrowRight size={14} />
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Registre do seu jeito</p>
              <p className="mt-0.5 text-xs text-slate-500">Você pode começar com foto, voz ou texto. Não precisa organizar tudo antes.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Camera size={14} /> Foto</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Mic size={14} /> Voz</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><FileText size={14} /> Texto</span>
            </div>
          </div>
        </section>

        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#f7f6f2] shadow-sm">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.08)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative p-1 md:p-3">
            <DiarioIntake navigateTo={navigateTo} />
          </div>
        </div>
      </div>
    </div>
  );
}
