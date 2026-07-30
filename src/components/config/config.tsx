import Color from 'color';
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
import type { AnimInputData } from './node-types';
import { VType } from './types';

interface ConfigMeta {
  label: string;
  description?: string;
  visibleIf?: (allValues: Record<string, unknown>) => boolean;
}

type Vector3 = { x: number; y: number; z: number };
type ValueOptions<T> = ConfigMeta & { defaultValue: T };
type NumberOptions = ValueOptions<number> & {
  min: number;
  max: number;
  step?: number;
};
type Vector3Options = ValueOptions<Vector3> & {
  min?: number;
  max?: number;
  step?: number;
};
type SelectOptions = ValueOptions<string> & { options: string[] };
type FileOptions = ValueOptions<string> & { allowedExtensions?: string[] };
type ListOptions<T> = ValueOptions<T[]> & {
  itemConfig: ConfigParam<T>;
  itemLabel?: string;
};
type ConfigParamOptions<T> =
  | ValueOptions<T>
  | NumberOptions
  | Vector3Options
  | SelectOptions
  | FileOptions
  | ListOptions<unknown>;

const cloneValue = <T,>(value: T): T =>
  typeof value === 'object' && value !== null ? structuredClone(value) : value;

export abstract class BaseConfigOption<T> {
  id = '';
  label: string;
  description?: string;
  visibleIf?: ConfigMeta['visibleIf'];

  constructor({ label, description, visibleIf }: ConfigMeta) {
    this.label = label;
    this.description = description;
    this.visibleIf = visibleIf;
  }

  abstract getValue(inputData: AnimInputData): T;
  abstract setValue(value: T): void;
  abstract getDefaultValue(): T;
  abstract clone(): BaseConfigOption<T>;
  abstract toFormElement(
    value: T | null,
    onChange: (value: T) => void,
    onDragStart?: () => void,
    onDragEnd?: () => void,
    onAssetSelect?: (selection: FileInputSelection) => Promise<T>,
  ): ReactNode;
}

export class ConfigParam<T> extends BaseConfigOption<T> {
  value: T;

  constructor(
    readonly options: ConfigParamOptions<T>,
    readonly type: VType,
    public isAnimatable = true,
  ) {
    super(options);
    this.value = cloneValue(options.defaultValue) as T;
  }

  getValue(_inputData: AnimInputData): T {
    return this.value;
  }

  setValue(value: T): void {
    this.value = value;
  }

  getDefaultValue(): T {
    return cloneValue(this.value);
  }

  clone(): ConfigParam<T> {
    const options = {
      ...this.options,
      defaultValue: cloneValue(this.value),
      ...('itemConfig' in this.options
        ? { itemConfig: this.options.itemConfig.clone() }
        : {}),
    } as ConfigParamOptions<T>;
    return new ConfigParam(options, this.type, this.isAnimatable);
  }

  validate(value: T): boolean {
    if (this.type === VType.Number) {
      const options = this.options as NumberOptions;
      const number = value as number;
      return number >= options.min && number <= options.max;
    }
    if (this.type === VType.Color) {
      try {
        Color(value as string);
        return true;
      } catch {
        return false;
      }
    }
    if (this.type === VType.File) {
      const file = value as string;
      const allowed = (this.options as FileOptions).allowedExtensions ?? [];
      if (!file || file.startsWith('asset:') || allowed.length === 0) {
        return true;
      }
      try {
        const pathname = new URL(file, 'http://local').pathname || file;
        return allowed.some((extension) =>
          pathname.toLowerCase().endsWith(extension),
        );
      } catch {
        return allowed.some((extension) =>
          file.toLowerCase().endsWith(extension),
        );
      }
    }
    if (this.type === VType.Select) {
      return (this.options as SelectOptions).options.includes(value as string);
    }
    if (this.type === VType.List) {
      const list = value as unknown[];
      const item = (this.options as ListOptions<unknown>).itemConfig;
      return (
        Array.isArray(list) &&
        list.every((entry) => !item.validate || item.validate(entry))
      );
    }
    return true;
  }

  toFormElement(
    value: T | null,
    onChange: (value: T) => void,
    onDragStart?: () => void,
    onDragEnd?: () => void,
    onAssetSelect?: (selection: FileInputSelection) => Promise<T>,
  ): ReactNode {
    const commit = (next: unknown) => {
      this.value = next as T;
      onChange(next as T);
    };

    switch (this.type) {
      case VType.Number: {
        const options = this.options as NumberOptions;
        return (
          <Slider
            value={value as number}
            className="w-full"
            onChange={commit}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            min={options.min}
            max={options.max}
            step={options.step}
          />
        );
      }
      case VType.Color:
        return <ColorPickerPopover value={value as string} onChange={commit} />;
      case VType.String:
        return (
          <Input
            value={value as string}
            onChange={(event) => commit(event.target.value)}
          />
        );
      case VType.File: {
        const options = this.options as FileOptions;
        return (
          <FileInput
            value={value as string}
            acceptExtensions={options.allowedExtensions}
            onAssetSelect={async (selection) => {
              if (!onAssetSelect) {
                throw new Error(
                  'File attachment is not available in this host.',
                );
              }
              const next = await onAssetSelect(selection);
              this.value = next;
              return next as string;
            }}
            onChange={commit}
          />
        );
      }
      case VType.Boolean:
        return (
          <Switch checked={value as boolean} onClick={() => commit(!value)} />
        );
      case VType.Select:
        return (
          <SimpleSelect
            value={value as string}
            onChange={commit}
            options={(this.options as SelectOptions).options}
          />
        );
      case VType.Vector3: {
        const options = this.options as Vector3Options;
        return (
          <Vector3Input
            value={value as Vector3}
            onChange={commit}
            min={options.min}
            max={options.max}
            step={options.step}
            labelSuffix={
              this.label.toLowerCase().includes('rotation') ? '°' : undefined
            }
          />
        );
      }
      case VType.List: {
        const options = this.options as ListOptions<unknown>;
        return (
          <ListEditor<unknown>
            value={(value as unknown[]) ?? options.defaultValue}
            onChange={commit}
            renderItem={(item, _index, onItemChange) =>
              options.itemConfig.toFormElement(item, onItemChange)
            }
            createDefaultItem={() => options.itemConfig.getDefaultValue()}
            itemLabel={options.itemLabel ?? options.itemConfig.label}
          />
        );
      }
      default:
        return null;
    }
  }
}

