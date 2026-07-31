import type {
  VizCapabilityPack,
  VizCapabilityPackManifest,
} from './capabilities.js';
import type {
  VizComponentImplementation,
  VizComponentInputSourceKind,
  VizComponentSettingCondition,
  VizComponentSettingDefinition,
} from './components.js';

export interface VizComponentRegistry {
  get(id: string): VizComponentImplementation | undefined;
  list(): VizComponentImplementation[];
  getRegistration(id: string): VizComponentRegistration | undefined;
  listRegistrations(): VizComponentRegistration[];
  getValidationIssues(): VizComponentValidationIssue[];
}

export interface VizComponentRegistration {
  component: VizComponentImplementation;
  capabilityPack?: VizCapabilityPackManifest;
}

export interface VizComponentValidationIssue {
  code:
    | 'missing-component-id'
    | 'missing-component-name'
    | 'duplicate-component-id'
    | 'duplicate-input-key'
    | 'invalid-input-key'
    | 'invalid-runtime-input-binding'
    | 'empty-supported-sources'
    | 'invalid-default-asset'
    | 'authoring-component-id-mismatch'
    | 'invalid-authoring-schema'
    | 'duplicate-setting-path'
    | 'invalid-setting-definition'
    | 'invalid-setting-condition'
    | 'invalid-component-preset'
    | 'invalid-capability-pack-manifest'
    | 'duplicate-capability-pack-id';
  componentId?: string;
  path: string;
  message: string;
}

const VALID_INPUT_SOURCE_KINDS = new Set<VizComponentInputSourceKind>([
  'literal',
  'asset-ref',
  'graph-output',
  'artifact-feature',
]);

const VALID_RUNTIME_INPUT_BINDINGS = new Set([
  'audio.frequency-data',
  'audio.time-domain-data',
  'audio.sample-rate',
  'audio.fft-size',
  'audio.frequency-analysis',
]);

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const isFiniteVector3 = (
  value: unknown,
): value is { x: number; y: number; z: number } =>
  typeof value === 'object' &&
  value !== null &&
  ['x', 'y', 'z'].every((axis) =>
    Number.isFinite((value as Record<string, unknown>)[axis]),
  );

const isValidDefaultValue = (
  definition: Exclude<
    VizComponentSettingDefinition,
    { kind: 'group' } | { kind: 'action' }
  >,
  value: unknown,
): boolean => {
  switch (definition.kind) {
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= definition.min &&
        value <= definition.max
      );
    case 'text':
    case 'file':
      return typeof value === 'string';
    case 'color':
      return isNonEmptyString(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
      return typeof value === 'string' && definition.options.includes(value);
    case 'vector3':
      return (
        isFiniteVector3(value) &&
        (definition.min === undefined ||
          Object.values(value).every((axis) => axis >= definition.min!)) &&
        (definition.max === undefined ||
          Object.values(value).every((axis) => axis <= definition.max!))
      );
    case 'list':
      return (
        Array.isArray(value) &&
        value.every((item) => isValidDefaultValue(definition.item, item))
      );
  }
};

const isValidSettingCondition = (
  condition: VizComponentSettingCondition,
): boolean => {
  if ('conditions' in condition) {
    return (
      condition.conditions.length > 0 &&
      condition.conditions.every(isValidSettingCondition)
    );
  }

  return (
    isNonEmptyString(condition.path) &&
    ['equals', 'not-equals', 'in', 'not-in'].includes(condition.operator) &&
    (condition.operator !== 'in' && condition.operator !== 'not-in'
      ? true
      : Array.isArray(condition.value))
  );
};

