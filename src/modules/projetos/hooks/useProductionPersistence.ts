import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CutPlanningPart } from '@/core/cutPlanning';
import type { Json } from '@/integrations/supabase/types';

type ProductionJourney = {
  production?: { updatedAt: string; parts: CutPlanningPart[] };
  [key: string]: unknown;
};

export const useProductionPersistence = (
  projectId: string | undefined,
  parts: CutPlanningPart[],
  setParts: (parts: CutPlanningPart[]) => void,
) => {
  const { user } = useAuth();
  const hydratedProject = useRef<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user || !projectId || hydratedProject.current === projectId) return;
    hydratedProject.current = projectId;
    let cancelled = false;

    supabase
      .from('projects')
      .select('jornada')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const jornada = (data?.jornada ?? {}) as ProductionJourney;
        const saved = jornada.production;
        if (saved && Array.isArray(saved.parts)) {
          setParts(saved.parts.filter(Boolean).map(part => ({
            ...part,
            id: Number(part.id),
            w: Number(part.w),
            h: Number(part.h),
            qtd: Number(part.qtd),
            thickness: Number(part.thickness || 15),
          })));
        } else {
          setParts([]);
        }
      });

    return () => { cancelled = true; };
  }, [user, projectId, setParts]);

  useEffect(() => {
    if (!user || !projectId || hydratedProject.current !== projectId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('projects')
        .select('jornada')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data) return;

      const jornada = (data.jornada ?? {}) as ProductionJourney;
      const nextJornada: ProductionJourney = {
        ...jornada,
        production: { updatedAt: new Date().toISOString(), parts },
      };
      await supabase
        .from('projects')
        .update({ jornada: nextJornada as unknown as Json })
        .eq('id', projectId)
        .eq('user_id', user.id);
    }, 700);

    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [user, projectId, parts]);
};
