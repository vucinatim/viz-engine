import type {
  VizComponentActionSetting,
  VizComponentAuthoring,
  VizComponentBooleanSetting,
  VizComponentColorSetting,
  VizComponentDefaultNetwork,
  VizComponentFileSetting,
  VizComponentGroupSetting,
  VizComponentInlineNetworkPreset,
  VizComponentListSetting,
  VizComponentNumberSetting,
  VizComponentPreset,
  VizComponentSelectSetting,
  VizComponentSettingCondition,
  VizComponentSettingConditionOperator,
  VizComponentSettingDefinition,
  VizComponentTextSetting,
  VizComponentVector3Setting,
} from '@viz-engine/contracts';

type SettingMeta = {
  label: string;
  description?: string;
  visibleWhen?: VizComponentSettingCondition;
};

type AnimatableSetting = {
  animatable?: boolean;
};

type NumberSettingOptions = SettingMeta &
  AnimatableSetting & {
    defaultValue: number;
    min: number;
    max: number;
    step?: number;
  };

type TextSettingOptions = SettingMeta &
  AnimatableSetting & {
    defaultValue: string;
  };

type BooleanSettingOptions = SettingMeta &
  AnimatableSetting & {
    defaultValue: boolean;
  };

type ColorSettingOptions = SettingMeta &
  AnimatableSetting & {
    defaultValue: string;
  };

type SelectSettingOptions = SettingMeta &
  AnimatableSetting & {
    defaultValue: string;
    options: string[];
  };

type FileSettingOptions = SettingMeta & {
  defaultValue: string;
  allowedExtensions?: string[];
};

type Vector3SettingOptions = SettingMeta &
  AnimatableSetting & {
    defaultValue: {
      x: number;
      y: number;
      z: number;
    };
    min?: number;
    max?: number;
    step?: number;
  };

type ListSettingOptions = SettingMeta & {
  defaultValue: unknown[];
  itemConfig: Exclude<
    VizComponentSettingDefinition,
    VizComponentGroupSetting | VizComponentActionSetting
  >;
  itemLabel?: string;
};

type ActionSettingOptions = SettingMeta & {
  actionId: string;
  buttonLabel?: string;
};

type ComponentAuthoringInput = {
  componentId: string;
  compatibility?: VizComponentAuthoring['compatibility'];
  category?: string;
  tags?: string[];
  catalogVisibility?: VizComponentAuthoring['catalogVisibility'];
  config: VizComponentGroupSetting;
  presets?: Array<Omit<VizComponentPreset, 'id'> & { id?: string }>;
  defaultNetworks?: Record<string, VizComponentDefaultNetwork>;
};

type DefaultNetworkNodeTuple = readonly [
  id: string,
  label: string,
  position: { x: number; y: number },
  inputValues?: Record<string, unknown>,
];

type DefaultNetworkEdgeTuple = readonly [
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
];

type CompactDefaultNetwork = Omit<
  VizComponentInlineNetworkPreset,
  'nodes' | 'edges'
> & {
  nodes: DefaultNetworkNodeTuple[];
  edges: DefaultNetworkEdgeTuple[];
};

const toKebabCase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const settingCondition = (
  path: string,
  operator: VizComponentSettingConditionOperator,
  value: unknown,
): VizComponentSettingCondition => ({
  path,
  operator,
  value,
});

export const allSettingConditions = (
  ...conditions: VizComponentSettingCondition[]
): VizComponentSettingCondition => ({
  operator: 'all',
  conditions,
});

export const anySettingConditions = (
  ...conditions: VizComponentSettingCondition[]
): VizComponentSettingCondition => ({
  operator: 'any',
  conditions,
});

export const defineVizComponentAuthoring = ({
  componentId,
  compatibility = 'render-safe',
  category,
  tags,
  catalogVisibility,
  config,
  presets,
  defaultNetworks,
}: ComponentAuthoringInput): VizComponentAuthoring => ({
  schemaVersion: 1,
  componentId,
  compatibility,
  settings: config,
  ...(category === undefined ? {} : { category }),
  ...(tags === undefined ? {} : { tags }),
  ...(catalogVisibility === undefined ? {} : { catalogVisibility }),
  ...(presets === undefined
    ? {}
    : {
        presets: presets.map((preset) => ({
          ...preset,
          id: preset.id ?? toKebabCase(preset.name),
        })),
      }),
  ...(defaultNetworks === undefined ? {} : { defaultNetworks }),
});

export const defineDefaultNetwork = ({
  nodes,
  edges,
  ...network
}: CompactDefaultNetwork): VizComponentDefaultNetwork => ({
  ...network,
  nodes: nodes.map(([id, label, position, inputValues]) => ({
    id,
    label,
    position,
    ...(inputValues === undefined ? {} : { inputValues }),
  })),
  edges: edges.map(([source, sourceHandle, target, targetHandle]) => ({
    source,
    sourceHandle,
    target,
    targetHandle,
  })),
});

