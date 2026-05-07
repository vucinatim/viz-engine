import type { VizComponentDefinition } from "@viz-engine/contracts";

export interface VizComponentRegistry {
  get(id: string): VizComponentDefinition | undefined;
  list(): VizComponentDefinition[];
}

export const createVizComponentRegistry = (
  components: VizComponentDefinition[],
): VizComponentRegistry => {
  const componentMap = new Map(components.map((component) => [component.id, component]));

  return {
    get: (id) => componentMap.get(id),
    list: () => components,
  };
};
