import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import DiarioIntake from './DiarioIntake';

interface Props {
  navigateTo?: (id: string, params?: Record<string, string>) => void;
}

export default function Diario({ navigateTo }: Props) {
  return (
    <div className="min-h-full bg-slate-50/80 px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Diário de Obra</p>
              <p className="truncate text-xs text-slate-500">Seu registro de campo, organizado para a IARA.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:flex">
            <Sparkles size={14} />
            Contexto para a IARA
          </div>
        </div>

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
