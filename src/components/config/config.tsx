import type {
  VizComponentGroupSetting,
  VizComponentSettingCondition,
  VizComponentSettingDefinition,
} from '@viz-engine/contracts';
import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import { ColorPickerPopover } from '../ui/color-picker';
import FileInput, { type FileInputSelection } from '../ui/file-input';
import { Input } from '../ui/input';
import { ListEditor } from '../ui/list-editor';
import { SimpleSelect } from '../ui/select';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import Vector3Input from '../ui/vector3-input';
import type { NodeHandleType } from './node-types';

export type ComponentSettingValues = Record<string, unknown>;

const getValueAtPath = (
  values: ComponentSettingValues,
  path: string,
): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null
          ? (current as ComponentSettingValues)[segment]
          : undefined,
      values,
    );

export const isSettingVisible = (
  condition: VizComponentSettingCondition | undefined,
  values: ComponentSettingValues,
): boolean => {
  if (condition === undefined) {
    return true;
  }
  if ('conditions' in condition) {
    const matches = (child: VizComponentSettingCondition) =>
      isSettingVisible(child, values);
    return condition.operator === 'all'
      ? condition.conditions.every(matches)
      : condition.conditions.some(matches);
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

export const findComponentSetting = (
  group: VizComponentGroupSetting,
  path: string,
): VizComponentSettingDefinition | undefined => {
  const segments = path.split('.');
  let setting: VizComponentSettingDefinition = group;
  for (const segment of segments) {
    if (setting.kind !== 'group') {
      return undefined;
    }
    const child: VizComponentSettingDefinition | undefined =
      setting.fields[segment];
    if (!child) {
      return undefined;
    }
    setting = child;
  }
  return setting;
};

const listComponentSettingPaths = (
  group: VizComponentGroupSetting,
  prefix = '',
): string[] =>
  Object.entries(group.fields).flatMap(([key, setting]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return setting.kind === 'group'
      ? listComponentSettingPaths(setting, path)
      : setting.kind === 'action'
        ? []
        : [path];
  });

export const createComponentParameterId = (
  layerId: string,
  path: string | readonly string[],
): string =>
  `${layerId}:${(typeof path === 'string' ? path.split('.') : path).join(':')}`;

export const listComponentParameterIds = (
  layerId: string,
  group: VizComponentGroupSetting,
): string[] =>
  listComponentSettingPaths(group).map((path) =>
    createComponentParameterId(layerId, path),
  );

const settingTypes: Record<
  Exclude<VizComponentSettingDefinition['kind'], 'group'>,
  NodeHandleType
> = {
  number: 'number',
  text: 'string',
  boolean: 'number',
  color: 'color',
  select: 'string',
  file: 'file',
  vector3: 'vector3',
  list: 'object',
  action: 'string',
};

export const getSettingNodeHandleType = (
  setting: Exclude<VizComponentSettingDefinition, VizComponentGroupSetting>,
): NodeHandleType => settingTypes[setting.kind];

export interface ComponentSettingControlProps {
  setting: Exclude<
    VizComponentSettingDefinition,
    VizComponentGroupSetting | { kind: 'action' }
  >;
  value: unknown;
  onChange: (value: unknown) => void;
  onTransientChange?: (value: unknown) => void;
  onCommit?: (value: unknown) => void;
  onGestureStart?: () => void;
  onGestureCancel?: () => void;
  onAssetSelect?: (selection: FileInputSelection) => Promise<string>;
}

export const ComponentSettingControl = ({
  setting,
  value,
  onChange,
  onTransientChange,
  onCommit,
  onGestureStart,
  onGestureCancel,
  onAssetSelect,
}: ComponentSettingControlProps): ReactNode => {
  switch (setting.kind) {
    case 'number':
      return (
        <Slider
          value={value as number}
          className="w-full"
          onChange={onChange}
          onTransientChange={onTransientChange}
          onCommit={onCommit}
          onGestureStart={onGestureStart}
          onGestureCancel={onGestureCancel}
          min={setting.min}
          max={setting.max}
          step={setting.step}
        />
      );
    case 'color':
      return (
        <ColorPickerPopover
          value={value as string}
          onChange={onChange}
          onTransientChange={onTransientChange}
          onCommit={onCommit}
          onGestureStart={onGestureStart}
          onGestureCancel={onGestureCancel}
        />
      );
    case 'text':
      return (
        <Input
          value={value as string}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'file':
      return (
        <FileInput
          value={value as string}
          acceptExtensions={setting.allowedExtensions}
          onAssetSelect={async (selection) => {
            if (!onAssetSelect) {
              throw new Error('File attachment is not available in this host.');
            }
            return onAssetSelect(selection);
          }}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <Switch checked={value as boolean} onClick={() => onChange(!value)} />
      );
    case 'select':
      return (
        <SimpleSelect
          value={value as string}
          onChange={onChange}
          options={setting.options}
        />
      );
    case 'vector3':
      return (
        <Vector3Input
          value={value as { x: number; y: number; z: number }}
          onChange={onChange}
          onTransientChange={onTransientChange}
          onCommit={onCommit}
          onGestureStart={onGestureStart}
          onGestureCancel={onGestureCancel}
          min={setting.min}
          max={setting.max}
          step={setting.step}
          labelSuffix={
            setting.label.toLowerCase().includes('rotation') ? '°' : undefined
          }
        />
      );
    case 'list':
      return (
        <ListEditor<unknown>
          value={(value as unknown[]) ?? setting.defaultValue}
          onChange={onChange}
          renderItem={(item, _index, onItemChange) => (
            <ComponentSettingControl
              setting={setting.item}
              value={item}
              onChange={onItemChange}
            />
          )}
          createDefaultItem={() => structuredClone(setting.item.defaultValue)}
          itemLabel={setting.itemLabel ?? setting.item.label}
        />
      );
  }
};

export const ComponentActionControl = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): ReactNode => (
  <Button onClick={onPress} variant="outline" className="w-full">
    {label}
  </Button>
);