const validateSettingDefinition = (
  componentId: string,
  definition: VizComponentSettingDefinition,
  path: string,
  seenPaths: Set<string>,
): VizComponentValidationIssue[] => {
  const issues: VizComponentValidationIssue[] = [];

  if (seenPaths.has(path)) {
    issues.push({
      code: 'duplicate-setting-path',
      componentId,
      path,
      message: `Duplicate component setting path "${path}".`,
    });
    return issues;
  }
  seenPaths.add(path);

  if (!isNonEmptyString(definition.label)) {
    issues.push({
      code: 'invalid-setting-definition',
      componentId,
      path: `${path}.label`,
      message: `Component setting "${path}" must have a non-empty label.`,
    });
  }

  const condition = definition.visibleWhen;
  if (condition !== undefined && !isValidSettingCondition(condition)) {
    issues.push({
      code: 'invalid-setting-condition',
      componentId,
      path: `${path}.visibleWhen`,
      message: `Component setting "${path}" has an invalid visibility condition.`,
    });
  }

  if (definition.kind === 'group') {
    for (const [key, child] of Object.entries(definition.fields)) {
      if (!isNonEmptyString(key)) {
        issues.push({
          code: 'invalid-setting-definition',
          componentId,
          path,
          message: `Component setting group "${path}" contains an empty field key.`,
        });
        continue;
      }
      issues.push(
        ...validateSettingDefinition(
          componentId,
          child,
          `${path}.${key}`,
          seenPaths,
        ),
      );
    }
    return issues;
  }

  if (definition.kind === 'number') {
    if (
      !Number.isFinite(definition.defaultValue) ||
      !Number.isFinite(definition.min) ||
      !Number.isFinite(definition.max) ||
      definition.min > definition.max ||
      definition.defaultValue < definition.min ||
      definition.defaultValue > definition.max ||
      (definition.step !== undefined &&
        (!Number.isFinite(definition.step) || definition.step <= 0))
    ) {
      issues.push({
        code: 'invalid-setting-definition',
        componentId,
        path,
        message: `Number setting "${path}" has invalid bounds or default value.`,
      });
    }
  } else if (definition.kind === 'select') {
    if (
      definition.options.length === 0 ||
      !definition.options.includes(definition.defaultValue)
    ) {
      issues.push({
        code: 'invalid-setting-definition',
        componentId,
        path,
        message: `Select setting "${path}" must contain its default value in its options.`,
      });
    } else if (
      definition.options.some((option) => !isNonEmptyString(option)) ||
      new Set(definition.options).size !== definition.options.length
    ) {
      issues.push({
        code: 'invalid-setting-definition',
        componentId,
        path,
        message: `Select setting "${path}" must declare unique, non-empty options.`,
      });
    }
  } else if (definition.kind === 'vector3') {
    if (
      (definition.min !== undefined && !Number.isFinite(definition.min)) ||
      (definition.max !== undefined && !Number.isFinite(definition.max)) ||
      (definition.min !== undefined &&
        definition.max !== undefined &&
        definition.min > definition.max) ||
      (definition.step !== undefined &&
        (!Number.isFinite(definition.step) || definition.step <= 0)) ||
      !isValidDefaultValue(definition, definition.defaultValue)
    ) {
      issues.push({
        code: 'invalid-setting-definition',
        componentId,
        path,
        message: `Vector setting "${path}" has invalid bounds, step, or default value.`,
      });
    }
  } else if (definition.kind === 'list') {
    if (!isValidDefaultValue(definition, definition.defaultValue)) {
      issues.push({
        code: 'invalid-setting-definition',
        componentId,
        path,
        message: `List setting "${path}" contains an invalid default item.`,
      });
    }
    issues.push(
      ...validateSettingDefinition(
        componentId,
        definition.item,
        `${path}[]`,
        seenPaths,
      ),
    );
  } else if (definition.kind === 'file') {
    if (
      typeof definition.defaultValue !== 'string' ||
      definition.allowedExtensions?.some(
        (extension) => !isNonEmptyString(extension),
      )
    ) {
      issues.push({
        code: 'invalid-setting-definition',
        componentId,
        path,
        message: `File setting "${path}" has an invalid default value or extension.`,
      });
    }
  } else if (
    (definition.kind === 'text' &&
      typeof definition.defaultValue !== 'string') ||
    (definition.kind === 'color' &&
      !isNonEmptyString(definition.defaultValue)) ||
    (definition.kind === 'boolean' &&
      typeof definition.defaultValue !== 'boolean')
  ) {
    issues.push({
      code: 'invalid-setting-definition',
      componentId,
      path,
      message: `Setting "${path}" has an invalid default value.`,
    });
  } else if (definition.kind === 'action') {
    if (!isNonEmptyString(definition.actionId)) {
      issues.push({
        code: 'invalid-setting-definition',
        componentId,
        path,
        message: `Action setting "${path}" must declare a non-empty action id.`,
      });
    }
  }

  return issues;
};

