export type IaraExecutionIdentity = {
  userId: string;
  projectId: string | null;
  environmentId: string | null;
  versionId: string | null;
  correlationId: string;
  generation: number;
};

export type IaraCommandIdentity = {
  userId?: unknown;
  projectId?: unknown;
  environmentId?: unknown;
  versionId?: unknown;
  correlationId?: unknown;
  generation?: unknown;
};

export type IaraPersistedExecutionContext = {
  userId: string | null;
  projectId: string | null;
  environmentId: string | null;
  versionId: string | null;
  correlationId: string | null;
  generation: number | null;
};

export function isIaraExecutionCurrent(identity: IaraExecutionIdentity, context: { userId: string | null; projectId: string | null; environmentId: string | null; versionId: string | null }, generation: number): boolean {
  return identity.userId === context.userId
    && identity.projectId === context.projectId
    && identity.environmentId === context.environmentId
    && identity.versionId === context.versionId
    && identity.generation === generation;
}

export function isIaraCommandForExecution(command: { payload?: IaraCommandIdentity }, identity: IaraExecutionIdentity): boolean {
  return command.payload?.userId === identity.userId
    && command.payload?.projectId === identity.projectId
    && command.payload?.environmentId === identity.environmentId
    && command.payload?.versionId === identity.versionId
    && command.payload?.correlationId === identity.correlationId
    && (typeof command.payload?.generation !== 'number' || command.payload.generation === identity.generation);
}

export function isIaraCommandExecutionCurrent(command: { payload?: IaraCommandIdentity }, current: IaraPersistedExecutionContext): boolean {
  const payload = command.payload;
  if (!payload || typeof payload.userId !== 'string' || typeof payload.correlationId !== 'string') return false;
  const contextMatches = payload.userId === current.userId
    && (payload.projectId ?? null) === current.projectId
    && (payload.environmentId ?? null) === current.environmentId
    && (payload.versionId ?? null) === current.versionId
    && payload.correlationId === current.correlationId;
  if (!contextMatches) return false;
  if (typeof current.generation === 'number' && typeof payload.generation === 'number') return payload.generation === current.generation;
  return true;
}
