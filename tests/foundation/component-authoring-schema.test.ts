import {
  findComponentSetting,
  isSettingVisible,
  listComponentParameterIds,
  resolveComponentSettingValue,
} from '@/components/config/config';
import { createEditorCompFromDefinition } from '@/components/config/create-component-from-authoring';
import {
  coreCatalogComponents,
  coreComponentCapabilityPack,
  createCoreComponentRegistry,
  createVizSettingDefaults,
  defineVizComponentAuthoring,
  simpleCubeComponent,
  v,
} from '@viz-engine/components-core';
import {
  createVizComponentRegistry,
  createVizComponentRegistryFromCapabilityPacks,
  type VizComponentImplementation,
} from '@viz-engine/contracts';
import { describe, expect, it } from 'vitest';

describe('portable component authoring schema', () => {
  const expectDataOnly = (value: unknown): void => {
    expect(typeof value).not.toBe('function');
    if (Array.isArray(value)) {
      value.forEach(expectDataOnly);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(expectDataOnly);
    }
  };

  it('drives the package runtime registry and preserved editor definition from one schema', () => {
    const registry = createCoreComponentRegistry();
    const registration = registry.getRegistration('simple-cube');
    const editorComp = createEditorCompFromDefinition(simpleCubeComponent);

    expect(registration?.component).toBe(simpleCubeComponent);
    expect(registration?.capabilityPack).toEqual(
      coreComponentCapabilityPack.manifest,
    );
    expect(editorComp.componentId).toBe('simple-cube');
    expect(editorComp.id).toBe('simple-cube');
    expect(editorComp.name).toBe('Simple Cube');
    expect(editorComp.authoring).toEqual(simpleCubeComponent.authoring);
    expect(editorComp.defaultValues).toEqual({
      color: '#FF00FF',
      size: 1.5,
      rotationSpeedX: 1,
      rotationSpeedY: 1,
    });
  });

  it('projects defaults and deterministic parameter identities directly from portable settings', () => {
    const editorComp = createEditorCompFromDefinition(simpleCubeComponent);

    expect(createVizSettingDefaults(editorComp.authoring.settings)).toEqual(
      editorComp.defaultValues,
    );
    expect(
      listComponentParameterIds('layer-proof', editorComp.authoring.settings),
    ).toEqual([
      'layer-proof:color',
      'layer-proof:size',
      'layer-proof:rotationSpeedX',
      'layer-proof:rotationSpeedY',
    ]);
    expect(
      findComponentSetting(editorComp.authoring.settings, 'size'),
    ).toMatchObject({
      kind: 'number',
      defaultValue: 1.5,
    });
  });

  it('evaluates portable visibility conditions without an editor-only schema', () => {
    const values = { mode: 'reactive', enabled: true };

    expect(
      isSettingVisible(
        {
          operator: 'all',
          conditions: [
            { path: 'mode', operator: 'equals', value: 'reactive' },
            { path: 'enabled', operator: 'not-equals', value: false },
          ],
        },
        values,
      ),
    ).toBe(true);
    expect(
      isSettingVisible(
        { path: 'mode', operator: 'not-in', value: ['reactive', 'manual'] },
        values,
      ),
    ).toBe(false);
  });

  it('is data-only and survives a JSON roundtrip', () => {
    const authoring = simpleCubeComponent.authoring;

    expect(authoring).toBeDefined();
    expect(JSON.parse(JSON.stringify(authoring))).toEqual(authoring);

    expectDataOnly(authoring);
  });

  it('owns the complete preserved editor catalog without editor-local definitions', () => {
    expect(coreCatalogComponents.map((component) => component.name)).toEqual([
      'Curve Spectrum',
      'Debug Animation',
      'Simple Cube',
      'Heartbeat Monitor',
      'Instanced Supercube',
      'Light Tunnel',
      'Morph Shapes',
      'Feature Extraction Bars',
      'Neural Network',
      'Noise Shader',
      'Orbiting Cubes',
      'Particle System',
      'Stage Scene',
      'Fullscreen Shader',
      'Strobe Light',
    ]);

    for (const component of coreCatalogComponents) {
      expect(component.authoring, component.id).toBeDefined();
      expect(component.authoring?.componentId).toBe(component.id);
      expect(component.implementationVersion).toBe('1.0.0');
      expectDataOnly(component.authoring);

      const editorComp = createEditorCompFromDefinition(component);
      expect(editorComp.componentId).toBe(component.id);
      expect(() => structuredClone(editorComp.defaultValues)).not.toThrow();
    }

    expect(createCoreComponentRegistry().getValidationIssues()).toEqual([]);
  });

  it('resolves absent and malformed editor values from portable defaults', () => {
    const settings = v.config({
      amount: v.number({
        label: 'Amount',
        defaultValue: 0.5,
        min: 0,
        max: 1,
      }),
      mode: v.select({
        label: 'Mode',
        defaultValue: 'safe',
        options: ['safe', 'bold'],
      }),
      position: v.vector3({
        label: 'Position',
        defaultValue: { x: 1, y: 2, z: 3 },
      }),
      palette: v.list({
        label: 'Palette',
        defaultValue: ['#ffffff'],
        itemConfig: v.color({
          label: 'Color',
          defaultValue: '#000000',
        }),
      }),
    });

    expect(resolveComponentSettingValue(settings.fields.amount!, NaN)).toBe(
      0.5,
    );
    expect(
      resolveComponentSettingValue(settings.fields.mode!, 'unsupported'),
    ).toBe('safe');
    expect(
      resolveComponentSettingValue(settings.fields.position!, {
        x: 8,
        y: undefined,
      }),
    ).toEqual({ x: 8, y: 2, z: 3 });
    expect(
      resolveComponentSettingValue(settings.fields.palette!, undefined),
    ).toEqual(['#ffffff']);
  });

  it('composes independent capability packs with inspectable origin identity', () => {
    const localComponent: VizComponentImplementation = {
      id: 'local-proof',
      name: 'Local Proof',
      rendererFamily: 'three',
      implementationVersion: '1.0.0',
      authoring: defineVizComponentAuthoring({
        componentId: 'local-proof',
        config: v.config({
          intensity: v.number({
            label: 'Intensity',
            defaultValue: 0.5,
            min: 0,
            max: 1,
          }),
        }),
      }),
      render: () => null,
    };
    const registry = createVizComponentRegistryFromCapabilityPacks(
      [
        coreComponentCapabilityPack,
        {
          manifest: {
            id: 'project/local-proof',
            version: '1.0.0',
          },
          components: [localComponent],
        },
      ],
      { strict: true },
    );

    expect(registry.get('local-proof')).toBe(localComponent);
    expect(registry.getRegistration('local-proof')?.capabilityPack).toEqual({
      id: 'project/local-proof',
      version: '1.0.0',
    });
  });

  it('rejects invalid or duplicate capability-pack identities', () => {
    expect(() =>
      createVizComponentRegistryFromCapabilityPacks(
        [
          {
            manifest: {
              id: '',
              version: '1.0.0',
            },
          },
        ],
        { strict: true },
      ),
    ).toThrow('must declare non-empty id and version values');

    expect(() =>
      createVizComponentRegistryFromCapabilityPacks(
        [
          {
            manifest: {
              id: 'project/duplicate',
              version: '1.0.0',
            },
          },
          {
            manifest: {
              id: 'project/duplicate',
              version: '2.0.0',
            },
          },
        ],
        { strict: true },
      ),
    ).toThrow('Duplicate capability pack id "project/duplicate"');
  });

  it('rejects invalid portable settings at the registry boundary', () => {
    const invalidComponent: VizComponentImplementation = {
      ...simpleCubeComponent,
      id: 'invalid-authoring',
      authoring: {
        ...simpleCubeComponent.authoring!,
        componentId: 'invalid-authoring',
        settings: {
          kind: 'group',
          label: 'Settings',
          fields: {
            mode: {
              kind: 'select',
              label: 'Mode',
              defaultValue: 'missing',
              options: ['valid'],
            },
          },
        },
      },
    };

    expect(
      createVizComponentRegistry([invalidComponent]).getValidationIssues(),
    ).toContainEqual({
      code: 'invalid-setting-definition',
      componentId: 'invalid-authoring',
      path: 'invalid-authoring.mode',
      message:
        'Select setting "invalid-authoring.mode" must contain its default value in its options.',
    });
  });

  it('rejects invalid vector, list-item, and numeric-step defaults', () => {
    const invalidComponent: VizComponentImplementation = {
      ...simpleCubeComponent,
      id: 'invalid-composite-authoring',
      authoring: defineVizComponentAuthoring({
        componentId: 'invalid-composite-authoring',
        config: v.config({
          amount: v.number({
            label: 'Amount',
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0,
          }),
          position: v.vector3({
            label: 'Position',
            defaultValue: { x: 0, y: 5, z: 0 },
            min: -1,
            max: 1,
          }),
          palette: v.list({
            label: 'Palette',
            defaultValue: [''],
            itemConfig: v.color({
              label: 'Color',
              defaultValue: '#ffffff',
            }),
          }),
        }),
      }),
    };

    expect(
      createVizComponentRegistry([invalidComponent])
        .getValidationIssues()
        .map((issue) => issue.message),
    ).toEqual([
      'Number setting "invalid-composite-authoring.amount" has invalid bounds or default value.',
      'Vector setting "invalid-composite-authoring.position" has invalid bounds, step, or default value.',
      'List setting "invalid-composite-authoring.palette" contains an invalid default item.',
    ]);
  });
});
