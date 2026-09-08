/**
 * MARCENAPP product architecture.
 *
 * This is intentionally a domain-only layer: it prepares the product for
 * different professional audiences and commercial tiers without changing
 * the current UI or interrupting the core marcenaria journey.
 */

export type ProductAudience = 'marceneiro' | 'profissional' | 'equipe';

export type ExperienceProfile = {
  audience: ProductAudience;
  label: string;
  interaction: 'guided' | 'direct' | 'team';
  technicalDepth: 'essential' | 'technical' | 'advanced';
  /** Future UI capability; currently kept internal. */
  showTechnicalControls: boolean;
  /** Future UI capability; currently kept internal. */
  showAdvancedDocumentation: boolean;
};

export const EXPERIENCE_PROFILES: Record<ProductAudience, ExperienceProfile> = {
  marceneiro: {
    audience: 'marceneiro',
    label: 'Marcenaria',
    interaction: 'guided',
    technicalDepth: 'essential',
    showTechnicalControls: false,
    showAdvancedDocumentation: false,
  },
  profissional: {
    audience: 'profissional',
    label: 'Profissional de projeto',
    interaction: 'direct',
    technicalDepth: 'technical',
    showTechnicalControls: true,
    showAdvancedDocumentation: true,
  },
  equipe: {
    audience: 'equipe',
    label: 'Equipe / Studio',
    interaction: 'team',
    technicalDepth: 'advanced',
    showTechnicalControls: true,
    showAdvancedDocumentation: true,
  },
};

export type CommercialPlanId = 'inicio' | 'pro' | 'studio' | 'enterprise';

export type CommercialPlan = {
  id: CommercialPlanId;
  label: string;
  monthlyPriceBRL: number | null;
  targetAudience: ProductAudience[];
  /** Commercial availability is intentionally false until billing is implemented. */
  billingEnabled: false;
  capabilities: {
    coreMarcenaria: boolean;
    documentation2D: boolean;
    production: boolean;
    team: boolean;
    whiteLabel: boolean;
  };
};

/**
 * Pricing is a domain proposal only. It must not be treated as live billing.
 * Keeping it here lets the commercial model evolve without coupling prices
 * to screens or to the marcenaria workflow.
 */
export const COMMERCIAL_PLANS: Record<CommercialPlanId, CommercialPlan> = {
  inicio: {
    id: 'inicio',
    label: 'Início',
    monthlyPriceBRL: 79,
    targetAudience: ['marceneiro'],
    billingEnabled: false,
    capabilities: {
      coreMarcenaria: true,
      documentation2D: false,
      production: false,
      team: false,
      whiteLabel: false,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyPriceBRL: 179,
    targetAudience: ['marceneiro', 'profissional'],
    billingEnabled: false,
    capabilities: {
      coreMarcenaria: true,
      documentation2D: true,
      production: true,
      team: false,
      whiteLabel: false,
    },
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    monthlyPriceBRL: 349,
    targetAudience: ['profissional', 'equipe'],
    billingEnabled: false,
    capabilities: {
      coreMarcenaria: true,
      documentation2D: true,
      production: true,
      team: true,
      whiteLabel: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    label: 'Personalizado',
    monthlyPriceBRL: null,
    targetAudience: ['equipe'],
    billingEnabled: false,
    capabilities: {
      coreMarcenaria: true,
      documentation2D: true,
      production: true,
      team: true,
      whiteLabel: true,
    },
  },
};

/**
 * MARCENA is the commercial visualization/presentation product inside
 * MARCENAPP. It is not a second application: it is the customer-facing
 * value moment that helps the professional sell the furniture project.
 */
export type MarcenaProductStage =
  | 'environment-photo'
  | 'client-request'
  | 'visual-scene'
  | 'adjustments'
  | 'approved-scene'
  | 'documentation-2d'
  | 'budget'
  | 'production';

export const MARCENA_PRODUCT = {
  id: 'marcena',
  name: 'MARCENA',
  parentProduct: 'MARCENAPP',
  positioning:
    'Transforma o ambiente real do cliente em uma apresentação visual que ajuda o marceneiro a vender o projeto.',
  coreValue: 'venda e aprovação do projeto',
  stages: [
    'environment-photo',
    'client-request',
    'visual-scene',
    'adjustments',
    'approved-scene',
    'documentation-2d',
    'budget',
    'production',
  ] as const satisfies readonly MarcenaProductStage[],
  billingEnabled: false,
} as const;

export type MarcenaSceneUnit = {
  id: 'essential' | 'professional';
  label: string;
  priceBRL: number;
  includes: readonly string[];
};

/**
 * Proposed unit economics for future usage/credit sales.
 * These values are commercial planning only; they do not activate billing.
 */
export const MARCENA_SCENE_UNITS: readonly MarcenaSceneUnit[] = [
  {
    id: 'essential',
    label: 'MARCENA Essencial',
    priceBRL: 29.9,
    includes: ['1 cena do ambiente', '1 apresentação visual', '1 rodada de ajuste'],
  },
  {
    id: 'professional',
    label: 'MARCENA Profissional',
    priceBRL: 79.9,
    includes: [
      '1 projeto visual completo',
      'alternativas de apresentação',
      'ajustes profissionais',
      'documentação 2D',
    ],
  },
] as const;

export type MarcenaRevenueModel =
  | 'subscription'
  | 'scene-credits'
  | 'professional-project'
  | 'team'
  | 'white-label';

/** Future revenue streams, intentionally disconnected from checkout today. */
export const MARCENA_REVENUE_MODEL: readonly MarcenaRevenueModel[] = [
  'subscription',
  'scene-credits',
  'professional-project',
  'team',
  'white-label',
] as const;

export type MarcenariaWorkflowStage =
  | 'environment'
  | 'request'
  | 'analysis'
  | 'measurements'
  | 'visual-project'
  | 'approval'
  | 'documentation-2d'
  | 'budget'
  | 'production'
  | 'cut-plan';

/** The single core journey shared by every future audience. */
export const MARCENARIA_WORKFLOW: readonly MarcenariaWorkflowStage[] = [
  'environment',
  'request',
  'analysis',
  'measurements',
  'visual-project',
  'approval',
  'documentation-2d',
  'budget',
  'production',
  'cut-plan',
] as const;

export type ProductCapability =
  | 'core-marcenaria'
  | 'documentation-2d'
  | 'technical-project'
  | 'production'
  | 'cut-plan'
  | 'team'
  | 'white-label';

/**
 * Future capability matrix. The current application should continue to
 * expose the existing marcenaria experience; this matrix is the contract
 * that future modes can consume when those interfaces are actually built.
 */
export const CAPABILITY_MATRIX: Record<ProductAudience, readonly ProductCapability[]> = {
  marceneiro: ['core-marcenaria', 'documentation-2d', 'production', 'cut-plan'],
  profissional: [
    'core-marcenaria',
    'documentation-2d',
    'technical-project',
    'production',
    'cut-plan',
  ],
  equipe: [
    'core-marcenaria',
    'documentation-2d',
    'technical-project',
    'production',
    'cut-plan',
    'team',
    'white-label',
  ],
};

export function getExperienceProfile(audience: ProductAudience): ExperienceProfile {
  return EXPERIENCE_PROFILES[audience];
}

export function getCommercialPlan(planId: CommercialPlanId): CommercialPlan {
  return COMMERCIAL_PLANS[planId];
}

export function audienceHasCapability(
  audience: ProductAudience,
  capability: ProductCapability,
): boolean {
  return CAPABILITY_MATRIX[audience].includes(capability);
}
