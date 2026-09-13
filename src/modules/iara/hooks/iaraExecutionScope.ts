export type IaraExecutionIdentity = {
  projectId: string | null;
  environmentId: string | null;
  versionId: string | null;
  correlationId: string;
  generation: number;
};

export type IaraCommandIdentity = {
  projectId?: unknown;
  environmentId?: unknown;
  versionId?: unknown;
  correlationId?: unknown;
};

export function isIaraExecutionCurrent(identity: IaraExecutionIdentity, context: { projectId: string | null; environmentId: string | null; versionId: string | null }, generation: number): boolean {
  return identity.projectId === context.projectId && identity.environmentId === context.environmentId && identity.versionId === context.versionId && identity.generation === generation;
}

export function isIaraCommandForExecution(command: { payload?: IaraCommandIdentity }, identity: IaraExecutionIdentity): boolean {
  return command.payload?.projectId === identity.projectId
    && command.payload?.environmentId === identity.environmentId
    && command.payload?.versionId === identity.versionId
    && command.payload?.correlationId === identity.correlationId;
}
