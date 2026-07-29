import {
  createCoreComponentRegistry,
  debugAnimationComponent,
  featureChannelBarsComponent,
  featureExtractionBarsComponent,
  strobeLightComponent,
} from "@viz-engine/components-core";
import type {
  VizComponentImplementation,
  VizProjectDocument,
} from "@viz-engine/contracts";
import {
  VIZ_PROJECT_SCHEMA_VERSION,
} from "@viz-engine/contracts";
import { createVizRenderPlan, createVizRuntimeSession, createVizComponentRegistry } from "@viz-engine/runtime";
import { describe, expect, it } from "vitest";

describe("Viz component authoring foundation", () => {
  it("validates component registries and rejects duplicate component ids in strict mode", () => {
    const duplicate: VizComponentImplementation = {
      ...featureChannelBarsComponent,
      name: "Duplicate Feature Channel Bars",
    };

    expect(() =>
      createVizComponentRegistry([featureChannelBarsComponent, duplicate], {
        strict: true,
      }),
    ).toThrow(/Duplicate component id/);
  });

  it("surfaces duplicate input keys through registry validation", () => {
    const invalidComponent = {
      ...featureChannelBarsComponent,
      id: "invalid-input-component",
      inputs: [
        {
          key: "gain",
          label: "Gain A",
          supportedSources: ["literal"],
        },
        {
          key: "gain",
          label: "Gain B",
          supportedSources: ["literal"],
        },
      ],
    } satisfies VizComponentImplementation;

    const registry = createVizComponentRegistry([invalidComponent]);

    expect(registry.getValidationIssues()).toEqual([
      {
        code: "duplicate-input-key",
        componentId: "invalid-input-component",
        path: "invalid-input-component.inputs.gain",
        message: 'Duplicate component input key "gain".',
      },
    ]);
  });

  it("renders the V1-derived feature-channel-bars component through the canonical runtime path", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-component-proof",
      name: "Component Proof",
      timeline: {
        fps: 60,
        durationInFrames: 120,
      },
      viewport: {
        width: 1280,
        height: 720,
      },
      layerOrder: ["layer-feature-bars"],
      layers: [
        {
          id: "layer-feature-bars",
          name: "Feature Bars",
          componentId: "feature-channel-bars",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          rendererFamily: "three",
          inputs: {
            kick: { kind: "literal", value: 0.2 },
            snare: { kind: "literal", value: 0.35 },
            bass: { kind: "literal", value: 0.5 },
            melody: { kind: "literal", value: 0.7 },
            percussion: { kind: "literal", value: 0.9 },
          },
        },
      ],
    };

    const renderPlan = createVizRenderPlan({
      session: createVizRuntimeSession({
        project,
        mode: "render",
        resolvedAssets: [],
        resolvedArtifacts: [],
        seed: "component-proof-seed",
      }),
      frame: 12,
      registry: createCoreComponentRegistry(),
    });

    expect(renderPlan.issues).toHaveLength(0);
    expect(renderPlan.layers[0]?.node?.kind).toBe("group");

    const node = renderPlan.layers[0]?.node;

    if (!node || node.kind !== "group") {
      throw new Error("Expected group render node.");
    }

    expect(node.children).toHaveLength(10);
  });

  it("renders preserved-editor stateless Canvas components deterministically", () => {
    const registry = createCoreComponentRegistry();
    const renderComponent = (
      componentId: string,
      settings: Record<string, unknown>,
    ) => {
      const project: VizProjectDocument = {
        schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
        projectId: `project-${componentId}`,
        name: componentId,
        timeline: { fps: 60, durationInFrames: 120 },
        viewport: { width: 1280, height: 720 },
        layerOrder: ["layer"],
        layers: [
          {
            id: "layer",
            name: componentId,
            componentId,
            enabled: true,
            opacity: 1,
            blendMode: "normal",
            settings,
          },
        ],
      };

      return createVizRenderPlan({
        session: createVizRuntimeSession({
          project,
          mode: "render",
          seed: "preserved-editor-component-seed",
        }),
        frame: 42,
        registry,
      });
    };

    expect(registry.get(debugAnimationComponent.id)).toBe(
      debugAnimationComponent,
    );
    expect(registry.get(featureExtractionBarsComponent.id)).toBe(
      featureExtractionBarsComponent,
    );

    const debugPlanA = renderComponent("debug-animation", {
      value: 37,
      midi: 64,
      text: "E4",
      color: "#60a5fa",
    });
    const debugPlanB = renderComponent("debug-animation", {
      value: 37,
      midi: 64,
      text: "E4",
      color: "#60a5fa",
    });
    const featurePlan = renderComponent("feature-extraction-bars", {
      kick: 0.2,
      snare: 0.4,
      bass: 0.6,
      melody: 0.8,
      percussion: 1,
    });

    expect(debugPlanA.issues).toEqual([]);
    expect(debugPlanA).toEqual(debugPlanB);
    expect(debugPlanA.layers[0]?.node?.kind).toBe("group");
    expect(featurePlan.issues).toEqual([]);
    expect(featurePlan.layers[0]?.node?.kind).toBe("group");

    const featureNode = featurePlan.layers[0]?.node;
    if (!featureNode || featureNode.kind !== "group") {
      throw new Error("Expected feature extraction group render node.");
    }
    expect(featureNode.children).toHaveLength(21);
    expect(featureNode.children.filter((node) => node.kind === "text")).toHaveLength(
      10,
    );
  });

  it("derives strobe frames deterministically instead of accumulating time or using Math.random", () => {
    const createStrobePlan = (
      frame: number,
      settings: Record<string, unknown>,
    ) => {
      const project: VizProjectDocument = {
        schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
        projectId: "project-strobe",
        name: "Strobe",
        timeline: { fps: 60, durationInFrames: 120 },
        viewport: { width: 1280, height: 720 },
        layerOrder: ["layer-strobe"],
        layers: [
          {
            id: "layer-strobe",
            name: "Strobe Light",
            componentId: "strobe-light",
            enabled: true,
            opacity: 1,
            blendMode: "normal",
            settings,
          },
        ],
      };

      return createVizRenderPlan({
        session: createVizRuntimeSession({
          project,
          mode: "render",
          seed: "strobe-seed",
        }),
        frame,
        registry: createCoreComponentRegistry(),
      });
    };
    const settings = {
      mode: "Intensity",
      color: "#ffffff",
      intensity: 1,
      strength: 0.8,
      dutyCycle: 0.5,
      flashRate: 0.3,
    };
    const onPlan = createStrobePlan(0, settings);
    const repeatedOnPlan = createStrobePlan(0, settings);
    const offPlan = createStrobePlan(45, settings);

    expect(createCoreComponentRegistry().get(strobeLightComponent.id)).toBe(
      strobeLightComponent,
    );
    expect(onPlan).toEqual(repeatedOnPlan);
    expect(onPlan.layers[0]?.node?.kind).toBe("shader");
    expect(offPlan.layers[0]?.node?.kind).toBe("shader");

    const onNode = onPlan.layers[0]?.node;
    const offNode = offPlan.layers[0]?.node;
    if (
      !onNode ||
      onNode.kind !== "shader" ||
      !offNode ||
      offNode.kind !== "shader"
    ) {
      throw new Error("Expected strobe shader render nodes.");
    }

    expect(onNode.uniforms.uStrength).toBe(0.8);
    expect(offNode.uniforms.uStrength).toBe(0);
  });
});
