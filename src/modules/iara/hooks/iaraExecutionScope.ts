export type IaraExecutionIdentity = {
  projectId: string | null;
  correlationId: string;
  generation: number;
};

export type IaraCommandIdentity = {
  projectId?: unknown;
  correlationId?: unknown;
};

export function isIaraExecutionCurrent(identity: IaraExecutionIdentity, projectId: string | null, generation: number): boolean {
  return identity.projectId === projectId && identity.generation === generation;
}

export function isIaraCommandForExecution(command: { payload?: IaraCommandIdentity }, identity: IaraExecutionIdentity): boolean {
  return command.payload?.projectId === identity.projectId && command.payload?.correlationId === identity.correlationId;
}
