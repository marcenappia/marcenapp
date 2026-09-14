import { describe, expect, it } from 'vitest';
import { isIaraCommandExecutionCurrent, isIaraCommandForExecution, isIaraExecutionCurrent, type IaraExecutionIdentity } from './iaraExecutionScope';

const context = (userId: string, projectId: string, environmentId: string | null = 'E1', versionId: string | null = 'V1') => ({ userId, projectId, environmentId, versionId });
const execution = (userId: string, projectId: string, correlationId: string, generation: number, environmentId = 'E1', versionId = 'V1'): IaraExecutionIdentity => ({ userId, projectId, environmentId, versionId, correlationId, generation });
const command = (userId: string, projectId: string, correlationId: string, environmentId = 'E1', versionId = 'V1', generation?: number) => ({ payload: { userId, projectId, environmentId, versionId, correlationId, ...(typeof generation === 'number' ? { generation } : {}) } });

describe('IARA execution isolation', () => {
  it('rejects a Project A result after switching to Project B', () => {
    const a = execution('U1', 'A', 'corr-a', 1);
    expect(isIaraExecutionCurrent(a, context('U1', 'B'), 2)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-a'), a)).toBe(true);
  });

  it('rejects the first Project A execution after A → B → A', () => {
    const firstA = execution('U1', 'A', 'corr-first-a', 1);
    const secondA = execution('U1', 'A', 'corr-second-a', 3);
    expect(isIaraExecutionCurrent(firstA, context('U1', 'A'), secondA.generation)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-first-a'), secondA)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-second-a'), secondA)).toBe(true);
  });

  it('rejects a stale result when only the environment changes', () => {
    const first = execution('U1', 'A', 'corr-a', 1, 'Kitchen', 'V1');
    expect(isIaraExecutionCurrent(first, context('U1', 'A', 'Bedroom', 'V1'), 2)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-a', 'Kitchen', 'V1'), execution('U1', 'A', 'corr-a', 1, 'Bedroom', 'V1'))).toBe(false);
  });

  it('rejects a stale result when only the version changes', () => {
    const first = execution('U1', 'A', 'corr-a', 1, 'Kitchen', 'V1');
    expect(isIaraExecutionCurrent(first, context('U1', 'A', 'Kitchen', 'V2'), 2)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-a', 'Kitchen', 'V1'), execution('U1', 'A', 'corr-a', 2, 'Kitchen', 'V2'))).toBe(false);
  });

  it('rejects a stale result after authentication changes', () => {
    const firstUser = execution('U1', 'A', 'corr-a', 1);
    expect(isIaraExecutionCurrent(firstUser, context('U2', 'A'), 2)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-a'), firstUser)).toBe(true);
    expect(isIaraCommandForExecution(command('U2', 'A', 'corr-a'), firstUser)).toBe(false);
  });

  it('accepts the current Project A render identity', () => {
    const current = execution('U1', 'A', 'corr-a', 7);
    expect(isIaraExecutionCurrent(current, context('U1', 'A'), 7)).toBe(true);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-a'), current)).toBe(true);
  });

  it('keeps text-only render execution identity independent of an image requirement', () => {
    const textRender = execution('U1', 'A', 'corr-text-render', 4);
    expect(isIaraExecutionCurrent(textRender, context('U1', 'A'), 4)).toBe(true);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-text-render'), textRender)).toBe(true);
  });

  it('keeps concurrent executions for different projects isolated', () => {
    const a = execution('U1', 'A', 'corr-a', 1);
    const b = execution('U1', 'B', 'corr-b', 2);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-a'), a)).toBe(true);
    expect(isIaraCommandForExecution(command('U1', 'B', 'corr-b'), b)).toBe(true);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-a'), b)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'B', 'corr-b'), a)).toBe(false);
  });

  it('requires the complete user/project/environment/version identity for a command', () => {
    const active = execution('U1', 'A', 'corr-active', 2, 'E1', 'V2');
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-active', 'E1', 'V2'), active)).toBe(true);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-active', 'E2', 'V2'), active)).toBe(false);
    expect(isIaraCommandForExecution(command('U1', 'A', 'corr-active', 'E1', 'V1'), active)).toBe(false);
    expect(isIaraCommandForExecution(command('U2', 'A', 'corr-active', 'E1', 'V2'), active)).toBe(false);
  });

  it('rejects the old A command after A → B → A persisted context changes', () => {
    const oldCommand = command('U1', 'A', 'corr-old-a', 'E1', 'V1', 1);
    const currentContext = { userId: 'U1', projectId: 'A', environmentId: 'E1', versionId: 'V1', correlationId: 'corr-new-a', generation: 3 };
    expect(isIaraCommandExecutionCurrent(oldCommand, currentContext)).toBe(false);
  });

  it('accepts a new A command after returning to A', () => {
    const newCommand = command('U1', 'A', 'corr-new-a', 'E1', 'V1', 3);
    const currentContext = { userId: 'U1', projectId: 'A', environmentId: 'E1', versionId: 'V1', correlationId: 'corr-new-a', generation: 3 };
    expect(isIaraCommandExecutionCurrent(newCommand, currentContext)).toBe(true);
  });

  it('rejects stale commands when project, environment, version or user changes', () => {
    const currentContext = { userId: 'U1', projectId: 'B', environmentId: 'E2', versionId: 'V2', correlationId: 'corr-b', generation: 4 };
    expect(isIaraCommandExecutionCurrent(command('U1', 'A', 'corr-b', 'E2', 'V2', 4), currentContext)).toBe(false);
    expect(isIaraCommandExecutionCurrent(command('U1', 'B', 'corr-b', 'E1', 'V2', 4), currentContext)).toBe(false);
    expect(isIaraCommandExecutionCurrent(command('U1', 'B', 'corr-b', 'E2', 'V1', 4), currentContext)).toBe(false);
    expect(isIaraCommandExecutionCurrent(command('U2', 'B', 'corr-b', 'E2', 'V2', 4), currentContext)).toBe(false);
  });
});