export const validateVizComponentImplementation = (
  component: VizComponentImplementation,
): VizComponentValidationIssue[] => {
  const issues: VizComponentValidationIssue[] = [];

  if (!isNonEmptyString(component.id)) {
    issues.push({
      code: 'missing-component-id',
      path: 'id',
      message: 'Component id must be a non-empty string.',
    });
  }

  if (!isNonEmptyString(component.name)) {
    issues.push({
      code: 'missing-component-name',
      componentId: component.id,
      path: `${component.id || '<missing-id>'}.name`,
      message: 'Component name must be a non-empty string.',
    });
  }

  if (component.authoring !== undefined) {
    if (
      component.authoring.schemaVersion !== 1 ||
      component.authoring.settings.kind !== 'group'
    ) {
      issues.push({
        code: 'invalid-authoring-schema',
        componentId: component.id,
        path: `${component.id || '<missing-id>'}.authoring`,
        message:
          'Component authoring schema must use schemaVersion 1 and a root group.',
      });
    }

    if (component.authoring.componentId !== component.id) {
      issues.push({
        code: 'authoring-component-id-mismatch',
        componentId: component.id,
        path: `${component.id || '<missing-id>'}.authoring.componentId`,
        message: `Component authoring id "${component.authoring.componentId}" does not match component id "${component.id}".`,
      });
    }

    issues.push(
      ...validateSettingDefinition(
        component.id,
        component.authoring.settings,
        component.id,
        new Set(),
      ),
    );

    const presetIds = new Set<string>();
    for (const preset of component.authoring.presets ?? []) {
      if (
        !isNonEmptyString(preset.id) ||
        !isNonEmptyString(preset.name) ||
        presetIds.has(preset.id)
      ) {
        issues.push({
          code: 'invalid-component-preset',
          componentId: component.id,
          path: `${component.id}.authoring.presets`,
          message: `Component "${component.id}" has an invalid or duplicate preset id.`,
        });
      }
      presetIds.add(preset.id);
    }
  }

  const seenInputKeys = new Set<string>();

  for (const input of component.inputs ?? []) {
    const pathPrefix = `${component.id || '<missing-id>'}.inputs.${input.key || '<missing-key>'}`;

    if (!isNonEmptyString(input.key)) {
      issues.push({
        code: 'invalid-input-key',
        componentId: component.id,
        path: pathPrefix,
        message: 'Component input key must be a non-empty string.',
      });
      continue;
    }

    if (seenInputKeys.has(input.key)) {
      issues.push({
        code: 'duplicate-input-key',
        componentId: component.id,
        path: pathPrefix,
        message: `Duplicate component input key "${input.key}".`,
      });
      continue;
    }

    seenInputKeys.add(input.key);

    if (
      input.runtimeBinding !== undefined &&
      !VALID_RUNTIME_INPUT_BINDINGS.has(input.runtimeBinding)
    ) {
      issues.push({
        code: 'invalid-runtime-input-binding',
        componentId: component.id,
        path: `${pathPrefix}.runtimeBinding`,
        message: `Component input "${input.key}" references unknown runtime binding "${String(input.runtimeBinding)}".`,
      });
    }

    if (
      !Array.isArray(input.supportedSources) ||
      input.supportedSources.length === 0
    ) {
      issues.push({
        code: 'empty-supported-sources',
        componentId: component.id,
        path: `${pathPrefix}.supportedSources`,
        message: `Component input "${input.key}" must declare at least one supported source kind.`,
      });
      continue;
    }

    for (const sourceKind of input.supportedSources) {
      if (!VALID_INPUT_SOURCE_KINDS.has(sourceKind)) {
        issues.push({
          code: 'empty-supported-sources',
          componentId: component.id,
          path: `${pathPrefix}.supportedSources`,
          message: `Component input "${input.key}" references unknown source kind "${String(sourceKind)}".`,
        });
      }
    }

    if (
      input.defaultAsset !== undefined &&
      !input.supportedSources.includes('asset-ref')
    ) {
      issues.push({
        code: 'invalid-default-asset',
        componentId: component.id,
        path: `${pathPrefix}.defaultAsset`,
        message: `Component input "${input.key}" declares a default asset without supporting asset-ref sources.`,
      });
    }
  }

  return issues;
};

