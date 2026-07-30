import type { VizProjectAction } from '@viz-engine/contracts';
import { readFileSync } from 'node:fs';
import { VizCliInputError } from './types.js';

export class VizCliArguments {
  constructor(private readonly values: readonly string[]) {}

  has(flag: string): boolean {
    return this.values.includes(flag);
  }

  optional(flag: string): string | undefined {
    const index = this.values.indexOf(flag);
    if (index < 0) {
      return undefined;
    }
    const value = this.values[index + 1];
    if (!value || value.startsWith('--')) {
      throw new VizCliInputError('invalid-arguments', `Missing ${flag} value.`);
    }
    return value;
  }

  require(flag: string, description = `${flag} value`): string {
    const value = this.optional(flag);
    if (value === undefined) {
      throw new VizCliInputError(
        'invalid-arguments',
        `Missing ${description}. Pass ${flag} <value>.`,
      );
    }
    return value;
  }

  number(
    flag: string,
    options: {
      defaultValue?: number;
      integer?: boolean;
      minimum?: number;
    } = {},
  ): number | undefined {
    const raw = this.optional(flag);
    if (raw === undefined) {
      return options.defaultValue;
    }
    const value = Number(raw);
    if (
      !Number.isFinite(value) ||
      (options.integer === true && !Number.isInteger(value)) ||
      (options.minimum !== undefined && value < options.minimum)
    ) {
      const constraints = [
        options.integer === true ? 'integer' : 'finite number',
        options.minimum === undefined ? undefined : `>= ${options.minimum}`,
      ]
        .filter(Boolean)
        .join(' ');
      throw new VizCliInputError(
        'invalid-arguments',
        `${flag} must be a ${constraints}.`,
      );
    }
    return value;
  }

  frame(): number {
    return Math.floor(
      this.number('--frame', { defaultValue: 0, minimum: 0 }) ?? 0,
    );
  }

  directory(exampleDirectory: string): string {
    const directory = this.optional('--dir');
    if (directory !== undefined) {
      return directory;
    }
    if (this.has('--example')) {
      return exampleDirectory;
    }
    throw new VizCliInputError(
      'invalid-arguments',
      'Missing bundle directory. Pass --dir <path-or-file-url> or --example.',
    );
  }

  json(flag: string, description: string): unknown {
    const path = this.require(flag, description);
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as unknown;
    } catch (error) {
      throw new VizCliInputError(
        'invalid-arguments',
        error instanceof SyntaxError
          ? `${description} "${path}" is invalid JSON: ${error.message}`
          : `${description} "${path}" could not be read.`,
      );
    }
  }

  actions(): VizProjectAction[] {
    const parsed = this.json('--actions', 'action file');
    if (!Array.isArray(parsed)) {
      throw new VizCliInputError(
        'invalid-arguments',
        'Action file must contain a JSON array of Viz project actions.',
      );
    }
    return parsed as VizProjectAction[];
  }
}
