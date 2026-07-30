import { createEditorCompFromDefinition } from '@/components/config/create-component-from-authoring';
import {
  coreComponentCapabilityPack,
  coreCatalogComponents,
  createCoreComponentRegistry,
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
    expect(editorComp.defaultValues).toEqual({
      color: '#FF00FF',
      size: 1.5,
      rotationSpeedX: 1,
      rotationSpeedY: 1,
    });
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
});
