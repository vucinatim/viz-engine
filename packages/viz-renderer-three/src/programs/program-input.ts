import type { VizRenderThreeProgramNode } from '@viz-engine/contracts';

export const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

export const asNonEmptyString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

export const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.length > 0,
      )
    : [];

export const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const assertProgram = (
  node: VizRenderThreeProgramNode,
  programId: string,
  name: string,
): void => {
  if (node.programId !== programId) {
    throw new Error(
      `${name} program cannot update incompatible program "${node.programId}".`,
    );
  }
};
