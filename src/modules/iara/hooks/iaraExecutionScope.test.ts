import { describe, expect, it } from 'vitest';
import { advanceIaraExecutionScope, isCurrentIaraExecutionScope, type IaraExecutionScope } from './iaraExecutionScope';

describe('IARA execution scope', () => {
  it('invalidates A when the active project changes to B and then C', () => {
    let current: IaraExecutionScope = { userId: 'user-1', projectId: 'project-a', generation: 0 };
    const requestA = current;

    current = advanceIaraExecutionScope(current, 'user-1', 'project-b');
    expect(isCurrentIaraExecutionScope(current, requestA)).toBe(false);

    const requestB = current;
    current = advanceIaraExecutionScope(current, 'user-1', 'project-c');
    expect(isCurrentIaraExecutionScope(current, requestB)).toBe(false);
    expect(isCurrentIaraExecutionScope(current, requestA)).toBe(false);
  });

  it('keeps the same generation for work that remains in the same project', () => {
    const initial: IaraExecutionScope = { userId: 'user-1', projectId: 'project-a', generation: 4 };
    const current = advanceIaraExecutionScope(initial, 'user-1', 'project-a');
    expect(current).toEqual(initial);
    expect(isCurrentIaraExecutionScope(current, initial)).toBe(true);
  });

  it('invalidates stale work when the authenticated user changes', () => {
    const request: IaraExecutionScope = { userId: 'user-1', projectId: 'project-a', generation: 2 };
    const current = advanceIaraExecutionScope(request, 'user-2', 'project-a');
    expect(current.generation).toBe(3);
    expect(isCurrentIaraExecutionScope(current, request)).toBe(false);
  });
});
