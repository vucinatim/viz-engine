import Color from 'color';
import { ReactNode } from 'react';
import useAnimationLiveValuesStore from '../../lib/stores/animation-live-values-store';
import { AnimInputData } from '../node-network/animation-nodes';
import useNodeNetworkStore from '../node-network/node-network-store';
import { ColorPickerPopover } from '../ui/color-picker';
import FileInput from '../ui/file-input';
import { Input } from '../ui/input';
import { SimpleSelect } from '../ui/select'; // Assuming you have a Select component
import { Slider } from '../ui/slider'; // Assuming this is your custom slider component
import { Switch } from '../ui/switch';
import Vector3Input from '../ui/vector3-input';
import { VType } from './types';

// Base interface for config metadata
interface ConfigMeta {
  label: string;
  description?: string;
  visibleIf?: (allValues: any) => boolean;
}

// Base class for all config options
export abstract class BaseConfigOption<T> {
  id: string;
  label: string;
  description?: string;
  visibleIf?: (allValues: any) => boolean;

  constructor({ label, description, visibleIf }: ConfigMeta) {
    this.id = ''; // This will be set deterministically
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
  ): ReactNode;
}

export abstract class ConfigParam<T> extends BaseConfigOption<T> {
  isAnimatable: boolean;
  value: T; // All config params have a value
  type: VType;

  constructor(
    options: ConfigMeta & { defaultValue: T },
    type: VType,
    isAnimatable: boolean = true,
  ) {
    super(options);
    this.isAnimatable = isAnimatable;
    this.value = options.defaultValue;
    this.type = type;
  }

  getValue(inputData: AnimInputData): T {
    const isAnimated =
      useNodeNetworkStore.getState().networks[this.id]?.isEnabled;
    if (!isAnimated) {
      return this.value;
    }

    try {
      const animatedValue = useNodeNetworkStore
        .getState()
        .computeNetworkOutput(this.id, inputData);
      useAnimationLiveValuesStore.getState().setValue(this.id, animatedValue);
      return animatedValue;
    } catch (error) {
      console.error(`Error computing network for ${this.id}:`, error);
      return this.value; // Fallback to static value on error
    }
  }

  setValue(value: T): void {
    this.value = value;
  }

  getDefaultValue(): T {
    return this.value;
  }
}

// Vector3 Config Option
type Vector3 = { x: number; y: number; z: number };
type Vector3ConfigOptions = ConfigMeta & {
  defaultValue: Vector3;
  min?: number;
  max?: number;
  step?: number;
};

export class Vector3ConfigOption extends ConfigParam<Vector3> {
  options: Vector3ConfigOptions;

  constructor(options: Vector3ConfigOptions) {
    super(options, VType.Vector3);
    this.options = options;
  }

  clone() {
    return new Vector3ConfigOption({
      ...this.options,
      defaultValue: { ...this.options.defaultValue },
    });
  }

  toFormElement(value: Vector3, onChange: (value: Vector3) => void) {
    return (
      <Vector3Input
        value={value}
        onChange={(v) => {
          this.value = v;
          onChange(v);
        }}
        min={this.options.min}
        max={this.options.max}
        step={this.options.step}
        labelSuffix={
          this.label?.toLowerCase().includes('rotation') ? '°' : undefined
        }
      />
    );
  }
}

// Number Config Option
type NumberConfigOptions = ConfigMeta & {
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
};

export class NumberConfigOption extends ConfigParam<number> {
  options: NumberConfigOptions;

  constructor(options: NumberConfigOptions) {
    super(options, VType.Number);
    this.options = options;
  }

  clone() {
    return new NumberConfigOption(this.options);
  }

  validate(value: number): boolean {
    return value >= this.options.min && value <= this.options.max;
  }

  toFormElement(value: number, onChange: (value: number) => void) {
    return (
      <Slider
        value={value}
        className="w-full"
        onChange={(val) => {
          this.value = val;
          onChange(val);
        }}
        min={this.options.min}
        max={this.options.max}
        step={this.options.step}
      />
    );
  }
}

// Color Config Option
type ColorConfigOptions = ConfigMeta & {
  defaultValue: string;
};

export class ColorConfigOption extends ConfigParam<string> {
  options: ColorConfigOptions;

  constructor(options: ColorConfigOptions) {
    super(options, VType.Color);
    this.options = options;
  }

  clone() {
    return new ColorConfigOption(this.options);
  }