export const createVizSettingDefaults = (
  group: VizComponentGroupSetting,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(group.fields).map(([key, setting]) => [
      key,
      setting.kind === 'group'
        ? createVizSettingDefaults(setting)
        : setting.kind === 'action'
          ? null
          : structuredClone(setting.defaultValue),
    ]),
  );

export const v = {
  number: (options: NumberSettingOptions): VizComponentNumberSetting => ({
    kind: 'number',
    ...options,
  }),
  color: (options: ColorSettingOptions): VizComponentColorSetting => ({
    kind: 'color',
    ...options,
  }),
  text: (options: TextSettingOptions): VizComponentTextSetting => ({
    kind: 'text',
    ...options,
  }),
  toggle: (options: BooleanSettingOptions): VizComponentBooleanSetting => ({
    kind: 'boolean',
    ...options,
  }),
  select: (options: SelectSettingOptions): VizComponentSelectSetting => ({
    kind: 'select',
    ...options,
  }),
  file: (options: FileSettingOptions): VizComponentFileSetting => ({
    kind: 'file',
    animatable: false,
    ...options,
  }),
  vector3: (options: Vector3SettingOptions): VizComponentVector3Setting => ({
    kind: 'vector3',
    ...options,
  }),
  action: (options: ActionSettingOptions): VizComponentActionSetting => ({
    kind: 'action',
    ...options,
  }),
  list: (options: ListSettingOptions): VizComponentListSetting => ({
    kind: 'list',
    animatable: false,
    item: options.itemConfig,
    defaultValue: options.defaultValue,
    label: options.label,
    ...(options.description === undefined
      ? {}
      : { description: options.description }),
    ...(options.visibleWhen === undefined
      ? {}
      : { visibleWhen: options.visibleWhen }),
    ...(options.itemLabel === undefined
      ? {}
      : { itemLabel: options.itemLabel }),
  }),
  group: (
    meta: SettingMeta,
    fields: Record<string, VizComponentSettingDefinition>,
  ): VizComponentGroupSetting => ({
    kind: 'group',
    fields,
    ...meta,
  }),
  config: (
    fields: Record<string, VizComponentSettingDefinition>,
  ): VizComponentGroupSetting => ({
    kind: 'group',
    label: 'Settings',
    fields,
  }),
};

type FieldExtras = AnimatableSetting & Pick<SettingMeta, 'visibleWhen'>;
type NumberRange = readonly [min: number, max: number, step?: number];

const fieldMeta = (label: string, description?: string): SettingMeta => ({
  label,
  ...(description === undefined ? {} : { description }),
});

/**
 * Compact authoring vocabulary for ordinary declarative fields. `v` remains
 * available for uncommon settings that benefit from explicit option objects.
 */
export const field = {
  number: (
    label: string,
    defaultValue: number,
    [min, max, step]: NumberRange,
    description?: string,
    extras: FieldExtras = {},
  ): VizComponentNumberSetting =>
    v.number({
      ...fieldMeta(label, description),
      defaultValue,
      min,
      max,
      ...(step === undefined ? {} : { step }),
      ...extras,
    }),
  toggle: (
    label: string,
    defaultValue: boolean,
    description?: string,
    extras: FieldExtras = {},
  ): VizComponentBooleanSetting =>
    v.toggle({
      ...fieldMeta(label, description),
      defaultValue,
      ...extras,
    }),
  color: (
    label: string,
    defaultValue: string,
    description?: string,
    extras: FieldExtras = {},
  ): VizComponentColorSetting =>
    v.color({
      ...fieldMeta(label, description),
      defaultValue,
      ...extras,
    }),
  select: (
    label: string,
    defaultValue: string,
    options: string[],
    description?: string,
    extras: FieldExtras = {},
  ): VizComponentSelectSetting =>
    v.select({
      ...fieldMeta(label, description),
      defaultValue,
      options,
      ...extras,
    }),
  text: (
    label: string,
    defaultValue: string,
    description?: string,
    extras: FieldExtras = {},
  ): VizComponentTextSetting =>
    v.text({
      ...fieldMeta(label, description),
      defaultValue,
      ...extras,
    }),
  vector3: (
    label: string,
    defaultValue: { x: number; y: number; z: number },
    range?: NumberRange,
    description?: string,
    extras: FieldExtras = {},
  ): VizComponentVector3Setting => {
    const [min, max, step] = range ?? [];
    return v.vector3({
      ...fieldMeta(label, description),
      defaultValue,
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
      ...(step === undefined ? {} : { step }),
      ...extras,
    });
  },
  file: (
    label: string,
    defaultValue: string,
    allowedExtensions: string[],
    description?: string,
    visibleWhen?: VizComponentSettingCondition,
  ): VizComponentFileSetting =>
    v.file({
      ...fieldMeta(label, description),
      defaultValue,
      allowedExtensions,
      ...(visibleWhen === undefined ? {} : { visibleWhen }),
    }),
  group: (
    label: string,
    description: string | undefined,
    fields: Record<string, VizComponentSettingDefinition>,
  ): VizComponentGroupSetting => v.group(fieldMeta(label, description), fields),
};
