import { describe, expect, it } from 'vitest';
import { advanceIaraExecutionScope, isCurrentIaraExecutionScope, type IaraExecutionScope } from './iaraExecutionScope';

const scope = (overrides: Partial<Omit<IaraExecutionScope, 'generation'>> = {}): Omit<IaraExecutionScope, 'generation'> => ({
  userId: 'user-1',
  clientId: 'client-1',
  projectId: 'project-a',
  environmentId: 'kitchen',
  versionId: 'version-1',
  ...overrides,
});

describe('IARA execution scope', () => {
  it('invalidates stale work when project changes immediately', () => {
    let current: IaraExecutionScope = { ...scope(), generation: 0 };
    const requestA = current;
    current = advanceIaraExecutionScope(current, { ...scope(), projectId: 'project-b', environmentId: 'suite', versionId: 'version-1' });
    expect(isCurrentIaraExecutionScope(current, requestA)).toBe(false);
  });

  it('invalidates stale work when environment changes immediately', () => {
    let current: IaraExecutionScope = { ...scope(), generation: 2 };
    const requestKitchen = current;
    current = advanceIaraExecutionScope(current, { ...scope(), environmentId: 'suite', versionId: 'version-2' });
    expect(isCurrentIaraExecutionScope(current, requestKitchen)).toBe(false);
  });

  it('invalidates stale work when version changes immediately', () => {
    let current: IaraExecutionScope = { ...scope(), generation: 4 };
    const requestV1 = current;
    current = advanceIaraExecutionScope(current, { ...scope(), versionId: 'version-2' });
    expect(isCurrentIaraExecutionScope(current, requestV1)).toBe(false);
  });

  it('keeps the same generation when the full scope is unchanged', () => {
    const initial: IaraExecutionScope = { ...scope(), generation: 4 };
    const current = advanceIaraExecutionScope(initial, scope());
    expect(current).toEqual(initial);
    expect(isCurrentIaraExecutionScope(current, initial)).toBe(true);
  });

  it('invalidates stale work when the authenticated user or client changes', () => {
    const request: IaraExecutionScope = { ...scope(), generation: 2 };
    const current = advanceIaraExecutionScope(request, scope({ userId: 'user-2', clientId: 'client-2' }));
    expect(current.generation).toBe(3);
    expect(isCurrentIaraExecutionScope(current, request)).toBe(false);
  });
});