  validate(value: string): boolean {
    // Accept any CSS color string supported by `color` lib (hex, hexa, rgb(a), hsl(a), named)
    try {
      // Will throw if invalid
      Color(value);
      return true;
    } catch {
      return false;
    }
  }

  toFormElement(value: string, onChange: (value: string) => void) {
    return (
      <ColorPickerPopover
        value={value}
        onChange={(val) => {
          this.value = val;
          onChange(val);
        }}
      />
    );
  }
}

// String Config Option
type StringConfigOptions = ConfigMeta & {
  defaultValue: string;
};

export class StringConfigOption extends ConfigParam<string> {
  options: StringConfigOptions;

  constructor(options: StringConfigOptions) {
    super(options, VType.String);
    this.options = options;
  }

  clone() {
    return new StringConfigOption(this.options);
  }

  validate(value: string): boolean {
    return true; // No validation for string
  }

  toFormElement(value: string, onChange: (value: string) => void) {
    return (
      <Input
        value={value}
        onChange={(e) => {
          this.value = e.target.value;
          onChange(e.target.value);
        }}
      />
    );
  }
}

// Generic File (path/URL) Config Option with extension validation
type FileConfigOptions = ConfigMeta & {
  defaultValue: string; // file path or URL
  allowedExtensions?: string[]; // e.g., ['.glb', '.gltf']
};

export class FileConfigOption extends ConfigParam<string> {
  options: FileConfigOptions;

  constructor(options: FileConfigOptions) {
    super(options, VType.File, false);
    this.options = options;
  }

  clone() {
    return new FileConfigOption(this.options);
  }

  validate(value: string): boolean {
    if (!value) return true; // empty allowed
    const allowed = this.options.allowedExtensions || [];
    if (allowed.length === 0) return true;
    try {
      const url = new URL(value, 'http://local');
      const pathname = url.pathname || value;
      const lower = pathname.toLowerCase();
      return allowed.some((ext) => lower.endsWith(ext));
    } catch {
      const lower = value.toLowerCase();
      return allowed.some((ext) => lower.endsWith(ext));
    }
  }

  toFormElement(value: string, onChange: (value: string) => void) {
    return (
      <FileInput
        value={value}
        acceptExtensions={this.options.allowedExtensions}
        onChange={(val) => {
          this.value = val;
          onChange(val);
        }}
      />
    );
  }
}

// Boolean Config Option (Toggle)
type BooleanConfigOptions = ConfigMeta & {
  defaultValue: boolean;
};

export class BooleanConfigOption extends ConfigParam<boolean> {
  options: BooleanConfigOptions;

  constructor(options: BooleanConfigOptions) {
    super(options, VType.Boolean);
    this.options = options;
  }

  clone() {
    return new BooleanConfigOption(this.options);
  }

  toFormElement(value: boolean, onChange: (value: boolean) => void) {
    return (
      <Switch
        checked={value}
        onClick={() => {
          this.value = !value;
          onChange(!value);
        }}
      />
    );
  }
}

// Select Config Option
type SelectConfigOptions = ConfigMeta & {
  defaultValue: string;
  options: string[];
};

export class SelectConfigOption extends ConfigParam<string> {
  options: SelectConfigOptions;

  constructor(options: SelectConfigOptions) {
    super(options, VType.Select);
    this.options = options;
  }

  clone() {
    return new SelectConfigOption(this.options);
  }

  validate(value: string): boolean {
    return this.options.options.some((option) => option === value);
  }

  toFormElement(value: string, onChange: (value: string) => void) {
    return (
      <SimpleSelect
        value={value}
        onChange={(val) => {
          this.value = val;
          onChange(val);
        }}
        options={this.options.options}
      />
    );
  }
}

// Group Config Option
export class GroupConfigOption<
  T extends Record<string, BaseConfigOption<any>>,
