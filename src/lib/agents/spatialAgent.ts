import { executeSpatialAgent } from './spatialRuntime';
import type { AgentDefinition, AgentId } from './types';

export function createSpatialAgent(
  id: Extract<AgentId, 'vision' | 'perspective' | 'measurement' | 'measurement_prediction' | 'multiview' | 'furniture_engineering' | 'render'>,
  name: string,
  capabilities: string[],
  dependencies: AgentId[] = [],
): AgentDefinition {
  return {
    id,
    name,
    capabilities,
    dependencies,
    handle: (task) => executeSpatialAgent(id, task),
  };
}
