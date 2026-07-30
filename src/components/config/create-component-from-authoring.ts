import { createVizSettingDefaults } from '@viz-engine/components-core';
import type { VizComponentDefinition } from '@viz-engine/contracts';
import type { Comp } from './create-component';

export const createEditorCompFromDefinition = (
  definition: VizComponentDefinition,
): Comp => {
  if (!definition.authoring) {
    throw new Error(
      `Component "${definition.id}" does not declare a portable authoring schema.`,
    );
  }

  const authoring = structuredClone(definition.authoring);
  return {
    id: definition.id,
    componentId: definition.id,
    name: definition.name,
    description: definition.description ?? '',
    authoring,
    defaultValues: createVizSettingDefaults(authoring.settings),
    ...(authoring.presets === undefined
      ? {}
      : { presets: structuredClone(authoring.presets) }),
    ...(authoring.defaultNetworks === undefined
      ? {}
      : {
          defaultNetworks: structuredClone(
            authoring.defaultNetworks,
          ) as Comp['defaultNetworks'],
        }),
  };
};
