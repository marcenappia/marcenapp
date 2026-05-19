import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProjectData } from '../types';

export const useProjectPersistence = (
  budgetProject: ProjectData, 
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>
) => {
  const { user } = useAuth();
  const saveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const p = data[0];
          setBudgetProject({
            width: Number(p.width) || 2.4,
            height: Number(p.height) || 2.6,
            depth: Number(p.depth) || 0.6,
            modules: p.modules || 3,
            drawers: p.drawers || 4,
            doors: p.doors || 6,
            internalMaterial: p.internal_material || 'mdf15_white',
            externalMaterial: p.external_material || 'mdf18_white',
            backMaterial: p.back_material || 'mdf6_white',
            handleType: p.handle_type || 'external',
            profitMargin: Number(p.profit_margin) || 35,
            laborRate: Number(p.labor_rate) || 100,
          });
        }
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

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

      if (existing && existing.length > 0) {
        await supabase.from('projects').update(projectRow).eq('id', existing[0].id);
      } else {
        await supabase.from('projects').insert(projectRow);
      }
    }, 2000);

    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [user, budgetProject]);
};
