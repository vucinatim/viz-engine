import type {
  VizComponentDefinition,
  VizComponentSettingCondition,
  VizComponentSettingDefinition,
} from '@viz-engine/contracts';
import {
  GroupConfigOption,
  v,
  type BaseConfigOption,
  type ConfigParam,
} from './config';
import type { Comp } from './create-component';

const getValueAtPath = (
  value: Record<string, unknown>,
  path: string,
): unknown => {
  let current: unknown = value;

  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const evaluateVizSettingCondition = (
  condition: VizComponentSettingCondition,
  values: Record<string, unknown>,
): boolean => {
  if ('conditions' in condition) {
    return condition.operator === 'all'
      ? condition.conditions.every((child) =>
          evaluateVizSettingCondition(child, values),
        )
      : condition.conditions.some((child) =>
          evaluateVizSettingCondition(child, values),
        );
  }

  const actual = getValueAtPath(values, condition.path);

  switch (condition.operator) {
    case 'equals':
      return actual === condition.value;
    case 'not-equals':
      return actual !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case 'not-in':
      return (
        Array.isArray(condition.value) && !condition.value.includes(actual)
      );
  }
};

const toVisibleIf = (condition: VizComponentSettingCondition | undefined) =>
  condition === undefined
    ? undefined
    : (values: Record<string, unknown>) =>
        evaluateVizSettingCondition(condition, values);

const setAnimatable = <T extends ConfigParam<unknown>>(
  option: T,
  animatable: boolean | undefined,
): T => {
  if (animatable !== undefined) {
    option.isAnimatable = animatable;
  }
  return option;
};

const toEditorConfigOption = (
  definition: VizComponentSettingDefinition,
): BaseConfigOption<unknown> => {
  const meta = {
    label: definition.label,
    ...(definition.description === undefined
      ? {}
      : { description: definition.description }),
    ...(definition.visibleWhen === undefined
      ? {}
      : { visibleIf: toVisibleIf(definition.visibleWhen) }),
  };

  switch (definition.kind) {
    case 'number':
      return setAnimatable(
        v.number({
          ...meta,
          defaultValue: definition.defaultValue,
          min: definition.min,
          max: definition.max,
          ...(definition.step === undefined ? {} : { step: definition.step }),
        }),
        definition.animatable,
      );
    case 'text':
      return setAnimatable(
        v.text({
          ...meta,
          defaultValue: definition.defaultValue,
        }),
        definition.animatable,
      );
    case 'boolean':
      return setAnimatable(
        v.toggle({
          ...meta,
          defaultValue: definition.defaultValue,
        }),
        definition.animatable,
      );
    case 'color':
      return setAnimatable(
        v.color({
          ...meta,
          defaultValue: definition.defaultValue,
        }),
        definition.animatable,
      );
    case 'select':
      return setAnimatable(
        v.select({
          ...meta,
          defaultValue: definition.defaultValue,
          options: [...definition.options],
        }),
        definition.animatable,
      );
    case 'file':
      return v.file({
        ...meta,
        defaultValue: definition.defaultValue,
        ...(definition.allowedExtensions === undefined
          ? {}
          : { allowedExtensions: [...definition.allowedExtensions] }),
      });
    case 'vector3':
      return setAnimatable(
        v.vector3({
          ...meta,
          defaultValue: { ...definition.defaultValue },
          ...(definition.min === undefined ? {} : { min: definition.min }),
          ...(definition.max === undefined ? {} : { max: definition.max }),
          ...(definition.step === undefined ? {} : { step: definition.step }),
        }),
        definition.animatable,
      );
    case 'list': {
      const itemConfig = toEditorConfigOption(definition.item);
      if (!('type' in itemConfig)) {
        throw new Error(
          `List setting "${definition.label}" has an unsupported item definition.`,
        );
      }
      return v.list({
        ...meta,
        defaultValue: structuredClone(definition.defaultValue),
        itemConfig: itemConfig as ConfigParam<unknown>,
        ...(definition.itemLabel === undefined
          ? {}
          : { itemLabel: definition.itemLabel }),
      });
    }
    case 'action':
      return v.button({
        ...meta,
        ...(definition.buttonLabel === undefined
          ? {}
          : { buttonLabel: definition.buttonLabel }),
        onPress: () => {
          // Host actions are attached explicitly by the editor runtime host.
        },
      });
    case 'group':
      return v.group(
        meta,
        Object.fromEntries(
          Object.entries(definition.fields).map(([key, child]) => [
            key,
            toEditorConfigOption(child),
          ]),
        ),
      );
  }
};

export const createEditorCompFromDefinition = (
  definition: VizComponentDefinition,
): Comp => {
  const authoring = definition.authoring;

  if (authoring === undefined) {
    throw new Error(
      `Component "${definition.id}" does not declare a portable authoring schema.`,
    );
  }

  const root = toEditorConfigOption(authoring.settings);
  if (!(root instanceof GroupConfigOption)) {
    throw new Error(
      `Component "${definition.id}" authoring schema must have a root group.`,
    );
  }

  const editorConfig = v.config(root.options);

  return {
    id: definition.id,
    componentId: definition.id,
    name: definition.name,
    description: definition.description ?? '',
    config: editorConfig,
    defaultValues: editorConfig.getDefaultValues(),
    ...(authoring.presets === undefined
      ? {}
      : {
          presets: authoring.presets.map((preset) => ({
            name: preset.name,
            values: structuredClone(preset.values),
            ...(preset.networks === undefined
              ? {}
              : { networks: { ...preset.networks } }),
          })),
        }),
    ...(authoring.defaultNetworks === undefined
      ? {}
      : {
          defaultNetworks: structuredClone(
            authoring.defaultNetworks,
          ) as Comp['defaultNetworks'],
        }),
  };
};
