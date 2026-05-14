import { applyVizProjectAction, applyVizProjectActions } from "@viz-engine/actions";
import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleAudioTimelineArtifact,
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  createVizFramePlan,
  createVizRenderPlan,
  createVizRuntimeSession,
  validateProjectDocument,
} from "@viz-engine/runtime";
import { describe, expect, it } from "vitest";

describe("Viz action surface", () => {
  it("builds a valid graph-driven mutation sequence over the canonical project document", () => {
    const result = applyVizProjectActions(exampleProjectDocument, [
      {
        type: "graph.create",
        payload: {
          graphId: "graph-action-test",
          name: "Action Test Graph",
        },
      },
      {
        type: "graph.input.set",
        payload: {
          graphId: "graph-action-test",
          inputKey: "flux",
          source: {
            kind: "artifact-feature",
            artifactId: exampleAudioTimelineArtifact.id,
            feature: "spectral-flux",
          },
        },
      },
      {
        type: "graph.node.add",
        payload: {
          graphId: "graph-action-test",
          nodeId: "node-flux-input",
          nodeType: "graph-input",
          initialInputs: {
            inputKey: {
              kind: "literal",
              value: "flux",
            },
          },
        },
      },
      {
        type: "graph.node.add",
        payload: {
          graphId: "graph-action-test",
          nodeId: "node-flux-scale",
          nodeType: "multiply",
          initialInputs: {
            value: {
              kind: "node-output",
              nodeId: "node-flux-input",
              output: "value",
            },
            factor: {
              kind: "literal",
              value: 0.5,
            },
          },
        },
      },
      {
        type: "graph.output.set",
        payload: {
          graphId: "graph-action-test",
          output: {
            key: "scaledFlux",
            nodeId: "node-flux-scale",
            output: "value",
          },
        },
      },
      {
        type: "layer.input.set",
        payload: {
          layerId: "layer-bloom",
          inputKey: "intensity",
          valueSource: {
            kind: "graph-output",
            graphId: "graph-action-test",
            output: "scaledFlux",
          },
        },
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);

    const validation = validateProjectDocument(result.project);
    expect(validation.ok).toBe(true);

    const session = createVizRuntimeSession({
      project: result.project,
      mode: "render",
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: "action-graph-seed",
    });

    const framePlan = createVizFramePlan({
      session,
      frame: 24,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    expect(framePlan.issues).toHaveLength(0);
    const bloomLayer = framePlan.layers.find((layer) => layer.layerId === "layer-bloom");
    expect(bloomLayer?.resolvedInputs.intensity.sourceKind).toBe("graph-output");
    expect(typeof bloomLayer?.resolvedInputs.intensity.value).toBe("number");
  });

  it("creates, reorders, and renders a new layer through actions", () => {
    const result = applyVizProjectActions(exampleProjectDocument, [
      {
        type: "layer.create",
        payload: {
          layerId: "layer-action-accent",
          index: 1,
          layer: {
            name: "Action Accent",
            componentId: "solid-color",
            enabled: true,
            opacity: 0.18,
            blendMode: "screen",
            rendererFamily: "three",
            settings: {
              color: "#113a53",
            },
            inputs: {
              glow: {
                kind: "literal",
                value: 0.24,
              },
            },
          },
        },
      },
      {
        type: "layer.move",
        payload: {
          layerId: "layer-action-accent",
          index: 2,
        },
      },
      {
        type: "layer.settings.set",
        payload: {
          layerId: "layer-action-accent",
          path: "meta.debug.label",
          value: "inserted-by-action",
        },
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.project.layerOrder[2]).toBe("layer-action-accent");
    expect(
      (result.project.layers.find((layer) => layer.id === "layer-action-accent")?.settings as {
        meta?: { debug?: { label?: string } };
      })?.meta?.debug?.label,
    ).toBe("inserted-by-action");

    const renderPlan = createVizRenderPlan({
      session: createVizRuntimeSession({
        project: result.project,
        mode: "render",
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
        seed: "action-layer-seed",
      }),
      frame: 12,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    expect(renderPlan.issues).toHaveLength(0);
    expect(renderPlan.layers.some((layer) => layer.layerId === "layer-action-accent")).toBe(true);
  });

  it("returns structured errors for invalid mutations without breaking the current document", () => {
    const result = applyVizProjectAction(exampleProjectDocument, {
      type: "layer.remove",
      payload: {
        layerId: "layer-does-not-exist",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("missing-layer");
    expect(result.project).toBe(exampleProjectDocument);
  });
});
