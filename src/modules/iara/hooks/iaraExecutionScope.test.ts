import { describe, expect, it } from 'vitest';
import { isIaraCommandForExecution, isIaraExecutionCurrent, type IaraExecutionIdentity } from './iaraExecutionScope';

const execution = (projectId: string, correlationId: string, generation: number): IaraExecutionIdentity => ({ projectId, correlationId, generation });

const command = (projectId: string, correlationId: string) => ({ payload: { projectId, correlationId } });

describe('IARA execution isolation', () => {
  it('rejects a Project A result after switching to Project B', () => {
    const a = execution('A', 'corr-a', 1);
    expect(isIaraExecutionCurrent(a, 'B', 2)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-a'), a)).toBe(true);
  });

  it('rejects the first Project A execution after A → B → A', () => {
    const firstA = execution('A', 'corr-first-a', 1);
    const secondA = execution('A', 'corr-second-a', 3);
    expect(isIaraExecutionCurrent(firstA, 'A', secondA.generation)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-first-a'), secondA)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-second-a'), secondA)).toBe(true);
  });

  it('accepts the current Project A render identity', () => {
    const current = execution('A', 'corr-a', 7);
    expect(isIaraExecutionCurrent(current, 'A', 7)).toBe(true);
    expect(isIaraCommandForExecution(command('A', 'corr-a'), current)).toBe(true);
  });

  it('keeps text-only render execution identity independent of an image requirement', () => {
    const textRender = execution('A', 'corr-text-render', 4);
    expect(isIaraExecutionCurrent(textRender, 'A', 4)).toBe(true);
    expect(isIaraCommandForExecution(command('A', 'corr-text-render'), textRender)).toBe(true);
  });

  it('keeps concurrent executions for different projects isolated', () => {
    const a = execution('A', 'corr-a', 1);
    const b = execution('B', 'corr-b', 2);
    expect(isIaraCommandForExecution(command('A', 'corr-a'), a)).toBe(true);
    expect(isIaraCommandForExecution(command('B', 'corr-b'), b)).toBe(true);
    expect(isIaraCommandForExecution(command('A', 'corr-a'), b)).toBe(false);
    expect(isIaraCommandForExecution(command('B', 'corr-b'), a)).toBe(false);
  });

  it('rejects stale command identity so no result metadata can be associated with the active project', () => {
    const stale = execution('A', 'corr-stale', 1);
    const active = execution('B', 'corr-active', 2);
    expect(isIaraCommandForExecution(command('A', 'corr-stale'), active)).toBe(false);
    expect(isIaraCommandForExecution(command('B', 'corr-active'), active)).toBe(true);
    expect(isIaraExecutionCurrent(stale, active.projectId, active.generation)).toBe(false);
  });
});
