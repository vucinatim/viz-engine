import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  createVizFramePlan,
  createVizRuntimeSession,
  validateProjectDocument,
} from "@viz-engine/runtime";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createVizEditorSession } from "@viz-engine/editor-session";
import { loadLocalVizProjectBundle, writeLocalVizProjectBundle } from "@viz-engine/dev-cli";

describe("Viz editor session foundation", () => {
  it("keeps canonical project truth separate from editor UI and preview state", () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
      uiState: {
        selectedLayerId: "layer-bars",
        expandedLayerIds: ["layer-bars", "layer-bloom"],
        activePanel: "graph",
      },
      previewState: {
        currentFrame: 48,
        isPlaying: true,
        mode: "live",
      },
    });

    const snapshot = session.getSnapshot();
    const exported = session.exportWorkingProject();

    expect(snapshot.uiState.selectedLayerId).toBe("layer-bars");
    expect(snapshot.previewState.currentFrame).toBe(48);
    expect(snapshot.previewState.mode).toBe("live");
    expect(validateProjectDocument(exported).ok).toBe(true);
    expect(exported).not.toHaveProperty("uiState");
    expect(exported).not.toHaveProperty("previewState");
    expect(exported.layerOrder).toEqual(exampleProjectDocument.layerOrder);
  });

  it("applies canonical actions into the working head and keeps the project renderable", () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
      actor: { kind: "agent", id: "codex" },
    });

    const result = session.applyActions([
      {
        type: "layer.settings.set",
        payload: {
          layerId: "layer-background",
          path: "color",
          value: "#0a1623",
        },
      },
      {
        type: "layer.input.set",
        payload: {
          layerId: "layer-bloom",
          inputKey: "intensity",
          valueSource: {
            kind: "literal",
            value: 0.42,
          },
        },
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.revision).toBe(1);
    expect(result.actionEnvelopes).toHaveLength(2);
    expect(result.actionEnvelopes[0]?.actor).toEqual({
      kind: "agent",
      id: "codex",
    });

    const runtimeSession = createVizRuntimeSession({
      project: session.exportWorkingProject(),
      mode: "render",
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: "editor-session-seed",
    });
    const framePlan = createVizFramePlan({
      session: runtimeSession,
      frame: 24,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    expect(framePlan.issues).toHaveLength(0);
    expect(
      session
        .exportWorkingProject()
        .layers.find((layer) => layer.id === "layer-background")?.settings,
    ).toMatchObject({
      color: "#0a1623",
    });
    expect(framePlan.layers.find((layer) => layer.layerId === "layer-bloom")?.resolvedInputs.intensity.value).toBe(0.42);
  });

  it("rejects invalid mutations without corrupting the working head", () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });

    const before = session.exportWorkingProject();
    const result = session.applyAction({
      type: "layer.remove",
      payload: {
        layerId: "layer-does-not-exist",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("missing-layer");
    expect(result.revision).toBe(0);
    expect(session.exportWorkingProject()).toEqual(before);
    expect(session.getSnapshot().issues).toEqual([
      {
        source: "action",
        severity: "error",
        code: "missing-layer",
        message: 'Cannot remove missing layer "layer-does-not-exist".',
      },
    ]);
  });

  it("roundtrips a mutated working head through bundle export and reload", () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });
    const bundleDirectory = mkdtempSync(join(tmpdir(), "viz-editor-session-bundle-"));

    try {
      const mutation = session.applyActions([
        {
          type: "graph.output.set",
          payload: {
            graphId: "graph-main-reactivity",
            output: {
              key: "barsGainEditor",
              nodeId: "node-bars-bass-scale",
              output: "value",
            },
          },
        },
        {
          type: "layer.input.set",
          payload: {
            layerId: "layer-bars",
            inputKey: "gain",
            valueSource: {
              kind: "graph-output",
              graphId: "graph-main-reactivity",
              output: "barsGainEditor",
            },
          },
        },
      ]);

      expect(mutation.ok).toBe(true);

      const writeResult = writeLocalVizProjectBundle({
        bundleDirectory,
        project: session.exportWorkingProject(),
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
      });
      const reloaded = loadLocalVizProjectBundle(bundleDirectory);

      expect(writeResult.issues).toHaveLength(0);
      expect(reloaded.issues).toHaveLength(0);
      expect(reloaded.project.graphs?.[0]?.outputs.some((output) => output.key === "barsGainEditor")).toBe(true);
      expect(
        reloaded.project.layers.find((layer) => layer.id === "layer-bars")?.inputs?.gain,
      ).toEqual({
        kind: "graph-output",
        graphId: "graph-main-reactivity",
        output: "barsGainEditor",
      });
    } finally {
      rmSync(bundleDirectory, { recursive: true, force: true });
    }
  });
});
