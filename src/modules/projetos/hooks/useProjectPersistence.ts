import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProjectData } from '../types';

export const useProjectPersistence = (
  budgetProject: ProjectData,
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>
) => {
  const { user } = useAuth();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    hydratedUserId.current = null;
    if (!user) return;

    let cancelled = false;
    const loadProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (error) {
        console.error('[project-persistence] load failed', error);
        hydratedUserId.current = user.id;
        return;
      }

      if (data?.[0]) {
        const p = data[0];
        setBudgetProject({
          id: p.id,
          width: Number(p.width) || 2.4,
          height: Number(p.height) || 2.6,
          depth: Number(p.depth) || 0.6,
          modules: Number(p.modules) || 3,
          drawers: Number(p.drawers) || 4,
          doors: Number(p.doors) || 6,
          internalMaterial: p.internal_material || 'mdf15_white',
          externalMaterial: p.external_material || 'mdf18_white',
          backMaterial: p.back_material || 'mdf6_white',
          handleType: p.handle_type || 'external',
          profitMargin: Number(p.profit_margin) || 35,
          laborRate: Number(p.labor_rate) || 100,
        });
      }

      hydratedUserId.current = user.id;
    };

    void loadProject();
    return () => {
      cancelled = true;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [user, setBudgetProject]);

  useEffect(() => {
    if (!user || hydratedUserId.current !== user.id || !budgetProject.id) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const projectRow = {
        user_id: user.id,
        width: budgetProject.width,
        height: budgetProject.height,
        depth: budgetProject.depth,
        modules: budgetProject.modules,
        drawers: budgetProject.drawers,
        doors: budgetProject.doors,
        internal_material: budgetProject.internalMaterial,
        external_material: budgetProject.externalMaterial,
        back_material: budgetProject.backMaterial,
        handle_type: budgetProject.handleType,
        profit_margin: budgetProject.profitMargin,
        labor_rate: budgetProject.laborRate,
      };

      const { error } = await supabase
        .from('projects')
        .update(projectRow)
        .eq('id', budgetProject.id)
        .eq('user_id', user.id);

      if (error) console.error('[project-persistence] update failed', error);
    }, 2000);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [user, budgetProject]);
};
