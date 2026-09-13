import { describe, expect, it } from 'vitest';
import { contextIdentity, isIaraContextCompatible } from './iaraContext';

describe('IARA full context identity', () => {
  it('binds client/project/environment/version into one stable identity', () => {
    expect(contextIdentity({ projectId: 'P1', environmentId: 'E1', versionId: 'V3' })).toBe('P1:E1:V3');
  });

  it('keeps two projects isolated', () => {
    expect(isIaraContextCompatible({ projectId: 'A', environmentId: 'E1', versionId: 'V1' }, { projectId: 'B', environmentId: 'E1', versionId: 'V1' })).toBe(false);
  });

  it('keeps environments isolated inside one project', () => {
    expect(isIaraContextCompatible({ projectId: 'A', environmentId: 'E1', versionId: 'V1' }, { projectId: 'A', environmentId: 'E2', versionId: 'V1' })).toBe(false);
  });

  it('keeps versions isolated inside one environment', () => {
    expect(isIaraContextCompatible({ projectId: 'A', environmentId: 'E1', versionId: 'V1' }, { projectId: 'A', environmentId: 'E1', versionId: 'V2' })).toBe(false);
  });

  it('accepts the same complete context', () => {
    expect(isIaraContextCompatible({ projectId: 'A', environmentId: 'E1', versionId: 'V2' }, { projectId: 'A', environmentId: 'E1', versionId: 'V2' })).toBe(true);
  });
});
