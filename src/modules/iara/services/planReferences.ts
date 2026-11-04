export interface PlanVisualReference {
  mimeType: string;
  data: string;
  kind: string;
}

export const MAX_PLAN_REFERENCES = 8;

/**
 * A planta/foto atual precisa ser sempre a primeira referência enviada ao
 * motor, porque `images[0]` é a base da edição. As demais referências do
 * projeto continuam no contexto, na ordem atual, sem duplicar a atual.
 */
export function orderPlanReferences(
  references: PlanVisualReference[],
  currentPlan: string,
  limit = MAX_PLAN_REFERENCES,
): PlanVisualReference[] {
  const current = references.find((reference) => reference.data === currentPlan);
  const others = references.filter((reference) => reference.data !== currentPlan);
  const ordered = current
    ? [current, ...others]
    : [{ mimeType: 'image/png', data: currentPlan, kind: 'plan' }, ...others];
  return ordered.slice(0, limit);
}
