import { exampleProjectBundleDirectoryUrl } from "@viz-engine/example-projects/node";
import { createVizEditorControl } from "@viz-engine/editor-control";
import { createVizNodeEditorControl } from "@viz-engine/editor-control/node";
import { loadLocalVizProjectBundle } from "@viz-engine/dev-cli";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Viz local editor control surface", () => {
  it("opens the canonical example project and exposes stable scene state", () => {
    const control = createVizEditorControl();
    const snapshot = control.openExampleProject();

    expect(snapshot.source.kind).toBe("example");
    expect(snapshot.session.workingProject.projectId).toBe("project-example-reactive-bars");
    expect(snapshot.graphSummaries).toEqual([
      {
        graphId: "graph-main-reactivity",
        name: "Main Reactivity Graph",
        nodeCount: 9,
        outputKeys: ["barsBass", "barsLoudness", "bloomIntensity"],
      },
    ]);
    expect(snapshot.transport.mode).toBe("live");
    expect(control.inspectComponents().some((component) => component.componentId === "feature-channel-bars")).toBe(
      true,
    );
  });

  it("mutates the working head and exposes updated frame and debug snapshots", () => {
    const control = createVizEditorControl();
    control.openExampleProject();

    const mutation = control.applyActions([
      {
        type: "layer.settings.set",
        payload: {
          layerId: "layer-background",
          path: "color",
          value: "#03111c",
        },
      },
      {
        type: "layer.input.set",
        payload: {
          layerId: "layer-bars",
          inputKey: "gain",
          valueSource: {
            kind: "literal",
            value: 0.35,
          },
        },
      },
    ]);

    expect(mutation.ok).toBe(true);
    expect(mutation.snapshot.session.revision).toBe(1);

    const frameInspection = control.inspectFrame(36);
    const debugSnapshot = control.createDebugSnapshot(36);

    expect(frameInspection.framePlan.issues).toHaveLength(0);
    expect(
      frameInspection.framePlan.layers.find((layer) => layer.layerId === "layer-bars")?.resolvedInputs.gain.value,
    ).toBe(0.35);
    expect(debugSnapshot.renderPlan.issues).toHaveLength(0);
    expect(debugSnapshot.svg).toContain("data-layer-id=\"layer-bars\"");
  });

  it("opens bundle-backed projects and exports a mutated working head", () => {
    const control = createVizNodeEditorControl();
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-editor-control-export-"));

    try {
      const snapshot = control.openBundleProject(exampleProjectBundleDirectoryUrl);
      expect(snapshot.source.kind).toBe("bundle");

      const mutation = control.applyAction({
        type: "graph.output.set",
        payload: {
          graphId: "graph-main-reactivity",
          output: {
            key: "barsGainOperator",
            nodeId: "node-bars-bass-scale",
            output: "value",
          },
        },
      });

      expect(mutation.ok).toBe(true);

      const exportResult = control.exportWorkingBundle(tempDirectory);
      const reloaded = loadLocalVizProjectBundle(tempDirectory);

      expect(exportResult.issues).toHaveLength(0);
      expect(reloaded.issues).toHaveLength(0);
      expect(reloaded.project.graphs?.[0]?.outputs.some((output) => output.key === "barsGainOperator")).toBe(true);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("keeps explicit preview and audio diagnostics without UI scraping", () => {
    const control = createVizEditorControl();
    control.openExampleProject();

    control.seekToFrame(48);
    control.play();
    control.pause();
    control.attachAudioSource({
      kind: "file",
      id: "audio-main",
      label: "Main Track",
    });
    control.setAudioAnalyzerState("active");
    control.setLiveInputAvailable(true);

    const snapshot = control.getSnapshot();

    expect(snapshot.session.previewState.currentFrame).toBe(48);
    expect(snapshot.session.previewState.isPlaying).toBe(false);
    expect(snapshot.audioDiagnostics.inputMode).toBe("hybrid");
    expect(snapshot.audioDiagnostics.usesLiveAudio).toBe(true);
    expect(snapshot.audioDiagnostics.usesBakedArtifacts).toBe(true);
  });

  it("exposes ui-state mutation, graph runtime inspection, and transport advancement", () => {
    const control = createVizEditorControl();
    control.openExampleProject();

    control.setUiState({
      activePanel: "graph",
      selectedLayerId: "layer-bars",
      selectedGraphId: "graph-main-reactivity",
    });

    control.seekToFrame(24);
    control.play();
    control.advanceBySeconds(0.5);
    control.pause();

    const snapshot = control.getSnapshot();
    const graphRuntime = control.inspectGraphRuntime();
    const expectedFrame = 24 + Math.floor(snapshot.transport.fps * 0.5);

    expect(snapshot.session.uiState.activePanel).toBe("graph");
    expect(snapshot.session.uiState.selectedLayerId).toBe("layer-bars");
    expect(snapshot.session.uiState.selectedGraphId).toBe("graph-main-reactivity");
    expect(snapshot.session.previewState.currentFrame).toBe(expectedFrame);

    expect(graphRuntime.frame).toBe(expectedFrame);
    expect(graphRuntime.graphs).toHaveLength(1);
    expect(graphRuntime.graphs[0]?.graphId).toBe("graph-main-reactivity");
    expect(graphRuntime.graphs[0]?.values).toMatchObject({
      barsBass: expect.any(Number),
      barsLoudness: expect.any(Number),
      bloomIntensity: expect.any(Number),
    });
    expect(graphRuntime.graphs[0]?.checkpoint?.frame).toBe(expectedFrame);
  });
});
