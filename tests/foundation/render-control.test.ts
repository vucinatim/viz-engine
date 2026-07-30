import type { VizRenderOutputArtifact } from "@viz-engine/contracts";
import {
  createVizControl,
  createVizSessionHost,
  executeVizControlRequest,
  VIZ_CONTROL_PROTOCOL_VERSION,
} from "@viz-engine/editor-control";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import {
  createVizRenderJobService,
  createVizRenderSourceContentIdentity,
} from "@viz-engine/render";
import { describe, expect, it } from "vitest";

describe("render jobs through the shared VizControl", () => {
  it("starts, inspects, summarizes, and cancels render jobs generically", async () => {
    const sourceBase = {
      project: exampleProjectDocument,
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
    };
    const contentIdentity =
      createVizRenderSourceContentIdentity(sourceBase);
    const output: VizRenderOutputArtifact = {
      id: "render-output-control",
      kind: "render-output",
      role: "still",
      label: "Control Still",
      format: "svg",
      mimeType: "image/svg+xml",
      uri: "memory:render-output-control",
      contentIdentity: "sha256:control",
      byteLength: 100,
      width: 320,
      height: 180,
      frameCount: 1,
    };
    const jobs = createVizRenderJobService({
      sourceResolver: {
        resolve: async () => ({
          ...sourceBase,
          contentIdentity,
          revision: 0,
        }),
      },
      executors: [
        {
          id: "control-test",
          version: "control-test.v1",
          rendererIdentity: "control-test-renderer.v1",
          supports: () => true,
          execute: async () => ({
            outputs: [output],
            diagnostics: [],
            performance: {
              evaluatedFrameCount: 1,
              renderedFrameCount: 1,
              totalRenderMilliseconds: 1,
              averageRenderMilliseconds: 1,
              p95RenderMilliseconds: 1,
              maximumRenderMilliseconds: 1,
            },
          }),
        },
      ],
      createJobId: () => "render-control-job",
    });
    const host = createVizSessionHost({
      initialProject: {
        ...sourceBase,
        source: { kind: "memory", label: "Render control test" },
      },
      services: { renderJobs: jobs },
    });
    const control = createVizControl({
      host,
      actor: { kind: "agent", id: "render-control-agent" },
    });
    const start = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: "render-control-start",
      operation: "render.start",
      request: {
        schemaVersion: 1,
        kind: "still",
        source: {
          projectId: exampleProjectDocument.projectId,
          expectedRevision: 0,
          expectedContentIdentity: contentIdentity,
        },
        intent: "preview",
        executorId: "control-test",
        outputLabel: "Control Still",
        viewport: { width: 320, height: 180 },
        quality: "draft",
        frame: 12,
        format: "svg",
      },
    });

    expect(start).toMatchObject({
      ok: true,
      result: {
        id: "render-control-job",
        status: "queued",
        requestedBy: {
          kind: "agent",
          id: "render-control-agent",
        },
      },
    });
    await jobs.wait("render-control-job");
    expect(control.inspectJob("render-control-job")).toMatchObject({
      status: "succeeded",
      result: {
        outputs: [{ id: "render-output-control" }],
      },
    });
    expect(control.listJobs()).toEqual([
      expect.objectContaining({
        id: "render-control-job",
        status: "succeeded",
        outputArtifactIds: ["render-output-control"],
      }),
    ]);
  });

  it("rejects malformed render requests at the transport boundary", () => {
    const response = executeVizControlRequest(createVizControl(), {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: "invalid-render",
      operation: "render.start",
      request: {
        schemaVersion: 1,
        kind: "contact-sheet",
        source: { projectId: "project" },
        intent: "preview",
        executorId: "node-svg",
        outputLabel: "Invalid",
        viewport: { width: 0, height: 180 },
        quality: "draft",
        frames: [0, 0],
        format: "svg",
        unexpected: true,
      },
    });

    expect(response).toMatchObject({
      ok: false,
      error: { code: "invalid-request" },
    });
  });
});
