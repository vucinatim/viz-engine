import { CompDefinitionMap } from '@/components/comps';
import {
  studioComponentRegistry,
  studioNodeRegistry,
} from '@/lib/viz-capabilities';
import { createVizSessionRuntimePreviewFrame } from '@/lib/viz-session/runtime-preview';
import {
  createVizSessionRuntimePreviewPlan,
  resetVizSessionRuntimePreviewPlanCache,
} from '@/lib/viz-session/runtime-preview-plan';
import type {
  VizRenderRequest,
  VizRuntimeAudioFrameSnapshot,
} from '@viz-engine/contracts';
import { createVizRenderFrameSession } from '@viz-engine/render';
import { describe, expect, it } from 'vitest';
import { createTestProject } from './viz-session-test-utils';

const audio: VizRuntimeAudioFrameSnapshot = {
  frequencyData: new Uint8Array(128),
  timeDomainData: new Uint8Array(128),
  sampleRate: 44100,
  fftSize: 2048,
  minDecibels: -90,
  maxDecibels: -10,
  provenance: 'baked',
};
const request: VizRenderRequest = {
  schemaVersion: 1,
  kind: 'still',
  source: { projectId: 'test-project' },
  intent: 'preview',
  executorId: 'browser-webgl',
  outputLabel: 'Proof',
  viewport: { width: 1920, height: 1080 },
  quality: 'high',
  frame: 12,
  format: 'png',
};

describe('independent render frame sessions', () => {
  it('matches preview scene semantics at equal explicit inputs and exact dimensions', () => {
    const project = createTestProject(
      CompDefinitionMap.get('Fullscreen Shader')!,
    );
    const source = {
      project,
      resolvedAssets: [],
      resolvedArtifacts: [],
      contentIdentity: 'test',
    };
    const exportSession = createVizRenderFrameSession({
      source,
      request: { ...request, frame: 30 },
      registry: studioComponentRegistry,
      nodeRegistry: studioNodeRegistry,
      runtimeInputProvider: () => ({ audio }),
    });
    for (const frame of [12, 13, 4, 12]) {
      resetVizSessionRuntimePreviewPlanCache();
      const preview = createVizSessionRuntimePreviewPlan({
        project,
        projectRevision: 1,
        frame: createVizSessionRuntimePreviewFrame({
          currentFrame: frame,
          time: frame / project.timeline.fps,
          dt: 1 / project.timeline.fps,
          fps: project.timeline.fps,
          mode: 'live',
        }),
        viewport: request.viewport,
        audioFrameData: audio,
        isPlaying: true,
      });
      const rendered = exportSession.evaluate(frame);
      expect(rendered.viewport).toEqual(preview.viewport);
      expect(rendered.layers).toEqual(preview.layers);
      expect(rendered.graphResults).toEqual(preview.graphResults);
      expect(rendered.issues).toEqual([]);
      expect(rendered.frameContext.seed).toEqual(preview.frameContext.seed);
      expect(rendered.frameContext.mode).toBe('render');
    }
  });

  it('freezes project and viewport without clamping requested frames to the original duration', () => {
    const project = createTestProject();
    project.timeline.durationInFrames = 4;
    const source = {
      project,
      resolvedAssets: [],
      resolvedArtifacts: [],
      contentIdentity: 'test',
    };
    const settings = structuredClone(request);
    const session = createVizRenderFrameSession({
      source,
      request: settings,
      registry: studioComponentRegistry,
      nodeRegistry: studioNodeRegistry,
      runtimeInputProvider: () => ({ audio }),
    });
    project.viewport.width = 17;
    settings.viewport.width = 10;
    project.timeline.fps = 120;
    const plan = session.evaluate(12);
    expect(plan.viewport.width).toBe(1920);
    expect(plan.frameContext.frame).toBe(12);
    expect(plan.frameContext.durationInFrames).toBe(13);
    expect(plan.frameContext.fps).not.toBe(120);
    expect(() => session.evaluate(13)).toThrow('outside the render session');
  });
});
