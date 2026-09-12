export interface IaraExecutionScope {
  userId: string | null;
  projectId: string | null;
  generation: number;
}

export function advanceIaraExecutionScope(
  previous: IaraExecutionScope,
  userId: string | null,
  projectId: string | null,
): IaraExecutionScope {
  if (previous.userId === userId && previous.projectId === projectId) return previous;
  return { userId, projectId, generation: previous.generation + 1 };
}

export function isCurrentIaraExecutionScope(
  current: IaraExecutionScope,
  captured: IaraExecutionScope,
): boolean {
  return current.generation === captured.generation
    && current.userId === captured.userId
    && current.projectId === captured.projectId;
}
