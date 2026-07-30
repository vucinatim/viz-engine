import type {
  VizRenderOutputArtifact,
  VizRenderRequest,
} from '@viz-engine/contracts';
import {
  createVizRenderJobService,
  type VizRenderExecutor,
  type VizRenderSource,
} from '@viz-engine/render';
import { describe, expect, it } from 'vitest';

const request: VizRenderRequest = {
  schemaVersion: 1,
  kind: 'still',
  source: {
    projectId: 'project-render-test',
    expectedRevision: 4,
    expectedContentIdentity: 'project-content:test',
  },
  intent: 'preview',
  executorId: 'test-executor',
  outputLabel: 'Test Still',
  viewport: {
    width: 320,
    height: 180,
    backgroundColor: '#000000',
  },
  quality: 'draft',
  frame: 12,
  format: 'svg',
};

const source: VizRenderSource = {
  project: {
    schemaVersion: '2.0.0-alpha.1',
    projectId: 'project-render-test',
    name: 'Render Test',
    timeline: {
      fps: 30,
      durationInFrames: 90,
    },
    viewport: {
      width: 320,
      height: 180,
    },
    layerOrder: [],
    layers: [],
  },
  resolvedAssets: [],
  resolvedArtifacts: [],
  contentIdentity: 'project-content:test',
  revision: 4,
};

const output: VizRenderOutputArtifact = {
  id: 'artifact-render-test',
  kind: 'render-output',
  role: 'still',
  label: 'Test Still',
  format: 'svg',
  mimeType: 'image/svg+xml',
  uri: 'memory:artifact-render-test',
  contentIdentity: 'sha256:test',
  byteLength: 128,
  width: 320,
  height: 180,
  frameCount: 1,
};

describe('Viz render job service', () => {
  it('resolves exact source identity and produces an observable result', async () => {
    const executor: VizRenderExecutor = {
      id: 'test-executor',
      version: 'test-executor.v1',
      rendererIdentity: 'test-renderer.v1',
      supports: () => true,
      execute: async ({ onProgress }) => {
        onProgress({
          stage: 'rendering',
          completed: 1,
          total: 1,
          progress: 1,
        });
        return {
          outputs: [output],
          diagnostics: [],
          performance: {
            evaluatedFrameCount: 1,
            renderedFrameCount: 1,
            totalRenderMilliseconds: 2,
            averageRenderMilliseconds: 2,
            p95RenderMilliseconds: 2,
            maximumRenderMilliseconds: 2,
          },
        };
      },
    };
    const statuses: string[] = [];
    const service = createVizRenderJobService({
      sourceResolver: {
        resolve: async () => source,
      },
      executors: [executor],
      createJobId: () => 'render-test-1',
    });
    service.subscribe(({ job }) => {
      statuses.push(job.status);
    });

    const queued = service.start(request, {
      kind: 'agent',
      id: 'render-test-agent',
    });
    const completed = await service.wait(queued.id);

    expect(completed.status).toBe('succeeded');
    expect(completed.inputIdentity).toBe('project-content:test');
    expect(completed.result?.outputs).toEqual([output]);
    expect(completed.result?.executionIdentity).toEqual({
      executorId: 'test-executor',
      executorVersion: 'test-executor.v1',
      projectContentIdentity: 'project-content:test',
      projectRevision: 4,
      rendererIdentity: 'test-renderer.v1',
    });
    expect(completed.requestedBy).toEqual({
      kind: 'agent',
      id: 'render-test-agent',
    });
    expect(statuses).toContain('queued');
    expect(statuses).toContain('validating');
    expect(statuses).toContain('running');
    expect(statuses.at(-1)).toBe('succeeded');
  });

  it('fails closed on source revision and content mismatches', async () => {
    let counter = 0;
    const service = createVizRenderJobService({
      sourceResolver: {
        resolve: async () => ({
          ...source,
          revision: 5,
          contentIdentity: 'project-content:changed',
        }),
      },
      executors: [
        {
          id: 'test-executor',
          version: 'test-executor.v1',
          rendererIdentity: 'test-renderer.v1',
          supports: () => true,
          execute: async () => {
            throw new Error('Executor should not run.');
          },
        },
      ],
      createJobId: () => `render-mismatch-${++counter}`,
    });

    const completed = await service.wait(service.start(request).id);

    expect(completed.status).toBe('failed');
    expect(completed.failure?.code).toBe('project-revision-mismatch');
  });

  it('cooperatively cancels a running executor', async () => {
    const executor: VizRenderExecutor = {
      id: 'test-executor',
      version: 'test-executor.v1',
      rendererIdentity: 'test-renderer.v1',
      supports: () => true,
      execute: async ({ signal }) => {
        await new Promise<void>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          });
        });
        throw new Error('unreachable');
      },
    };
    const service = createVizRenderJobService({
      sourceResolver: {
        resolve: async () => source,
      },
      executors: [executor],
      createJobId: () => 'render-cancel-1',
    });
    const queued = service.start(request);
    await new Promise((resolve) => setTimeout(resolve, 0));
    service.cancel(queued.id);

    const completed = await service.wait(queued.id);
    expect(completed.status).toBe('cancelled');
    expect(completed.result).toBeUndefined();
    expect(completed.cancelRequestedAt).toBeTypeOf('string');
  });
});
