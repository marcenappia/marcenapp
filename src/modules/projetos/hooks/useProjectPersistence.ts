import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProjectData } from '../types';

const emptyProject: ProjectData = { width: 0, height: 0, depth: 0, modules: 0, drawers: 0, doors: 0, internalMaterial: '', externalMaterial: '', backMaterial: '', handleType: '', profitMargin: 0, laborRate: 0 };

export const useProjectPersistence = (
  budgetProject: ProjectData,
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>,
  selectedProjectId: string | null = null,
) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const routeProjectId = searchParams.get('projeto');
  const effectiveProjectId = selectedProjectId ?? routeProjectId;
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    hydratedUserId.current = null;
    setBudgetProject(emptyProject);
    if (!user) return;

    let cancelled = false;
    const loadProject = async () => {
      let query = supabase.from('projects').select('*').eq('user_id', user.id);
      query = effectiveProjectId
        ? query.eq('id', effectiveProjectId)
        : query.order('updated_at', { ascending: false }).limit(1);

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        console.error('[project-persistence] load failed', error);
        hydratedUserId.current = user.id;
        return;
      }

      const p = data?.[0];
      if (p) {
        const requiredNumeric = [p.width, p.height, p.depth, p.modules, p.drawers, p.doors, p.profit_margin, p.labor_rate];
        const requiredText = [p.internal_material, p.external_material, p.back_material, p.handle_type];
        const hasCompleteProjectData = requiredNumeric.every(value => value !== null && value !== undefined && Number.isFinite(Number(value)))
          && requiredText.every(value => typeof value === 'string' && value.trim().length > 0);

        if (!hasCompleteProjectData) {
          console.error('[project-persistence] persisted project has incomplete data; refusing to invent defaults', { projectId: p.id });
        } else {
          setBudgetProject({
            id: p.id,
            width: Number(p.width),
            height: Number(p.height),
            depth: Number(p.depth),
            modules: Number(p.modules),
            drawers: Number(p.drawers),
            doors: Number(p.doors),
            internalMaterial: p.internal_material,
            externalMaterial: p.external_material,
            backMaterial: p.back_material,
            handleType: p.handle_type,
            profitMargin: Number(p.profit_margin),
            laborRate: Number(p.labor_rate),
          });
        }
      }

      hydratedUserId.current = user.id;
    };

    void loadProject();
    return () => {
      cancelled = true;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [user, effectiveProjectId, setBudgetProject]);

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

      const { error } = await supabase.from('projects').update(projectRow).eq('id', budgetProject.id).eq('user_id', user.id);
      if (error) console.error('[project-persistence] update failed', error);
    }, 2000);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [user, budgetProject]);
};
