import { CompDefinitionMap } from '../../src/components/comps/index';
import {
  createEmptyVizProjectDocument,
  createVizLayerFromComp,
} from '../../src/lib/viz-session/project-adapters';
import { createVizSessionRuntimePreviewPlan } from '../../src/lib/viz-session/runtime-preview-plan';
import { createCoreComponentRegistry } from '@viz-engine/components-core';
import {
  createVizRenderPlan,
  createVizRuntimeSession,
} from '@viz-engine/runtime';

const FRAME_COUNT = 300;
const WARMUP_FRAME_COUNT = 30;
const FPS = 60;
const VIEWPORT = {
  width: 1280,
  height: 720,
};
const audioFrameData = {
  frequencyData: Uint8Array.from(
    { length: 1024 },
    (_, index) => Math.round((Math.sin(index / 18) * 0.5 + 0.5) * 255),
  ),
  timeDomainData: Uint8Array.from(
    { length: 1024 },
    (_, index) => Math.round((Math.sin(index / 11) * 0.5 + 0.5) * 255),
  ),
  sampleRate: 44100,
  fftSize: 2048,
};

const components = Array.from(CompDefinitionMap.values());
const layers = components.map((component, index) =>
  createVizLayerFromComp(component, `benchmark-layer-${index}`),
);
const project = {
  ...createEmptyVizProjectDocument({
    projectId: 'runtime-preview-plan-benchmark',
    name: 'Runtime Preview Plan Benchmark',
    timeline: {
      fps: FPS,
      durationInFrames: FRAME_COUNT + WARMUP_FRAME_COUNT,
    },
    viewport: {
      ...VIEWPORT,
      backgroundColor: '#000000',
    },
  }),
  layerOrder: layers.map((layer) => layer.id),
  layers,
};
const componentRegistry = createCoreComponentRegistry();

const percentile = (values: number[], amount: number) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * amount))]!;
};

const summarize = (samples: number[]) => ({
  meanMs:
    samples.reduce((total, sample) => total + sample, 0) / samples.length,
  medianMs: percentile(samples, 0.5),
  p95Ms: percentile(samples, 0.95),
  maxMs: Math.max(...samples),
});

const createFrame = (currentFrame: number) => ({
  currentFrame,
  time: currentFrame / FPS,
  dt: 1 / FPS,
  fps: FPS,
  mode: 'live' as const,
});

const runCanonicalSessionBenchmark = () => {
  const samples: number[] = [];

  for (
    let currentFrame = 0;
    currentFrame < FRAME_COUNT + WARMUP_FRAME_COUNT;
    currentFrame += 1
  ) {
    const start = performance.now();
    createVizSessionRuntimePreviewPlan({
      project,
      projectRevision: 1,
      frame: createFrame(currentFrame),
      viewport: VIEWPORT,
      audioFrameData,
      isPlaying: true,
    });
    const duration = performance.now() - start;
    if (currentFrame >= WARMUP_FRAME_COUNT) {
      samples.push(duration);
    }
  }

  return summarize(samples);
};

const runFormerPerLayerShapeBenchmark = () => {
  const samples: number[] = [];

  for (
    let currentFrame = 0;
    currentFrame < FRAME_COUNT + WARMUP_FRAME_COUNT;
    currentFrame += 1
  ) {
    const start = performance.now();

    for (const [index, layer] of layers.entries()) {
      const component = components[index]!;
      const configValues = component.config.getValues({
        audioSignal: audioFrameData.timeDomainData,
        frequencyAnalysis: {
          frequencyData: audioFrameData.frequencyData,
          sampleRate: audioFrameData.sampleRate,
          fftSize: audioFrameData.fftSize,
        },
        time: currentFrame / FPS,
      });
      const layerProject = {
        ...project,
        layerOrder: [layer.id],
        layers: [
          {
            ...layer,
            settings: structuredClone(configValues),
          },
        ],
      };
      const session = createVizRuntimeSession({
        project: layerProject,
        mode: 'live',
        seed: `former-preview-${layer.id}`,
      });
      createVizRenderPlan({
        session,
        frame: currentFrame,
        registry: componentRegistry,
        inputValues:
          layer.componentId === 'curve-spectrum'
            ? {
                [layer.id]: {
                  spectrum: Array.from(audioFrameData.frequencyData),
                  sampleRate: audioFrameData.sampleRate,
                  fftSize: audioFrameData.fftSize,
                },
              }
            : undefined,
      });
    }

    const duration = performance.now() - start;
    if (currentFrame >= WARMUP_FRAME_COUNT) {
      samples.push(duration);
    }
  }

  return summarize(samples);
};

const canonicalSession = runCanonicalSessionBenchmark();
const formerPerLayerShape = runFormerPerLayerShapeBenchmark();

console.log(
  JSON.stringify(
    {
      environment: {
        runtime: `Node ${process.version}`,
        platform: process.platform,
        architecture: process.arch,
      },
      fixture: {
        componentCount: components.length,
        frameCount: FRAME_COUNT,
        warmupFrameCount: WARMUP_FRAME_COUNT,
        fps: FPS,
        viewport: VIEWPORT,
      },
      canonicalSession,
      formerPerLayerShape,
      formerToCanonicalMeanRatio:
        formerPerLayerShape.meanMs / canonicalSession.meanMs,
      scope:
        'Measures runtime plan evaluation only; browser/WebGL presentation is validated separately.',
    },
    null,
    2,
  ),
);
