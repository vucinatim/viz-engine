import { createCoreComponentRegistry, featureChannelBarsComponent } from "@viz-engine/components-core";
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
});