type ButtonConfigOptions = ConfigMeta & {
  buttonLabel?: string;
  onPress: () => void;
};

export class ButtonConfigOption extends BaseConfigOption<null> {
  onPress: () => void;

  constructor(readonly options: ButtonConfigOptions) {
    super(options);
    this.onPress = options.onPress;
  }

  getValue(): null {
    return null;
  }

  setValue(): void {}

  getDefaultValue(): null {
    return null;
  }

  clone(): ButtonConfigOption {
    return new ButtonConfigOption(this.options);
  }

  toFormElement(_value?: null, _onChange?: (value: null) => void): ReactNode {
    return (
      <Button onClick={this.onPress} variant="outline" className="w-full">
        {this.options.buttonLabel ?? this.label}
      </Button>
    );
  }
}

type ConfigOptions = Record<string, BaseConfigOption<unknown>>;

const cloneOptions = <T extends ConfigOptions>(options: T): T =>
  Object.fromEntries(
    Object.entries(options).map(([key, option]) => [key, option.clone()]),
  ) as T;

const getOptionValues = (
  options: ConfigOptions,
  inputData: AnimInputData,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(options).map(([key, option]) => [
      key,
      option.getValue(inputData),
    ]),
  );

const setOptionValues = (
  options: ConfigOptions,
  values: Record<string, unknown>,
): void => {
  for (const [key, value] of Object.entries(values)) {
    options[key]?.setValue(value);
  }
};

export class GroupConfigOption<
  T extends Record<string, BaseConfigOption<unknown>>,
> extends BaseConfigOption<T> {
  constructor(
    meta: ConfigMeta,
    readonly options: T,
  ) {
    super(meta);
  }

  getOptions(): T {
    return this.options;
  }

  getValue(inputData: AnimInputData): T {
    return getOptionValues(this.options, inputData) as T;
  }

  setValue(value: T): void {
    setOptionValues(this.options, value);
  }

  getDefaultValue(): T {
    return getOptionValues(this.options, {} as AnimInputData) as T;
  }

  clone(): GroupConfigOption<T> {
    return new GroupConfigOption(this, cloneOptions(this.options));
  }

  toFormElement(): null {
    return null;
  }
}

export class VConfig<T extends ConfigOptions> {
  constructor(readonly options: T) {}

  clone(): VConfig<T> {
    return new VConfig(cloneOptions(this.options));
  }

  getValues(inputData: AnimInputData): InferValues<VConfig<T>> {
    return getOptionValues(this.options, inputData) as InferValues<VConfig<T>>;
  }

  setValues(values: InferValues<VConfig<T>>): void {
    setOptionValues(this.options, values);
  }

  getDefaultValues(): InferValues<VConfig<T>> {
    return getOptionValues(this.options, {} as AnimInputData) as InferValues<
      VConfig<T>
    >;
  }
}

export type InferValues<T> =
  T extends VConfig<infer U>
    ? {
        [K in keyof U]: U[K] extends GroupConfigOption<infer G>
          ? InferValues<VConfig<G>>
          : U[K] extends ButtonConfigOption
            ? null
            : U[K] extends BaseConfigOption<infer V>
              ? V
              : never;
      }
    : never;

export type VConfigType = VConfig<ConfigOptions>;

export const v = {
  number: (options: NumberOptions) => new ConfigParam(options, VType.Number),
  color: (options: ValueOptions<string>) =>
    new ConfigParam(options, VType.Color),
  text: (options: ValueOptions<string>) =>
    new ConfigParam(options, VType.String),
  toggle: (options: ValueOptions<boolean>) =>
    new ConfigParam(options, VType.Boolean),
  select: (options: SelectOptions) => new ConfigParam(options, VType.Select),
  file: (options: FileOptions) => new ConfigParam(options, VType.File, false),
  vector3: (options: Vector3Options) => new ConfigParam(options, VType.Vector3),
  button: (options: ButtonConfigOptions) => new ButtonConfigOption(options),
  list<T>(options: ListOptions<T>) {
    return new ConfigParam<T[]>(options, VType.List, false);
  },
  group<T extends ConfigOptions>(meta: ConfigMeta, options: T) {
    return new GroupConfigOption(meta, options);
  },
  config<T extends ConfigOptions>(options: T) {
    return new VConfig(options);
  },
};
