import { ReactNode } from 'react';
import useAnimationLiveValuesStore from '../../lib/stores/animation-live-values-store';
import useNodeNetworkStore from '../node-network/node-network-store';
import { ColorPickerPopover } from '../ui/color-picker';
import { Input } from '../ui/input';
import { SimpleSelect } from '../ui/select'; // Assuming you have a Select component
import { Slider } from '../ui/slider'; // Assuming this is your custom slider component
import { Switch } from '../ui/switch';
import { AnimInputData } from './animation-nodes';

// Enum for the different config types
export enum VType {
  Number = 'number',
  Color = 'color',
  Select = 'select',
  Boolean = 'boolean',
  String = 'string',
  Group = 'group',
}

// Base interface for config metadata
interface ConfigMeta {
  label: string;
  description?: string;
}

// Base class for all config options
export abstract class BaseConfigOption<T> {
  id: string;
  label: string;
  description?: string;

  constructor({ label, description }: ConfigMeta) {
    this.id = label.toLowerCase().replace(/\s/g, '-') + '-' + Date.now();
    this.label = label;
    this.description = description;
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

  constructor(
    options: ConfigMeta & { defaultValue: T },
    isAnimatable: boolean = true,
  ) {
    super(options);
    this.isAnimatable = isAnimatable;
    this.value = options.defaultValue;
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
      // console.error(`Error computing network for ${this.id}:`, error);
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
    super(options);
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
    super(options);
    this.options = options;
  }

  clone() {
    return new ColorConfigOption(this.options);
  }

  validate(value: string): boolean {
    // Simple hex color validation
    return /^#[0-9A-F]{6}$/i.test(value);
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
    super(options);
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

// Boolean Config Option (Toggle)
type BooleanConfigOptions = ConfigMeta & {
  defaultValue: boolean;
};

export class BooleanConfigOption extends ConfigParam<boolean> {
  options: BooleanConfigOptions;

  constructor(options: BooleanConfigOptions) {
    super(options);
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
    super(options);
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
  group: <T extends Record<string, BaseConfigOption<any>>>(
    meta: ConfigMeta,
    options: T,
  ) => new GroupConfigOption(meta, options),
  config: <T extends Record<string, BaseConfigOption<any>>>(options: T) =>
    new VConfig(options),
};