> extends BaseConfigOption<T> {
  options: T;

  constructor(meta: ConfigMeta, options: T) {
    super(meta);
    this.options = options;
  }

  getOptions() {
    return this.options;
  }

  getValue(inputData: AnimInputData) {
    const values: Partial<{ [K in keyof T]: any }> = {};
    for (const key in this.options) {
      if (this.options.hasOwnProperty(key)) {
        values[key] = this.options[key].getValue(inputData);
      }
    }
    return values as T;
  }

  setValue(value: T) {
    for (const key in value) {
      if (value.hasOwnProperty(key) && this.options.hasOwnProperty(key)) {
        this.options[key].setValue(value[key]);
      }
    }
  }

  getDefaultValue() {
    const defaults: Partial<{ [K in keyof T]: any }> = {};
    for (const key in this.options) {
      if (this.options.hasOwnProperty(key)) {
        defaults[key] = this.options[key].getDefaultValue();
      }
    }
    return defaults as T;
  }

  clone(): GroupConfigOption<T> {
    const clonedOptions: Partial<T> = {};
    for (const key in this.options) {
      if (this.options.hasOwnProperty(key)) {
        clonedOptions[key as keyof T] = this.options[
          key
        ].clone() as T[typeof key];
      }
    }
    return new GroupConfigOption(this, clonedOptions as T);
  }

  rehydrate(persistedConfig: GroupConfigOption<T>): GroupConfigOption<T> {
    for (const key in this.options) {
      const option = this.options[key];
      const persistedOption = persistedConfig.options[key];

      if (
        option instanceof GroupConfigOption &&
        persistedOption instanceof GroupConfigOption
      ) {
        option.rehydrate(persistedOption);
      } else if (
        option instanceof ConfigParam &&
        persistedOption instanceof ConfigParam
      ) {
        option.setValue((persistedOption as ConfigParam<any>).value);
      }
    }
    return this;
  }

  toFormElement() {
    return null;
  }
}

// VConfig class that holds the options
export class VConfig<T extends Record<string, BaseConfigOption<any>>> {
  options: T;

  constructor(options: T) {
    this.options = options;
  }

  clone(): VConfig<T> {
    const clonedOptions: Partial<T> = {};
    for (const key in this.options) {
      if (this.options.hasOwnProperty(key)) {
        clonedOptions[key as keyof T] = this.options[
          key as keyof T
        ].clone() as T[typeof key];
      }
    }
    return new VConfig(clonedOptions as T);
  }

  rehydrate(persistedConfig: VConfig<T>): VConfig<T> {
    for (const key in this.options) {
      const option = this.options[key];
      const persistedOption = persistedConfig.options[key];

      if (
        option instanceof GroupConfigOption &&
        persistedOption instanceof GroupConfigOption
      ) {
        option.rehydrate(persistedOption);
      } else if (
        option instanceof ConfigParam &&
        persistedOption instanceof ConfigParam
      ) {
        option.setValue((persistedOption as ConfigParam<any>).value);
      }
    }
    return this;
  }

  getValues(inputData: AnimInputData): InferValues<VConfig<T>> {
    const values: Partial<InferValues<VConfig<T>>> = {};
    for (const key in this.options) {
      if (this.options.hasOwnProperty(key)) {
        values[key] = this.options[key].getValue(inputData);
      }
    }
    return values as InferValues<VConfig<T>>;
  }

  setValues(values: InferValues<VConfig<T>>) {
    for (const key in values) {
      if (values.hasOwnProperty(key) && this.options.hasOwnProperty(key)) {
        this.options[key].setValue(values[key]);
      }
    }
  }

  getDefaultValues(): InferValues<VConfig<T>> {
    const defaults: Partial<InferValues<VConfig<T>>> = {};
    for (const key in this.options) {
      if (this.options.hasOwnProperty(key)) {
        defaults[key] = this.options[key].getDefaultValue();
      }
    }
    return defaults as InferValues<VConfig<T>>;
  }
}

// Recursive type inference that flattens groups and returns the final types
export type InferValues<T> =
  T extends VConfig<infer U>
    ? {
        [K in keyof U]: U[K] extends GroupConfigOption<infer G>
          ? InferValues<VConfig<G>>
          : U[K] extends BaseConfigOption<infer V>
            ? V
            : never;
      }
    : never;

export type VConfigType = VConfig<Record<string, BaseConfigOption<any>>>;

// Factory for creating config options
export const v = {
  number: (options: NumberConfigOptions) => new NumberConfigOption(options),
  color: (options: ColorConfigOptions) => new ColorConfigOption(options),
  text: (options: StringConfigOptions) => new StringConfigOption(options),
  toggle: (options: BooleanConfigOptions) => new BooleanConfigOption(options),
  select: (options: SelectConfigOptions) => new SelectConfigOption(options),
  file: (options: FileConfigOptions) => new FileConfigOption(options),
  vector3: (options: Vector3ConfigOptions) => new Vector3ConfigOption(options),
  group: <T extends Record<string, BaseConfigOption<any>>>(
    meta: ConfigMeta,
    options: T,
  ) => new GroupConfigOption(meta, options),
  config: <T extends Record<string, BaseConfigOption<any>>>(options: T) =>
    new VConfig(options),
};
