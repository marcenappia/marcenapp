import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_MATRIX,
  COMMERCIAL_PLANS,
  EXPERIENCE_PROFILES,
  MARCENARIA_WORKFLOW,
  audienceHasCapability,
  getCommercialPlan,
  getExperienceProfile,
} from './productArchitecture';

describe('product architecture', () => {
  it('keeps one shared marcenaria workflow for every audience', () => {
    expect(MARCENARIA_WORKFLOW).toEqual([
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
    ]);
  });

  it('keeps the simple audience guided and hides technical controls', () => {
    const profile = getExperienceProfile('marceneiro');

    expect(profile.interaction).toBe('guided');
    expect(profile.technicalDepth).toBe('essential');
    expect(profile.showTechnicalControls).toBe(false);
    expect(profile.showAdvancedDocumentation).toBe(false);
  });

  it('prepares a technical audience without creating a second product', () => {
    const profile = getExperienceProfile('profissional');

    expect(profile.interaction).toBe('direct');
    expect(profile.technicalDepth).toBe('technical');
    expect(audienceHasCapability('profissional', 'technical-project')).toBe(true);
    expect(audienceHasCapability('profissional', 'core-marcenaria')).toBe(true);
  });

  it('keeps team and white-label capabilities reserved for the future studio tier', () => {
    expect(audienceHasCapability('equipe', 'team')).toBe(true);
    expect(audienceHasCapability('equipe', 'white-label')).toBe(true);
    expect(audienceHasCapability('profissional', 'white-label')).toBe(false);
  });

  it('keeps pricing as non-billing domain configuration', () => {
    expect(Object.values(COMMERCIAL_PLANS).every((plan) => plan.billingEnabled === false)).toBe(true);
    expect(getCommercialPlan('inicio').monthlyPriceBRL).toBe(79);
    expect(getCommercialPlan('pro').monthlyPriceBRL).toBe(179);
    expect(getCommercialPlan('studio').monthlyPriceBRL).toBe(349);
    expect(getCommercialPlan('enterprise').monthlyPriceBRL).toBeNull();
  });

  it('defines a profile for every audience', () => {
    expect(Object.keys(EXPERIENCE_PROFILES)).toEqual(['marceneiro', 'profissional', 'equipe']);
  });

  it('keeps the capability matrix explicit', () => {
    expect(CAPABILITY_MATRIX.marceneiro).toContain('core-marcenaria');
    expect(CAPABILITY_MATRIX.profissional).toContain('documentation-2d');
    expect(CAPABILITY_MATRIX.equipe).toContain('white-label');
  });
});