export const validateVizComponentRegistry = (
  components: VizComponentImplementation[],
): VizComponentValidationIssue[] => {
  const issues: VizComponentValidationIssue[] = [];
  const seenComponentIds = new Set<string>();

  for (const component of components) {
    issues.push(...validateVizComponentImplementation(component));

    if (!isNonEmptyString(component.id)) {
      continue;
    }

    if (seenComponentIds.has(component.id)) {
      issues.push({
        code: 'duplicate-component-id',
        componentId: component.id,
        path: component.id,
        message: `Duplicate component id "${component.id}" in registry.`,
      });
      continue;
    }

    seenComponentIds.add(component.id);
  }

  return issues;
};

export const createVizComponentRegistry = (
  components: VizComponentImplementation[],
  options: { strict?: boolean } = {},
): VizComponentRegistry => {
  const issues = validateVizComponentRegistry(components);

  if ((options.strict ?? false) && issues.length > 0) {
    throw new Error(
      `Invalid Viz component registry: ${issues.map((issue) => issue.message).join('; ')}`,
    );
  }

  const componentMap = new Map(
    components.map((component) => [component.id, component]),
  );
  const registrations = components.map((component) => ({ component }));
  const registrationMap = new Map(
    registrations.map((registration) => [
      registration.component.id,
      registration,
    ]),
  );

  return {
    get: (id) => componentMap.get(id),
    list: () => components,
    getRegistration: (id) => registrationMap.get(id),
    listRegistrations: () => [...registrations],
    getValidationIssues: () => [...issues],
  };
};

export const createVizComponentRegistryFromCapabilityPacks = (
  packs: VizCapabilityPack[],
  options: { strict?: boolean } = {},
): VizComponentRegistry => {
  const packIssues: VizComponentValidationIssue[] = [];
  const seenPackIds = new Set<string>();

  for (const [index, pack] of packs.entries()) {
    const path = `capabilityPacks.${index}.manifest`;

    if (
      !isNonEmptyString(pack.manifest.id) ||
      !isNonEmptyString(pack.manifest.version)
    ) {
      packIssues.push({
        code: 'invalid-capability-pack-manifest',
        path,
        message: `Capability pack at index ${index} must declare non-empty id and version values.`,
      });
      continue;
    }

    if (seenPackIds.has(pack.manifest.id)) {
      packIssues.push({
        code: 'duplicate-capability-pack-id',
        path: `${path}.id`,
        message: `Duplicate capability pack id "${pack.manifest.id}".`,
      });
      continue;
    }

    seenPackIds.add(pack.manifest.id);
  }

  const registrations = packs.flatMap((pack) =>
    (pack.components ?? []).map((component) => ({
      component,
      capabilityPack: pack.manifest,
    })),
  );
  const components = registrations.map(
    (registration) => registration.component,
  );
  const registry = createVizComponentRegistry(components);
  const issues = [...packIssues, ...registry.getValidationIssues()];

  if ((options.strict ?? false) && issues.length > 0) {
    throw new Error(
      `Invalid Viz component registry: ${issues.map((issue) => issue.message).join('; ')}`,
    );
  }

  const registrationMap = new Map(
    registrations.map((registration) => [
      registration.component.id,
      registration,
    ]),
  );

  return {
    ...registry,
    getRegistration: (id) => registrationMap.get(id),
    listRegistrations: () => [...registrations],
    getValidationIssues: () => [...issues],
  };
};
