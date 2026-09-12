export interface IaraExecutionScope {
  userId: string | null;
  clientId: string | null;
  projectId: string | null;
  environmentId: string | null;
  versionId: string | null;
  generation: number;
}

export function advanceIaraExecutionScope(
  previous: IaraExecutionScope,
  next: Omit<IaraExecutionScope, 'generation'>,
): IaraExecutionScope {
  if (
    previous.userId === next.userId &&
    previous.clientId === next.clientId &&
    previous.projectId === next.projectId &&
    previous.environmentId === next.environmentId &&
    previous.versionId === next.versionId
  ) return previous;

  return { ...next, generation: previous.generation + 1 };
}

export function isCurrentIaraExecutionScope(
  current: IaraExecutionScope,
  captured: IaraExecutionScope,
): boolean {
  return current.generation === captured.generation
    && current.userId === captured.userId
    && current.clientId === captured.clientId
    && current.projectId === captured.projectId
    && current.environmentId === captured.environmentId
    && current.versionId === captured.versionId;
}
