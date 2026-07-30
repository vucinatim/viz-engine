import { exampleProjectBundleDirectoryUrl } from "@viz-engine/example-projects/node";
import { createCoreComponentRegistry } from "@viz-engine/components-core";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { createVizRemotionSvgMarkup } from "@viz-engine/remotion-adapter";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyActionsToBundleProject,
  applyActionsToExampleProject,
  discoverLiveVizControl,
  exportBundleProject,
  exportExampleBundle,
  inspectBundleFrame,
  inspectExampleFrame,
  loadLocalVizProjectBundle,
  renderBundleSvg,
  requestLiveVizControl,
  runVizCli,
  VIZ_CONTROL_PROTOCOL_VERSION,
  validateBundleProject,
  validateExampleProject,
  writeLocalVizProjectBundle,
} from "@viz-engine/dev-cli";

describe("Viz local-first CLI surface", () => {
  it("publishes machine-readable help including the live control surface", async () => {
    const output = await runVizCli(["help"]);

    expect(output).toMatchObject({
      ok: true,
      command: "help",
      payload: {
        executable: "viz-dev",
      },
    });
    expect(
      (output.payload as { commands: { live: string[] } }).commands.live,
    ).toContain("live transact --transaction <json-file> [--url <origin>]");
    expect(
      (output.payload as { commands: { live: string[] } }).commands.live,
    ).toContain(
      "live bake-start --request <json-file> [--url <origin>]",
    );
    expect(
      (output.payload as { commands: { local: string[] } }).commands.local,
    ).toContain(
      "bundle bake-audio --dir <directory> --out <directory> [--asset-id <id>] [--fps <fps>] [--fft-size <size>] [--start <seconds>] [--duration <seconds>]",
    );
  });

  it("discovers and requests a live control bridge through injectable HTTP", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImplementation: typeof fetch = async (input, init) => {
      requests.push({
        url: String(input),
        ...(init === undefined ? {} : { init }),
      });
      if (String(input).endsWith("/discovery")) {
        return new Response(
          JSON.stringify({
            protocolVersion: 1,
            transport: {
              request: "/__viz-control__/request",
              events: "/__viz-control__/events",
            },
            editor: {
              connected: true,
              instanceId: "editor-test",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({
          protocolVersion: 1,
          id: "request-test",
          operation: "control.snapshot",
          ok: true,
          result: { revision: 7 },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const discovery = await discoverLiveVizControl({
      baseUrl: "http://127.0.0.1:4173",
      fetch: fetchImplementation,
    });
    const response = await requestLiveVizControl(
      {
        protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
        id: "request-test",
        operation: "control.snapshot",
      },
      {
        baseUrl: "http://127.0.0.1:4173",
        fetch: fetchImplementation,
      },
    );

    expect(discovery).toMatchObject({
      ok: true,
      discovery: {
        editor: {
          connected: true,
          instanceId: "editor-test",
        },
      },
    });
    expect(response).toMatchObject({
      ok: true,
      response: {
        result: {
          revision: 7,
        },
      },
    });
    expect(requests.map(({ url }) => url)).toEqual([
      "http://127.0.0.1:4173/__viz-control__/discovery",
      "http://127.0.0.1:4173/__viz-control__/request",
    ]);
    expect(requests[1]?.init).toMatchObject({
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
    });
  });

  it("validates the canonical example project", () => {
    const output = validateExampleProject();

    expect(output.ok).toBe(true);
    expect(output.command).toBe("example validate");
  });

  it("inspects a deterministic example frame", () => {
    const output = inspectExampleFrame(18);
    const payload = output.payload as {
      frameContext: { frame: number };
      layers: Array<{ layerId: string }>;
    };

    expect(output.ok).toBe(true);
    expect(payload.frameContext.frame).toBe(18);
    expect(payload.layers.map((layer) => layer.layerId)).toEqual([
      "layer-background",
      "layer-cover",
      "layer-bars",
      "layer-bloom",
    ]);
  });

  it("loads and validates the portable example bundle fixture", () => {
    const loaded = loadLocalVizProjectBundle(exampleProjectBundleDirectoryUrl);
    const output = validateBundleProject(exampleProjectBundleDirectoryUrl);

    expect(loaded.project.projectId).toBe("project-example-reactive-bars");
    expect(loaded.manifest.kind).toBe("viz.project-bundle-manifest.v1");
    expect(loaded.resolvedAssets).toHaveLength(2);
    expect(loaded.resolvedArtifacts).toHaveLength(1);
    expect(loaded.issues).toHaveLength(0);
    expect(output.ok).toBe(true);
    expect(output.command).toBe("bundle validate");
  });

  it("renders a deterministic frame plan from the portable example bundle fixture", () => {
    const output = inspectBundleFrame(exampleProjectBundleDirectoryUrl, 18);
    const payload = output.payload as {
      framePlan: {
        frameContext: { frame: number };
        layers: Array<{ layerId: string }>;
      };
    };

    expect(output.ok).toBe(true);
    expect(payload.framePlan.frameContext.frame).toBe(18);
    expect(payload.framePlan.layers.map((layer) => layer.layerId)).toEqual([
      "layer-background",
      "layer-cover",
      "layer-bars",
      "layer-bloom",
    ]);
  });

  it("renders matching SVG outputs from bundle-backed runtime and remotion paths", () => {
    const loaded = loadLocalVizProjectBundle(exampleProjectBundleDirectoryUrl);
    const svgOutput = renderBundleSvg(exampleProjectBundleDirectoryUrl, 36);
    const svgPayload = svgOutput.payload as { svg: string };
    const remotionSvg = createVizRemotionSvgMarkup({
      project: loaded.project,
      frame: 36,
      resolvedAssets: loaded.resolvedAssets,
      resolvedArtifacts: loaded.resolvedArtifacts,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
      seed: "cli-bundle-seed",
    });

    expect(svgOutput.ok).toBe(true);
    expect(svgPayload.svg).toContain("data-layer-id=\"layer-cover\"");
    expect(svgPayload.svg).toBe(remotionSvg);
  });

  it("exports the in-memory example project into a portable bundle", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-example-bundle-export-"));

    try {
      const output = exportExampleBundle(tempDirectory);
      const loaded = loadLocalVizProjectBundle(tempDirectory);

      expect(output.ok).toBe(true);
      expect(loaded.issues).toHaveLength(0);
      expect(loaded.project.projectId).toBe("project-example-reactive-bars");
      expect(loaded.resolvedAssets).toHaveLength(2);
      expect(loaded.resolvedArtifacts).toHaveLength(1);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("roundtrips a loaded portable bundle through export and reload", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-bundle-roundtrip-"));

    try {
      const output = exportBundleProject(exampleProjectBundleDirectoryUrl, tempDirectory);
      const reloaded = loadLocalVizProjectBundle(tempDirectory);
      const svgOutput = renderBundleSvg(tempDirectory, 36);

      expect(output.ok).toBe(true);
      expect(reloaded.issues).toHaveLength(0);
      expect(reloaded.project.graphs).toHaveLength(1);
      expect(svgOutput.ok).toBe(true);
      expect((svgOutput.payload as { svg: string }).svg).toContain("data-layer-id=\"layer-bars\"");
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("roundtrips a native model asset through the portable bundle", () => {
    const tempDirectory = mkdtempSync(
      join(tmpdir(), "viz-model-bundle-roundtrip-"),
    );
    const modelBytes = Uint8Array.from([70, 66, 88, 0, 1, 2]);

    try {
      const project = {
        schemaVersion: 1 as const,
        projectId: "project-model-portability",
        name: "Model portability",
        timeline: { fps: 60, durationInFrames: 1 },
        viewport: { width: 640, height: 360 },
        layerOrder: [],
        layers: [],
        assetRefs: [
          {
            id: "asset-model-dancer",
            kind: "model" as const,
            source: "local" as const,
            label: "Dancer",
            mimeType: "application/vnd.autodesk.fbx",
            originalFileName: "dancer.fbx",
            metadata: {
              contentIdentity: "sha256:model-portability",
              modelFormat: "fbx",
            },
          },
        ],
      };
      const written = writeLocalVizProjectBundle({
        bundleDirectory: tempDirectory,
        project,
        resolvedAssets: [
          {
            id: "asset-model-dancer",
            kind: "model",
            source: "local",
            uri: "memory://dancer.fbx",
            mimeType: "application/vnd.autodesk.fbx",
            bytes: modelBytes.buffer,
            metadata: {
              contentIdentity: "sha256:model-portability",
              modelFormat: "fbx",
            },
          },
        ],
        resolvedArtifacts: [],
      });
      const loaded = loadLocalVizProjectBundle(tempDirectory);
      const modelEntry = written.manifest.assetEntries[0]!;

      expect(written.issues).toEqual([]);
      expect(modelEntry).toMatchObject({
        assetId: "asset-model-dancer",
        kind: "model",
        path: "assets/asset-model-dancer.fbx",
        metadata: {
          contentIdentity: "sha256:model-portability",
          modelFormat: "fbx",
        },
      });
      expect(loaded.issues).toEqual([]);
      expect(loaded.resolvedAssets[0]).toMatchObject({
        id: "asset-model-dancer",
        kind: "model",
        mimeType: "application/vnd.autodesk.fbx",
      });
      expect(
        readFileSync(join(tempDirectory, modelEntry.path)),
      ).toEqual(Buffer.from(modelBytes));
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("applies canonical project actions to the example project and exports the result", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-example-action-apply-"));

    try {
      const output = applyActionsToExampleProject(
        [
          {
            type: "layer.settings.set",
            payload: {
              layerId: "layer-background",
              path: "color",
              value: "#101e2d",
            },
          },
        ],
        tempDirectory,
      );
      const reloaded = loadLocalVizProjectBundle(tempDirectory);

      expect(output.ok).toBe(true);
      expect(reloaded.issues).toHaveLength(0);
      expect(
        reloaded.project.layers.find((layer) => layer.id === "layer-background")?.settings,
      ).toMatchObject({
        color: "#101e2d",
      });
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("applies canonical project actions to a portable bundle and keeps it renderable", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-bundle-action-apply-"));

    try {
      const output = applyActionsToBundleProject(
        exampleProjectBundleDirectoryUrl,
        [
          {
            type: "graph.output.set",
            payload: {
              graphId: "graph-main-reactivity",
              output: {
                key: "barsGainAlt",
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
                output: "barsGainAlt",
              },
            },
          },
        ],
        tempDirectory,
      );
      const reloaded = loadLocalVizProjectBundle(tempDirectory);
      const svgOutput = renderBundleSvg(tempDirectory, 36);

      expect(output.ok).toBe(true);
      expect(reloaded.issues).toHaveLength(0);
      expect(reloaded.project.graphs?.[0]?.outputs.some((output) => output.key === "barsGainAlt")).toBe(true);
      expect(svgOutput.ok).toBe(true);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
