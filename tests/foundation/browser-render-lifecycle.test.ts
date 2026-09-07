import { createVizBrowserRenderExecutor } from '@/lib/utils/browser-render-executor';
import { openVizBrowserRenderSession } from '@/lib/utils/browser-render-session';
import { createCoreComponentRegistry } from '@viz-engine/components-core';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import type { VizRenderExecutionContext } from '@viz-engine/render';
import { createCoreVizThreeProgramRegistry } from '@viz-engine/renderer-three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createTestProject } from './viz-session-test-utils';

const mocked = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@viz-engine/renderer-three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@viz-engine/renderer-three')>()),
  createVizThreeRenderHost: mocked.create,
}));
beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0 }) });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(new Blob(['asset']))),
  );
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export-owned');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const createContext = (signal: AbortSignal): VizRenderExecutionContext => {
  const project = createTestProject();
  return {
    request: {
      schemaVersion: 1,
      kind: 'still',
      source: { projectId: project.projectId },
      executorId: 'browser-webgl',
      intent: 'preview',
      outputLabel: 'abort-proof',
      quality: 'draft',
      frame: 0,
      format: 'png',
      viewport: { width: 320, height: 180 },
    },
    source: {
      project,
      resolvedAssets: [
        {
          id: 'image',
          kind: 'image',
          source: 'local',
          uri: 'blob:editor-owned',
        },
      ],
      resolvedArtifacts: [],
      contentIdentity: 'test',
    },
    signal,
    onProgress() {},
  };
};
const executor = () =>
  createVizBrowserRenderExecutor({
    openCaptureSession: (context) =>
      openVizBrowserRenderSession(context, {
        componentRegistry: createCoreComponentRegistry(),
        nodeRegistry: createCoreNodeRegistry(),
        programRegistry: createCoreVizThreeProgramRegistry(),
      }),
  });

it('aborts pending resource readiness, releases source and host, and rejects late rendering', async () => {
  let settle!: () => void;
  const ready = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const host = {
    whenReady: vi.fn(() => ready),
    dispose: vi.fn(),
    render: vi.fn(),
  };
  mocked.create.mockReturnValue(host);
  const controller = new AbortController();
  const execution = executor().execute(createContext(controller.signal));
  const rejected = expect(execution).rejects.toBeDefined();
  await vi.waitFor(() => expect(host.whenReady).toHaveBeenCalledOnce());
  controller.abort();
  await rejected;
  expect(host.dispose).toHaveBeenCalledOnce();
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
    'blob:export-owned',
  );
  settle();
  await Promise.resolve();
  await Promise.resolve();
  expect(host.render).not.toHaveBeenCalled();
  expect(host.dispose).toHaveBeenCalledOnce();
});

it('releases retained source if capture host construction fails', async () => {
  mocked.create.mockImplementation(() => {
    throw new Error('GPU allocation failed');
  });
  await expect(
    executor().execute(createContext(new AbortController().signal)),
  ).rejects.toThrow('GPU allocation failed');
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
    'blob:export-owned',
  );
});

it('releases retained source if session initialization fails', async () => {
  const failing = createVizBrowserRenderExecutor({
    openCaptureSession: async () => {
      throw new Error('source decode failed');
    },
  });
  await expect(
    failing.execute(createContext(new AbortController().signal)),
  ).rejects.toThrow('source decode failed');
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
    'blob:export-owned',
  );
});
