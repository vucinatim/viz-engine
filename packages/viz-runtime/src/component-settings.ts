import type { VizResolvedInputValue } from '@viz-engine/contracts';

const unsafePathSegments = new Set(['__proto__', 'constructor', 'prototype']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const cloneSettings = (
  settings: Record<string, unknown> | undefined,
): Record<string, unknown> => structuredClone(settings ?? {});

const applyResolvedSetting = (
  settings: Record<string, unknown>,
  path: string,
  value: unknown,
): void => {
  const segments = path.split(':').filter((segment) => segment.length > 0);

  if (
    segments.length === 0 ||
    segments.some((segment) => unsafePathSegments.has(segment))
  ) {
    return;
  }

  let target = settings;

  for (const segment of segments.slice(0, -1)) {
    const existing = target[segment];
    const child = isRecord(existing) ? existing : {};
    target[segment] = child;
    target = child;
  }

  target[segments.at(-1)!] = structuredClone(value);
};

export const resolveVizComponentSettings = (
  settings: Record<string, unknown> | undefined,
  resolvedInputs: Record<string, VizResolvedInputValue>,
): Record<string, unknown> => {
  const result = cloneSettings(settings);

  for (const [path, resolvedInput] of Object.entries(resolvedInputs)) {
    if (resolvedInput.status !== 'resolved') {
      continue;
    }

    applyResolvedSetting(result, path, resolvedInput.value);
  }

  return result;
};
