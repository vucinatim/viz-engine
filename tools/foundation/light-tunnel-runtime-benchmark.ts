import type {
  VizProjectDocument,
  VizRuntimeAudioFrameSnapshot,
} from '@viz-engine/contracts';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createVizSessionRuntimePreviewPlan,
  resetVizSessionRuntimePreviewPlanCache,
} from '../../src/lib/viz-session/runtime-preview-plan';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const projectPath = resolve(
  repositoryRoot,
  'public/projects/light-tunnel.vizengine.json',
);
const viewport = { width: 1280, height: 720 } as const;
const warmupFrameCount = Number.parseInt(
  process.env.VIZ_LIGHT_TUNNEL_WARMUP_FRAMES ?? '30',
  10,
);
const measuredFrameCount = Number.parseInt(
  process.env.VIZ_LIGHT_TUNNEL_MEASURED_FRAMES ?? '210',
  10,
);

const percentile = (samples: readonly number[], fraction: number): number => {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  ]!;
};

const summarize = (samples: readonly number[]) => ({
  meanMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
  medianMs: percentile(samples, 0.5),
  p95Ms: percentile(samples, 0.95),
  maximumMs: Math.max(...samples),
});

const createAudioFrame = (frame: number): VizRuntimeAudioFrameSnapshot => ({
  frequencyData: Uint8Array.from({ length: 1024 }, (_, index) =>
    Math.round(
      (Math.sin(index / 18 + frame / 13) * 0.36 +
        Math.sin(index / 47 - frame / 29) * 0.14 +
        0.5) *
        255,
    ),
  ),
  timeDomainData: Uint8Array.from({ length: 1024 }, (_, index) =>
    Math.round((Math.sin(index / 11 + frame / 9) * 0.5 + 0.5) * 255),
  ),
  sampleRate: 44_100,
  fftSize: 2_048,
  minDecibels: -90,
  maxDecibels: -10,
  provenance: 'live',
});

const bundle = JSON.parse(readFileSync(projectPath, 'utf8')) as {
  project: VizProjectDocument;
};
const project = bundle.project;
const frameCount = warmupFrameCount + measuredFrameCount;
const audioFrames = Array.from({ length: frameCount }, (_, frame) =>
  createAudioFrame(frame),
);
const samples: number[] = [];

resetVizSessionRuntimePreviewPlanCache();
for (let frame = 0; frame < frameCount; frame += 1) {
  const startedAt = performance.now();
  const plan = createVizSessionRuntimePreviewPlan({
    project,
    projectRevision: 1,
    frame: {
      currentFrame: frame,
      time: frame / project.timeline.fps,
      dt: 1 / project.timeline.fps,
      fps: project.timeline.fps,
      mode: 'live',
    },
    viewport,
    audioFrameData: audioFrames[frame]!,
    isPlaying: true,
  });
  const duration = performance.now() - startedAt;

  if (plan.issues.length > 0) {
    throw new Error(
      `Light Tunnel frame ${frame} failed: ${plan.issues
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  if (frame >= warmupFrameCount) {
    samples.push(duration);
  }
}
resetVizSessionRuntimePreviewPlanCache();

const report = {
  schemaVersion: 1,
  environment: {
    runtime: `Node ${process.version}`,
    platform: process.platform,
    architecture: process.arch,
  },
  fixture: {
    projectId: project.projectId,
    projectPath,
    fps: project.timeline.fps,
    viewport,
    warmupFrameCount,
    measuredFrameCount,
    layerCount: project.layers.length,
    graphCount: project.graphs?.length ?? 0,
    nodeCount:
      project.graphs?.reduce((total, graph) => total + graph.nodes.length, 0) ??
      0,
  },
  planning: summarize(samples),
  framePositionBuckets: Array.from(
    { length: Math.ceil(samples.length / 30) },
    (_, index) => {
      const firstSample = index * 30;
      const bucket = samples.slice(firstSample, firstSample + 30);
      return {
        firstFrame: warmupFrameCount + firstSample,
        lastFrame: warmupFrameCount + firstSample + bucket.length - 1,
        ...summarize(bucket),
      };
    },
  ),
  scope:
    'Canonical editor runtime-plan construction for the exact bundled Light Tunnel project; browser/WebGL presentation is measured separately.',
};

const output = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = process.env.VIZ_LIGHT_TUNNEL_PERFORMANCE_REPORT;
if (reportPath) {
  const absoluteReportPath = resolve(repositoryRoot, reportPath);
  mkdirSync(dirname(absoluteReportPath), { recursive: true });
  writeFileSync(absoluteReportPath, output, 'utf8');
}
process.stdout.write(output);
