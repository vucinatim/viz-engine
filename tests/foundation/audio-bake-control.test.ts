import { createVizAudioFeatureBakeJobService } from "@viz-engine/bake";
import {
  createVizControl,
  createVizSessionHost,
  executeVizControlRequest,
  VIZ_CONTROL_PROTOCOL_VERSION,
} from "@viz-engine/editor-control";
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizProjectDocument,
} from "@viz-engine/contracts";
import { describe, expect, it } from "vitest";

const project: VizProjectDocument = {
  schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
  projectId: "audio-job-project",
  name: "Audio Job Project",
  timeline: { fps: 10, durationInFrames: 10 },
  viewport: { width: 320, height: 180 },
  layerOrder: [],
  layers: [],
  assetRefs: [
    {
      id: "audio-main",
      kind: "audio",
      source: "local",
      label: "Main Audio",
    },
  ],
  artifactRefs: [],
};

describe("audio bake jobs through the shared VizControl", () => {
  it("registers job output as a resource and attaches it only by transaction", async () => {
    const jobs = createVizAudioFeatureBakeJobService({
      sourceResolver: {
        async resolve() {
          return {
            pcm: {
              sampleRate: 8_000,
              channels: [new Float32Array(4_000)],
            },
            sourceContentIdentity: "sha256:control-audio",
          };
        },
      },
      createJobId: () => "job-control-audio",
      now: () => new Date("2026-07-30T10:00:00.000Z"),
      yieldToHost: async () => {},
    });
    const host = createVizSessionHost({
      initialProject: {
        project,
        resolvedAssets: [
          {
            id: "audio-main",
            kind: "audio",
            source: "local",
            uri: "memory://audio-main",
          },
        ],
        resolvedArtifacts: [],
        source: { kind: "memory", label: "Audio job test" },
      },
      services: { audioFeatureBakeJobs: jobs },
    });
    const control = createVizControl({
      host,
      actor: { kind: "agent", id: "control-test-agent" },
    });

    const startResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: "request-start",
      operation: "audio-bake.start",
      request: {
        kind: "audio-feature-timeline",
        sourceAssetId: "audio-main",
        profile: "standard",
        fps: 10,
        fftSize: 256,
      },
    });
    expect(startResponse).toMatchObject({
      ok: true,
      result: {
        id: "job-control-audio",
        status: "queued",
        requestedBy: {
          kind: "agent",
          id: "control-test-agent",
        },
      },
    });

    await jobs.wait("job-control-audio");
    expect(control.getSnapshot().jobSummaries).toMatchObject([
      {
        id: "job-control-audio",
        status: "succeeded",
      },
    ]);
    expect(host.getSnapshot().resourceCounts.artifacts).toBe(1);
    expect(control.getWorkingProject().artifactRefs).toEqual([]);

    const attachResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: "request-attach",
      operation: "audio-bake.attach",
      jobId: "job-control-audio",
      expectedRevision: 0,
    });
    expect(attachResponse).toMatchObject({
      ok: true,
      result: {
        status: "applied",
        revision: 1,
        actor: {
          kind: "agent",
          id: "control-test-agent",
        },
      },
    });
    expect(control.getWorkingProject().artifactRefs).toMatchObject([
      {
        kind: "audio-feature-timeline",
        sourceAssetId: "audio-main",
      },
    ]);
  });

  it("rejects invalid bake parameters at the transport boundary", () => {
    const control = createVizControl();
    const response = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: "request-invalid-bake",
      operation: "audio-bake.start",
      request: {
        kind: "audio-feature-timeline",
        sourceAssetId: "audio-main",
        profile: "standard",
        fps: 30,
        fftSize: 300,
      },
    });

    expect(response).toMatchObject({
      ok: false,
      error: { code: "invalid-request" },
    });
  });
});
