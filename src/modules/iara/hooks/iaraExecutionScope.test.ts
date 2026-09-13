import { describe, expect, it } from 'vitest';
import { isIaraCommandForExecution, isIaraExecutionCurrent, type IaraExecutionIdentity } from './iaraExecutionScope';

const context = (projectId: string, environmentId: string | null = 'E1', versionId: string | null = 'V1') => ({ projectId, environmentId, versionId });
const execution = (projectId: string, correlationId: string, generation: number, environmentId = 'E1', versionId = 'V1'): IaraExecutionIdentity => ({ projectId, environmentId, versionId, correlationId, generation });
const command = (projectId: string, correlationId: string, environmentId = 'E1', versionId = 'V1') => ({ payload: { projectId, environmentId, versionId, correlationId } });

describe('IARA execution isolation', () => {
  it('rejects a Project A result after switching to Project B', () => {
    const a = execution('A', 'corr-a', 1);
    expect(isIaraExecutionCurrent(a, context('B'), 2)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-a'), a)).toBe(true);
  });

  it('rejects the first Project A execution after A → B → A', () => {
    const firstA = execution('A', 'corr-first-a', 1);
    const secondA = execution('A', 'corr-second-a', 3);
    expect(isIaraExecutionCurrent(firstA, context('A'), secondA.generation)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-first-a'), secondA)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-second-a'), secondA)).toBe(true);
  });

  it('rejects a stale result when only the environment changes', () => {
    const first = execution('A', 'corr-a', 1, 'Kitchen', 'V1');
    expect(isIaraExecutionCurrent(first, context('A', 'Bedroom', 'V1'), 2)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-a', 'Kitchen', 'V1'), execution('A', 'corr-a', 1, 'Bedroom', 'V1'))).toBe(false);
  });

  it('rejects a stale result when only the version changes', () => {
    const first = execution('A', 'corr-a', 1, 'Kitchen', 'V1');
    expect(isIaraExecutionCurrent(first, context('A', 'Kitchen', 'V2'), 2)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-a', 'Kitchen', 'V1'), execution('A', 'corr-a', 2, 'Kitchen', 'V2'))).toBe(false);
  });

  it('accepts the current Project A render identity', () => {
    const current = execution('A', 'corr-a', 7);
    expect(isIaraExecutionCurrent(current, context('A'), 7)).toBe(true);
    expect(isIaraCommandForExecution(command('A', 'corr-a'), current)).toBe(true);
  });

  it('keeps text-only render execution identity independent of an image requirement', () => {
    const textRender = execution('A', 'corr-text-render', 4);
    expect(isIaraExecutionCurrent(textRender, context('A'), 4)).toBe(true);
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

  it('requires the complete project/environment/version identity for a command', () => {
    const active = execution('A', 'corr-active', 2, 'E1', 'V2');
    expect(isIaraCommandForExecution(command('A', 'corr-active', 'E1', 'V2'), active)).toBe(true);
    expect(isIaraCommandForExecution(command('A', 'corr-active', 'E2', 'V2'), active)).toBe(false);
    expect(isIaraCommandForExecution(command('A', 'corr-active', 'E1', 'V1'), active)).toBe(false);
  });
});
