import {
  createVizAudioFeatureBakeJobService,
  type VizAudioBakeSourceResolver,
} from "@viz-engine/bake";
import { describe, expect, it } from "vitest";

const pcm = {
  sampleRate: 8_000,
  channels: [new Float32Array(4_000)],
};

const request = {
  kind: "audio-feature-timeline" as const,
  sourceAssetId: "audio-main",
  profile: "standard" as const,
  fps: 10,
  fftSize: 256,
};

describe("audio bake job service", () => {
  it("owns an observable queued-to-artifact lifecycle", async () => {
    const eventStatuses: string[] = [];
    const service = createVizAudioFeatureBakeJobService({
      sourceResolver: {
        async resolve() {
          return {
            pcm,
            sourceContentIdentity: "sha256:job-source",
            decoderIdentity: "test-pcm",
          };
        },
      },
      createJobId: () => "job-audio-1",
      now: () => new Date("2026-07-30T10:00:00.000Z"),
      yieldEveryFrames: 2,
      yieldToHost: async () => {},
    });
    service.subscribe(({ job }) => {
      if (eventStatuses.at(-1) !== job.status) {
        eventStatuses.push(job.status);
      }
    });

    const queued = service.start(request, {
      kind: "agent",
      id: "test-agent",
    });
    expect(queued.status).toBe("queued");
    const completed = await service.wait(queued.id);

    expect(eventStatuses).toEqual([
      "queued",
      "validating",
      "running",
      "succeeded",
    ]);
    expect(completed).toMatchObject({
      id: "job-audio-1",
      status: "succeeded",
      inputIdentity: "sha256:job-source",
      requestedBy: { kind: "agent", id: "test-agent" },
      progress: { stage: "succeeded", progress: 1 },
      result: {
        ok: true,
        artifact: {
          kind: "audio-feature-timeline",
          sourceAssetId: "audio-main",
        },
      },
    });
    expect(service.list()).toHaveLength(1);
  });

  it("cancels source resolution without reporting false success", async () => {
    const blockingResolver: VizAudioBakeSourceResolver = {
      resolve(_request, signal) {
        return new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new Error("resolver aborted")),
            { once: true },
          );
        });
      },
    };
    const service = createVizAudioFeatureBakeJobService({
      sourceResolver: blockingResolver,
      createJobId: () => "job-audio-cancel",
      now: () => new Date("2026-07-30T10:00:00.000Z"),
    });
    const queued = service.start(request);
    await Promise.resolve();

    expect(service.cancel(queued.id)?.cancelRequestedAt).toBeDefined();
    await expect(service.wait(queued.id)).resolves.toMatchObject({
      status: "cancelled",
      progress: { stage: "cancelled" },
    });
  });

  it("fails closed when the resolved source identity changed", async () => {
    const service = createVizAudioFeatureBakeJobService({
      sourceResolver: {
        async resolve() {
          return {
            pcm,
            sourceContentIdentity: "sha256:actual",
          };
        },
      },
      createJobId: () => "job-audio-stale-source",
      now: () => new Date("2026-07-30T10:00:00.000Z"),
    });
    const queued = service.start({
      ...request,
      expectedSourceContentIdentity: "sha256:expected",
    });

    await expect(service.wait(queued.id)).resolves.toMatchObject({
      status: "failed",
      failure: { code: "source-identity-mismatch" },
    });
  });
});
