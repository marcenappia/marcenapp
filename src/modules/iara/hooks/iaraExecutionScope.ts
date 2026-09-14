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
    && command.payload?.correlationId === identity.correlationId;
}
