import { expect, test, type Locator, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type EditorSnapshot = {
  layerIds: string[];
  layerOrder: string[];
  revision: number;
  currentFrame: number;
  durationFrames: number;
  fps: number;
  isPlaying: boolean;
  graphBindingParameterId?: string;
  graphBindingGraphId?: string;
};

type GraphSnapshot = {
  id: string;
  nodes: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    inputs: Record<
      string,
      {
        kind: string;
        nodeId?: string;
        output?: string;
      }
    >;
  }>;
  outputs: Array<{
    key: string;
    nodeId: string;
    output: string;
  }>;
};

type TransportSynchronization = EditorSnapshot & {
  audioCurrentTime: number;
  audioPaused: boolean;
  renderedFrame?: number;
};

const readEditorSnapshot = async (page: Page): Promise<EditorSnapshot> =>
  page.evaluate(() => {
    const debug = window.__vizEditorDebug;
    if (!debug) {
      throw new Error('Viz editor debug control is not mounted.');
    }

    const state = debug.vizSessionStore.getState();
    const transport = debug.vizSessionHost.getSnapshot().transport;
    const project = state.project.workingProject;
    const graphBindingParameterId = project.layers
      .flatMap((layer) =>
        Object.entries(layer.inputs ?? {}).map(([inputKey, source]) => ({
          layerId: layer.id,
          inputKey,
          source,
        })),
      )
      .find(({ source }) => source.kind === 'graph-output');
    return {
      layerIds: project.layers.map((layer) => layer.id),
      layerOrder: [...project.layerOrder],
      revision: state.project.revision,
      currentFrame: transport.currentFrame,
      durationFrames: transport.durationFrames,
      fps: transport.fps,
      isPlaying: transport.isPlaying,
      graphBindingParameterId:
        graphBindingParameterId === undefined
          ? undefined
          : `${graphBindingParameterId.layerId}:${graphBindingParameterId.inputKey}`,
      graphBindingGraphId:
        graphBindingParameterId?.source.kind === 'graph-output'
          ? graphBindingParameterId.source.graphId
          : undefined,
    };
  });

const readGraphSnapshot = async (
  page: Page,
  graphId: string,
): Promise<GraphSnapshot> =>
  page.evaluate((id) => {
    const graph = window.__vizEditorDebug?.vizSessionStore
      .getState()
      .project.workingProject.graphs?.find((candidate) => candidate.id === id);
    if (!graph) {
      throw new Error(`Graph "${id}" is not in the canonical project.`);
    }
    return {
      id: graph.id,
      nodes: graph.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        inputs: node.inputs,
      })),
      outputs: graph.outputs.map((output) => ({
        key: output.key,
        nodeId: output.nodeId,
        output: output.output,
      })),
    };
  }, graphId);

const openGraph = async (
  page: Page,
  parameterOrGraphId: string,
  expectedGraphId = parameterOrGraphId,
) => {
  await page.evaluate((parameterId) => {
    window.__vizEditorDebug?.editorControl.nodeEditor.openNetwork(parameterId);
    window.__vizEditorDebug?.editorControl.nodeEditor.focus();
  }, parameterOrGraphId);
  await expect
    .poll(async () =>
      page.evaluate(
        () => window.__vizEditorDebug?.nodeNetworkStore.getState().openNetwork,
      ),
    )
    .toBe(expectedGraphId);
  await expect(page.getByTestId('animation-builder')).toBeVisible();
  await expect(page.getByTestId('node-network')).toBeVisible();
  await expect(page.locator('.react-flow__node')).not.toHaveCount(0);
};

const getGraphNodeLocator = async (
  page: Page,
  nodeId: string,
): Promise<Locator> => {
  const nodes = page.getByTestId('node-network').getByTestId('graph-node');
  const count = await nodes.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = nodes.nth(index);
    if ((await candidate.getAttribute('data-graph-node-id')) === nodeId) {
      return candidate.locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " react-flow__node ")][1]',
      );
    }
  }
  const renderedIds = await nodes.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-graph-node-id')),
  );
  throw new Error(
    `Graph node "${nodeId}" is not rendered. Rendered IDs: ${JSON.stringify(renderedIds)}`,
  );
};

const connectGraphHandles = async (
  page: Page,
  source: Locator,
  target: Locator,
) => {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error('Graph connection handles must both be visible.');
  }
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 12,
    sourceBox.y + sourceBox.height / 2,
    { steps: 3 },
  );
  await expect(
    page.getByTestId('node-network').locator('.react-flow__connection'),
  ).toBeVisible();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
};

const pressPrimaryShortcut = async (page: Page, key: string) => {
  const isMac = await page.evaluate(() =>
    navigator.platform.toUpperCase().includes('MAC'),
  );
  await page.keyboard.press(`${isMac ? 'Meta' : 'Control'}+${key}`);
};

const waitForEditor = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('vizengine-has-seen-tutorial', 'true');
  });
  await page.goto('/?allowSmallViewport=1');
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await page.getByRole('menuitem', { name: 'Examples', exact: true }).click();
  await page.getByRole('menuitem', { name: 'simple-example' }).click();
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  await expect(page.locator('[data-renderer-container]')).toBeVisible();
};

const createTriangleGltf = (): Buffer => {
  const positions = Buffer.alloc(9 * Float32Array.BYTES_PER_ELEMENT);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) =>
    positions.writeFloatLE(value, index * Float32Array.BYTES_PER_ELEMENT),
  );
  return Buffer.from(
    JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      buffers: [
        {
          byteLength: positions.length,
          uri: `data:application/octet-stream;base64,${positions.toString(
            'base64',
          )}`,
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: positions.length,
          target: 34962,
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: 'VEC3',
          min: [0, 0, 0],
          max: [1, 1, 0],
        },
      ],
    }),
  );
};

const isKnownBrowserDiagnostic = (message: string) =>
  (message.includes('GL Driver Message') &&
    message.includes('GPU stall due to ReadPixels')) ||
  (message.startsWith('THREE.FBXLoader:') &&
    (message.includes('map is not supported in three.js') ||
      message.includes('more than 4 skinning weights')));

const readRuntimeCanvasSignal = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[data-runtime-preview-canvas]',
    );
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return 0;
    }
    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 36;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return 0;
    }
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let signal = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index + 3]! > 8 &&
        pixels[index]! + pixels[index + 1]! + pixels[index + 2]! > 12
      ) {
        signal += 1;
      }
    }
    return signal;
  });

const readRuntimeCanvasFingerprint = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[data-runtime-preview-canvas]',
    );
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Runtime preview canvas is not available.');
    }

    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 36;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Canvas fingerprint context is unavailable.');
    }
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let hash = 2_166_136_261;
    for (const channel of pixels) {
      hash ^= channel;
      hash = Math.imul(hash, 16_777_619);
    }
    return hash >>> 0;
  });

const readTransportSynchronization = async (
  page: Page,
): Promise<TransportSynchronization> =>
  page.evaluate(() => {
    const debug = window.__vizEditorDebug;
    const audio = document.querySelector('audio');
    if (!debug || !audio) {
      throw new Error('Editor transport dependencies are not mounted.');
    }

    const state = debug.vizSessionStore.getState();
    const transport = debug.vizSessionHost.getSnapshot().transport;
    return {
      layerIds: state.project.workingProject.layers.map((layer) => layer.id),
      revision: state.project.revision,
      currentFrame: transport.currentFrame,
      durationFrames: transport.durationFrames,
      fps: transport.fps,
      isPlaying: transport.isPlaying,
      audioCurrentTime: audio.currentTime,
      audioPaused: audio.paused,
      renderedFrame:
        debug.editorControl.preview.inspectRuntimePreview().lastCompletedFrame
          ?.currentFrame,
    };
  });

test('preserves canonical editing, history, graph, and transport behavior', async ({
  page,
}) => {
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  const initial = await readEditorSnapshot(page);
  expect(initial.layerIds).toHaveLength(3);

  const firstLayer = page.getByTestId('layer-card').first();
  await firstLayer.getByTestId('duplicate-layer').click();
  await expect(page.getByTestId('layer-card')).toHaveCount(4);

  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.history.undo(),
  );
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.history.redo(),
  );
  await expect(page.getByTestId('layer-card')).toHaveCount(4);

  const duplicated = await readEditorSnapshot(page);
  expect(duplicated.revision).toBeGreaterThan(initial.revision);
  const duplicateId = duplicated.layerIds.find(
    (layerId) => !initial.layerIds.includes(layerId),
  );
  expect(duplicateId).toBeDefined();
  await page
    .locator(`[data-layer-id="${duplicateId}"]`)
    .getByTestId('delete-layer')
    .click();
  await expect(page.getByTestId('layer-card')).toHaveCount(3);

  const graphParameterId = initial.graphBindingParameterId;
  expect(graphParameterId).toBeDefined();
  await openGraph(page, graphParameterId!, initial.graphBindingGraphId);

  await page.evaluate(() => {
    window.__vizEditorDebug?.editorControl.preview.setDurationFrames(180);
    window.__vizEditorDebug?.editorControl.preview.seekToFrame(30);
  });
  await expect
    .poll(async () => (await readEditorSnapshot(page)).durationFrames)
    .toBe(180);
  await expect
    .poll(async () => (await readEditorSnapshot(page)).currentFrame)
    .toBe(30);

  await page.evaluate(() => {
    window.__vizEditorDebug?.editorControl.nodeEditor.closeNetwork();
  });
  await expect(page.getByTestId('node-network')).toHaveCount(0);
  const player = page.getByTestId('preview-player');
  await player.hover();
  await page.getByTestId('preview-playback-toggle').click();
  await expect
    .poll(async () => (await readEditorSnapshot(page)).isPlaying)
    .toBe(true);
  await expect
    .poll(async () => (await readEditorSnapshot(page)).currentFrame)
    .toBeGreaterThan(30);
  await page.getByTestId('preview-playback-toggle').click();
  await expect
    .poll(async () => (await readEditorSnapshot(page)).isPlaying)
    .toBe(false);

  await page.screenshot({
    path: '.artifacts/playwright/editor-critical-journey.png',
    fullPage: true,
  });
  expect(diagnostics).toEqual([]);
});

test('keeps the authoring workspace continuous, focus-safe, and historically complete', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  await page.evaluate(() => {
    window.__vizEditorDebug?.editorControl.preview.pause();
    window.__vizEditorDebug?.editorControl.nodeEditor.closeNetwork();
  });

  const layersPanel = page.getByTestId('layers-panel');
  const horizontalHandle = page.getByTestId(
    'workspace-horizontal-resize-handle',
  );
  const initialPanelBox = await layersPanel.boundingBox();
  const handleBox = await horizontalHandle.boundingBox();
  expect(initialPanelBox).not.toBeNull();
  expect(handleBox).not.toBeNull();

  await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="layers-panel"]');
    const probe = { samples: [] as Array<{ time: number; width: number }> };
    (window as any).__workspaceResizeProbe = probe;
    if (panel) {
      const observer = new ResizeObserver(([entry]) => {
        probe.samples.push({
          time: performance.now(),
          width: entry?.contentRect.width ?? 0,
        });
      });
      observer.observe(panel);
      (window as any).__workspaceResizeObserver = observer;
    }
  });
  await page.mouse.move(
    handleBox!.x + handleBox!.width / 2,
    handleBox!.y + handleBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 150, handleBox!.y + 20, { steps: 30 });
  await page.mouse.up();

  const resizedPanelBox = await layersPanel.boundingBox();
  expect(resizedPanelBox!.width).toBeGreaterThan(initialPanelBox!.width + 80);
  const resizeSamples = await page.evaluate(() => {
    const probe = (window as any).__workspaceResizeProbe as {
      samples: Array<{ time: number; width: number }>;
    };
    (window as any).__workspaceResizeObserver?.disconnect();
    return probe.samples;
  });
  expect(
    new Set(resizeSamples.map((sample) => sample.width)).size,
  ).toBeGreaterThan(15);
  const activeResizeSamples = resizeSamples
    .filter(
      (sample, index) =>
        index === 0 || sample.width !== resizeSamples[index - 1]!.width,
    )
    .slice(1);
  const resizeIntervals = activeResizeSamples
    .slice(1)
    .map((sample, index) => sample.time - activeResizeSamples[index]!.time);
  if (process.env.VIZ_WORKSPACE_RESIZE) {
    const sortedResizeIntervals = resizeIntervals.toSorted(
      (left, right) => left - right,
    );
    const percentile = (fraction: number) =>
      sortedResizeIntervals[
        Math.floor((sortedResizeIntervals.length - 1) * fraction)
      ]!;
    const medianResizeInterval = percentile(0.5);
    const p95ResizeInterval = percentile(0.95);
    const maximumResizeInterval = sortedResizeIntervals.at(-1)!;
    console.log(
      `Workspace resize: ${activeResizeSamples.length} changed widths, ${medianResizeInterval.toFixed(2)} ms median, ${p95ResizeInterval.toFixed(2)} ms p95, ${maximumResizeInterval.toFixed(2)} ms maximum interval`,
    );
    expect(medianResizeInterval).toBeLessThan(25);
    expect(p95ResizeInterval).toBeLessThan(60);
    expect(maximumResizeInterval).toBeLessThan(120);
  }
  await expect(horizontalHandle).toHaveAttribute('aria-valuemin', '20');
  expect(await readRuntimeCanvasSignal(page)).toBeGreaterThan(0);

  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  const restoredPanelBox = await page.getByTestId('layers-panel').boundingBox();
  expect(
    Math.abs(restoredPanelBox!.width - resizedPanelBox!.width),
  ).toBeLessThan(12);

  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  const initialHistoryCapabilities = await page.evaluate(() => ({
    canUndo: window.__vizEditorDebug?.editorControl.history.canUndo() ?? false,
    canRedo: window.__vizEditorDebug?.editorControl.history.canRedo() ?? false,
  }));
  const undoMenuItem = page.getByRole('menuitem', { name: /Undo/ });
  const redoMenuItem = page.getByRole('menuitem', { name: /Redo/ });
  if (initialHistoryCapabilities.canUndo) {
    await expect(undoMenuItem).toBeEnabled();
  } else {
    await expect(undoMenuItem).toBeDisabled();
  }
  if (initialHistoryCapabilities.canRedo) {
    await expect(redoMenuItem).toBeEnabled();
  } else {
    await expect(redoMenuItem).toBeDisabled();
  }
  await page.keyboard.press('Escape');

  await page.getByTestId('viz-editor').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('Space');
  await expect
    .poll(async () => (await readEditorSnapshot(page)).isPlaying)
    .toBe(true);
  await page.keyboard.press('Space');
  await expect
    .poll(async () => (await readEditorSnapshot(page)).isPlaying)
    .toBe(false);

  await page.getByRole('menuitem', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save As/ }).click();
  const projectName = page.getByLabel('Project Name');
  await projectName.fill('focus-safe');
  const revisionBeforeInput = (await readEditorSnapshot(page)).revision;
  await projectName.press('Space');
  expect(await projectName.inputValue()).toBe('focus-safe ');
  await projectName.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z',
  );
  expect((await readEditorSnapshot(page)).revision).toBe(revisionBeforeInput);
  expect((await readEditorSnapshot(page)).isPlaying).toBe(false);
  await page.getByRole('button', { name: 'Cancel' }).click();

  await pressPrimaryShortcut(page, 'Shift+S');
  await expect(
    page.getByRole('dialog', { name: 'Save Project' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  const initial = await readEditorSnapshot(page);
  const firstLayer = page.getByTestId('layer-card').first();
  await firstLayer.getByTestId('duplicate-layer').click();
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /Undo/ })).toBeEnabled();
  await expect(page.getByRole('menuitem', { name: /Redo/ })).toBeDisabled();
  await page.keyboard.press('Escape');
  await pressPrimaryShortcut(page, 'Z');
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  await pressPrimaryShortcut(page, 'Shift+Z');
  await expect(page.getByTestId('layer-card')).toHaveCount(4);

  const duplicated = await readEditorSnapshot(page);
  const duplicateId = duplicated.layerIds.find(
    (layerId) => !initial.layerIds.includes(layerId),
  );
  expect(duplicateId).toBeDefined();
  await page
    .locator(`[data-layer-id="${duplicateId}"]`)
    .getByTestId('delete-layer')
    .click();
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  await pressPrimaryShortcut(page, 'Z');
  await expect(page.getByTestId('layer-card')).toHaveCount(4);

  const beforeReorder = await readEditorSnapshot(page);
  const topCard = page.getByTestId('layer-card').first();
  const settingsToggle = topCard.getByText('Settings', { exact: true });
  if (await topCard.getByTestId('layer-drag-handle').isHidden()) {
    await settingsToggle.click();
  }
  const dragHandle = topCard.getByTestId('layer-drag-handle');
  const dragHandleBox = await dragHandle.boundingBox();
  const reorderTargetBox = await page
    .getByTestId('layer-card')
    .nth(1)
    .boundingBox();
  expect(dragHandleBox).not.toBeNull();
  expect(reorderTargetBox).not.toBeNull();
  await page.mouse.move(
    dragHandleBox!.x + dragHandleBox!.width / 2,
    dragHandleBox!.y + dragHandleBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    reorderTargetBox!.x + reorderTargetBox!.width / 2,
    reorderTargetBox!.y + reorderTargetBox!.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await readEditorSnapshot(page)).layerOrder)
    .not.toEqual(beforeReorder.layerOrder);
  await pressPrimaryShortcut(page, 'Z');
  await expect
    .poll(async () => (await readEditorSnapshot(page)).layerOrder)
    .toEqual(beforeReorder.layerOrder);

  const noiseCard = page
    .getByTestId('layer-card')
    .filter({ hasText: 'Noise Shader' });
  if (await noiseCard.getByTestId('reset-layer-parameters').isHidden()) {
    await noiseCard.getByText('Settings', { exact: true }).click();
  }
  await noiseCard
    .getByRole('combobox', { name: /Apply a preset to Noise Shader/i })
    .click();
  await page.getByRole('option', { name: 'Init', exact: true }).click();
  const noiseLayerId = await noiseCard.getAttribute('data-layer-id');
  expect(noiseLayerId).not.toBeNull();
  await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const layer = window.__vizEditorDebug?.vizSessionStore
          .getState()
          .project.workingProject.layers.find(
            (candidate) => candidate.id === layerId,
          );
        return (layer?.settings.noise as { scale?: number } | undefined)?.scale;
      }, noiseLayerId),
    )
    .toBe(3);
  await page.evaluate((layerId) => {
    window.__vizEditorDebug?.editorControl.project.updateLayerValue(
      layerId!,
      ['noise', 'scale'],
      8.5,
    );
  }, noiseLayerId);
  await noiseCard.getByTestId('reset-layer-parameters').click();
  await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const layer = window.__vizEditorDebug?.vizSessionStore
          .getState()
          .project.workingProject.layers.find(
            (candidate) => candidate.id === layerId,
          );
        return (layer?.settings.noise as { scale?: number } | undefined)?.scale;
      }, noiseLayerId),
    )
    .toBe(3);
  await pressPrimaryShortcut(page, 'Z');
  await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const layer = window.__vizEditorDebug?.vizSessionStore
          .getState()
          .project.workingProject.layers.find(
            (candidate) => candidate.id === layerId,
          );
        return (layer?.settings.noise as { scale?: number } | undefined)?.scale;
      }, noiseLayerId),
    )
    .toBe(8.5);

  const graphParameterId = initial.graphBindingParameterId;
  expect(graphParameterId).toBeDefined();
  await openGraph(page, graphParameterId!, initial.graphBindingGraphId);
  await page.getByTestId('animation-builder').hover();
  await expect(page.getByTestId('history-context-indicator')).toHaveAttribute(
    'data-editor-focus',
    'graph',
  );
  await page.getByTestId('history-context-indicator').focus();
  await expect(
    page.getByRole('tooltip').getByTestId('history-context-description'),
  ).toContainText('one chronological project history');

  expect(diagnostics).toEqual([]);
});

test('keeps scrubbing, playback, audio, rendering, and loop boundaries synchronized', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.push(`pageerror: ${error.message}`),
  );

  await waitForEditor(page);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.vizSessionStore.getState().audio.session
            .source?.kind,
      ),
    )
    .toBe('media-element');
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const audio = document.querySelector('audio');
        return Boolean(
          audio &&
          audio.readyState >= HTMLMediaElement.HAVE_METADATA &&
          Number.isFinite(audio.duration) &&
          audio.duration > 1,
        );
      }),
    )
    .toBe(true);

  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.nodeEditor.closeNetwork(),
  );
  await expect(page.getByTestId('animation-builder')).toHaveCount(0);
  const player = page.getByTestId('preview-player');
  await player.hover();
  const seeker = page.getByTestId('preview-seeker');
  await expect(seeker).toBeVisible();
  await page.waitForTimeout(250);
  const bounds = await seeker.boundingBox();
  expect(bounds).not.toBeNull();

  const beforeScrub = await readTransportSynchronization(page);
  const seekerY = bounds!.y + bounds!.height / 2;
  await page.mouse.move(bounds!.x + bounds!.width * 0.1, seekerY);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.4, seekerY, {
    steps: 12,
  });
  await page.mouse.up();

  const scrubbed = await readTransportSynchronization(page);
  const expectedScrubFrame = Math.floor(scrubbed.durationFrames * 0.4);
  expect(Math.abs(scrubbed.currentFrame - expectedScrubFrame)).toBeLessThan(2);
  expect(
    Math.abs(scrubbed.audioCurrentTime * scrubbed.fps - scrubbed.currentFrame),
  ).toBeLessThan(2);
  expect(scrubbed.revision).toBe(beforeScrub.revision);
  await expect
    .poll(async () => (await readTransportSynchronization(page)).renderedFrame)
    .toBe(scrubbed.currentFrame);

  await page.getByTestId('preview-playback-toggle').click();
  await expect
    .poll(async () => (await readTransportSynchronization(page)).audioPaused)
    .toBe(false);
  await expect
    .poll(async () => (await readTransportSynchronization(page)).currentFrame)
    .toBeGreaterThan(scrubbed.currentFrame + 5);
  const playing = await readTransportSynchronization(page);
  expect(
    Math.abs(playing.audioCurrentTime * playing.fps - playing.currentFrame),
  ).toBeLessThan(4);
  expect(playing.renderedFrame).toBeGreaterThan(
    scrubbed.renderedFrame ?? scrubbed.currentFrame,
  );

  await page.mouse.move(bounds!.x + bounds!.width * 0.6, seekerY);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.7, seekerY, {
    steps: 8,
  });
  await page.mouse.up();
  const playingSeek = await readTransportSynchronization(page);
  const expectedPlayingSeekFrame = Math.floor(playingSeek.durationFrames * 0.7);
  expect(playingSeek.currentFrame).toBeGreaterThanOrEqual(
    expectedPlayingSeekFrame - 3,
  );
  expect(playingSeek.currentFrame).toBeLessThan(
    expectedPlayingSeekFrame + playingSeek.fps * 3,
  );
  expect(
    Math.abs(
      playingSeek.audioCurrentTime * playingSeek.fps - playingSeek.currentFrame,
    ),
  ).toBeLessThan(4);
  await expect
    .poll(async () => (await readTransportSynchronization(page)).currentFrame)
    .toBeGreaterThan(playingSeek.currentFrame + 3);

  const looped = await page.evaluate(
    () =>
      new Promise<{
        currentFrame: number;
        isPlaying: boolean;
        audioCurrentTime: number;
      }>((resolve, reject) => {
        const debug = window.__vizEditorDebug;
        const audio = document.querySelector('audio');
        if (!debug || !audio) {
          reject(new Error('Editor transport dependencies are not mounted.'));
          return;
        }

        let sawBoundaryApproach = false;
        let animationFrame = 0;
        const timeout = window.setTimeout(() => {
          cancelAnimationFrame(animationFrame);
          reject(
            new Error('Preview transport did not cross its loop boundary.'),
          );
        }, 5_000);
        const inspect = () => {
          const transport = debug.vizSessionHost.getSnapshot().transport;
          if (transport.currentFrame >= 115) {
            sawBoundaryApproach = true;
          }
          if (sawBoundaryApproach && transport.currentFrame < 90) {
            window.clearTimeout(timeout);
            cancelAnimationFrame(animationFrame);
            resolve({
              currentFrame: transport.currentFrame,
              isPlaying: transport.isPlaying,
              audioCurrentTime: audio.currentTime,
            });
            return;
          }
          animationFrame = requestAnimationFrame(inspect);
        };
        animationFrame = requestAnimationFrame(inspect);

        debug.editorControl.preview.pause();
        debug.editorControl.preview.setDurationFrames(120);
        debug.vizSessionHost.setLoop(true);
        debug.editorControl.preview.seekToFrame(115);
        debug.editorControl.preview.play();
      }),
  );
  expect(looped.currentFrame).toBeLessThan(90);
  expect(looped.isPlaying).toBe(true);
  expect(looped.audioCurrentTime).toBeLessThan(1.5);

  await page.evaluate(() => {
    const debug = window.__vizEditorDebug;
    debug?.editorControl.preview.pause();
    debug?.vizSessionHost.setLoop(false);
    debug?.editorControl.preview.seekToFrame(115);
    debug?.editorControl.preview.play();
  });
  await expect
    .poll(async () => (await readTransportSynchronization(page)).isPlaying)
    .toBe(false);
  const completed = await readTransportSynchronization(page);
  expect(completed.currentFrame).toBe(119);
  expect(completed.audioPaused).toBe(true);
  await expect
    .poll(async () => (await readTransportSynchronization(page)).renderedFrame)
    .toBe(completed.currentFrame);
  await page.evaluate(() =>
    window.__vizEditorDebug?.vizSessionHost.setLoop(true),
  );

  expect(diagnostics).toEqual([]);
});

test('discovers components and visibly loads every bundled sample', async ({
  page,
}) => {
  await waitForEditor(page);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.push(`pageerror: ${error.message}`),
  );

  const before = await readEditorSnapshot(page);
  const search = page.getByTestId('add-layer-search');
  await search.getByRole('combobox').click();
  await page
    .getByPlaceholder('Search visual compositions...')
    .fill('Curve Spectrum');
  const curveOption = page
    .locator('[cmdk-item]')
    .filter({ hasText: 'Curve Spectrum' });
  await expect(curveOption).toHaveCount(1);
  await expect(curveOption).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  const addedCard = page.getByTestId('layer-card').first();
  await expect(
    addedCard.getByRole('heading', { name: /Curve Spectrum/ }),
  ).toBeVisible();
  await expect(
    addedCard.getByRole('button', { name: 'Settings' }),
  ).toHaveAttribute('aria-expanded', 'true');
  const afterAdd = await readEditorSnapshot(page);
  expect(afterAdd.revision).toBe(before.revision + 1);
  expect(afterAdd.layerIds).toHaveLength(before.layerIds.length + 1);

  const samples = [
    { id: 'simple-example', layers: 3 },
    { id: 'layer-blending-showcase', layers: 4 },
    { id: 'light-tunnel', layers: 2 },
  ] as const;
  for (const sample of samples) {
    await page.getByRole('menuitem', { name: 'Examples', exact: true }).click();
    await page.getByRole('menuitem', { name: sample.id }).click();
    await expect(page.getByTestId('layer-card')).toHaveCount(sample.layers);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__vizEditorDebug?.editorControl.project.exportWorkingProject()
              .projectId,
        ),
      )
      .toBe(sample.id);
    await expect
      .poll(() => readRuntimeCanvasSignal(page), { timeout: 10_000 })
      .toBeGreaterThan(0);
  }

  await expect(page.locator('canvas[data-runtime-preview-canvas]')).toHaveCount(
    1,
  );
  expect(diagnostics).toEqual([]);
});

test('keeps layer diagnostics current and separate from scene output', async ({
  page,
}) => {
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.push(`pageerror: ${error.message}`),
  );

  await waitForEditor(page);
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.nodeEditor.closeNetwork(),
  );
  await expect(page.getByTestId('animation-builder')).toHaveCount(0);
  await page.evaluate(() => {
    const debugWindow = window as Window & {
      __layerDebugTexts?: string[];
    };
    debugWindow.__layerDebugTexts = [];
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      maxWidth,
    ) {
      if (this.canvas.dataset.testid === 'layer-debug-canvas') {
        debugWindow.__layerDebugTexts?.push(String(text));
      }
      if (maxWidth === undefined) {
        originalFillText.call(this, text, x, y);
      } else {
        originalFillText.call(this, text, x, y, maxWidth);
      }
    };
  });

  const before = await readEditorSnapshot(page);
  const beforeFingerprint = await readRuntimeCanvasFingerprint(page);
  const firstLayer = page.getByTestId('layer-card').first();
  const debugToggle = firstLayer.getByTestId('toggle-layer-debug');
  await expect(debugToggle).toHaveAttribute('aria-pressed', 'false');
  await debugToggle.click();
  await expect(debugToggle).toHaveAttribute('aria-pressed', 'true');
  const overlay = page.getByTestId('layer-debug-overlay');
  const debugCanvas = page.getByTestId('layer-debug-canvas');
  await expect(overlay).toBeVisible();
  await expect(debugCanvas).toBeVisible();
  await expect
    .poll(async () =>
      debugCanvas.evaluate((canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context || canvas.width === 0 || canvas.height === 0) {
          return 0;
        }
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let nontransparentPixels = 0;
        for (let index = 3; index < pixels.length; index += 4) {
          if (pixels[index]! > 0) {
            nontransparentPixels += 1;
          }
        }
        return nontransparentPixels;
      }),
    )
    .toBeGreaterThan(100);

  expect(await readRuntimeCanvasFingerprint(page)).toBe(beforeFingerprint);
  expect((await readEditorSnapshot(page)).revision).toBe(before.revision);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __layerDebugTexts?: string[];
            }
          ).__layerDebugTexts?.includes('⚙️ Config') ?? false,
      ),
    )
    .toBe(true);

  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.play(),
  );
  await expect
    .poll(async () => (await readEditorSnapshot(page)).currentFrame)
    .toBeGreaterThan(before.currentFrame + 60);
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.pause(),
  );
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const texts =
          (
            window as Window & {
              __layerDebugTexts?: string[];
            }
          ).__layerDebugTexts ?? [];
        return new Set(
          texts.filter((text) => /^(#[\da-f]{6}|rgba?\(|hsla?\()/i.test(text)),
        ).size;
      }),
    )
    .toBeGreaterThan(1);

  const projectContainsDebugState = await page.evaluate(() => {
    const project =
      window.__vizEditorDebug?.editorControl.project.exportWorkingProject();
    return project?.layers.some(
      (layer) =>
        'isDebugEnabled' in layer ||
        'showDebug' in layer ||
        'debugEnabled' in layer,
    );
  });
  expect(projectContainsDebugState).toBe(false);

  await debugToggle.click();
  await expect(page.getByTestId('layer-debug-overlay')).toHaveCount(0);
  expect((await readEditorSnapshot(page)).revision).toBe(before.revision);
  expect(diagnostics).toEqual([]);
});

test('keeps profiler measurements truthful, recordable, and bounded during playback', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.push(`pageerror: ${error.message}`),
  );

  await waitForEditor(page);
  await page.evaluate(() => {
    window.__vizEditorDebug?.editorControl.nodeEditor.closeNetwork();
    window.__vizEditorDebug?.editorControl.preview.play();
  });
  const before = await readEditorSnapshot(page);
  const countRuntimeCycles = async () => {
    const startingCycle = await page.evaluate(
      () =>
        window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
          .renderCycle ?? 0,
    );
    await page.waitForTimeout(1_500);
    return page.evaluate(
      (start) =>
        (window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
          .renderCycle ?? start) - start,
      startingCycle,
    );
  };
  const baselineCycles = await countRuntimeCycles();
  expect(baselineCycles).toBeGreaterThan(3);

  await page.getByRole('menuitem', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Performance' }).click();
  const profilerButton = page.getByRole('button', {
    name: 'Open performance profiler',
  });
  await expect(profilerButton).toBeVisible();
  await profilerButton.evaluate((button: HTMLButtonElement) => {
    button.focus();
    button.click();
  });
  await expect(
    page.getByRole('heading', { name: 'Performance', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Canonical Runtime')).toBeVisible();
  await expect
    .poll(async () => {
      const text = await page
        .getByText('Render Cadence')
        .locator('..')
        .innerText();
      return Number.parseFloat(text.match(/[\d.]+/)?.[0] ?? '0');
    })
    .toBeGreaterThan(0);
  await expect(page.getByText('Included in frame plan').first()).toBeVisible();
  await expect(page.getByText('Long-task Share')).toBeVisible();
  await expect(page.getByText('Frame Budget', { exact: true })).toHaveCount(0);

  const profiledCycles = await countRuntimeCycles();
  expect(profiledCycles).toBeGreaterThanOrEqual(
    Math.max(3, Math.floor(baselineCycles * 0.6)),
  );

  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.pause(),
  );
  await page
    .getByRole('button', { name: 'Performance Recorder' })
    .evaluate((button: HTMLButtonElement) => button.click());
  const recordingName = `Browser profiler ${Date.now()}`;
  const recordingNameInput = page.getByLabel('Name', { exact: true });
  await recordingNameInput.evaluate((input: HTMLInputElement, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, recordingName);
  await expect(recordingNameInput).toHaveValue(recordingName);
  await page
    .getByRole('button', { name: 'Start', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByText('Recording:', { exact: true })).toBeVisible();
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.play(),
  );
  await page.waitForTimeout(1_200);
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.pause(),
  );
  await page
    .getByRole('button', { name: 'Stop', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByText(recordingName, { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Stats', exact: true })
    .first()
    .evaluate((button: HTMLButtonElement) => button.click());

  const statsDialog = page.getByRole('dialog');
  await expect(
    statsDialog.getByRole('heading', { name: recordingName }),
  ).toBeVisible();
  await expect(
    statsDialog.getByText('Long-task Share', { exact: true }),
  ).toBeVisible();
  await expect(
    statsDialog.getByText('Frame Interval Statistics', { exact: true }),
  ).toBeVisible();
  await expect(
    statsDialog.getByText('Total Intervals Sampled', { exact: true }),
  ).toBeVisible();
  await expect(
    statsDialog.getByText('Frame Budget', { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(statsDialog).toHaveCount(0);

  await page
    .getByRole('button', { name: 'Reset profiler metrics' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page
    .getByRole('button', { name: 'Close profiler' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(profilerButton).toHaveCount(0);
  expect((await readEditorSnapshot(page)).revision).toBe(before.revision);
  expect(diagnostics).toEqual([]);
});

test('composites canonical layer alpha and blend modes in one runtime canvas', async ({
  page,
}) => {
  await waitForEditor(page);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.push(`pageerror: ${error.message}`),
  );

  await page.evaluate(() => {
    const debug = window.__vizEditorDebug;
    if (!debug) {
      throw new Error('Viz editor debug control is not mounted.');
    }
    const project = debug.editorControl.project.exportWorkingProject();
    project.projectId = 'browser-blend-proof';
    project.name = 'Browser Blend Proof';
    project.viewport = {
      width: 320,
      height: 180,
      backgroundColor: 'transparent',
    };
    project.layerOrder = ['blend-backdrop', 'blend-source'];
    project.layers = [
      {
        id: 'blend-backdrop',
        name: 'Strobe Light',
        componentId: 'strobe-light',
        enabled: true,
        opacity: 1,
        blendMode: 'normal',
        surface: { backgroundColor: 'transparent' },
        settings: {
          mode: 'Manual',
          color: 'rgb(64, 128, 192)',
          strength: 1,
        },
      },
      {
        id: 'blend-source',
        name: 'Strobe Light',
        componentId: 'strobe-light',
        enabled: true,
        opacity: 0.65,
        blendMode: 'normal',
        surface: { backgroundColor: 'transparent' },
        settings: {
          mode: 'Manual',
          color: 'rgb(192, 96, 32)',
          strength: 1,
        },
      },
    ];
    project.graphs = [];
    debug.editorControl.project.importWorkingProject(project);
  });
  await expect(page.getByTestId('layer-card')).toHaveCount(2);
  await expect(page.locator('canvas[data-runtime-preview-canvas]')).toHaveCount(
    1,
  );
  await expect(page.getByTestId('layer-mirror-canvas')).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const multiplier =
          window.__vizEditorDebug?.editorStore.getState()
            .resolutionMultiplier ?? 1;
        return Array.from(
          document.querySelectorAll<HTMLCanvasElement>(
            '[data-testid="layer-mirror-canvas"]',
          ),
        ).every(
          (canvas) =>
            canvas.width ===
              Math.max(1, Math.round(canvas.clientWidth * multiplier)) &&
            canvas.height ===
              Math.max(1, Math.round(canvas.clientHeight * multiplier)),
        );
      }),
    )
    .toBe(true);

  const mirrorPresentation = await page.evaluate(() => {
    const multiplier =
      window.__vizEditorDebug?.editorStore.getState().resolutionMultiplier ?? 1;
    return Array.from(
      document.querySelectorAll<HTMLCanvasElement>(
        '[data-testid="layer-mirror-canvas"]',
      ),
    ).map((canvas) => ({
      layerId: canvas.dataset.layerId,
      width: canvas.width,
      height: canvas.height,
      expectedWidth: Math.max(1, Math.round(canvas.clientWidth * multiplier)),
      expectedHeight: Math.max(1, Math.round(canvas.clientHeight * multiplier)),
      opacity: getComputedStyle(canvas).opacity,
    }));
  });
  expect(
    Object.fromEntries(
      mirrorPresentation.map((presentation) => [
        presentation.layerId,
        presentation,
      ]),
    ),
  ).toMatchObject({
    'blend-backdrop': {
      layerId: 'blend-backdrop',
      opacity: '1',
    },
    'blend-source': {
      layerId: 'blend-source',
      opacity: '1',
    },
  });

  const readCanvasCenter = (selector: string) =>
    page.evaluate((canvasSelector) => {
      const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
      if (!canvas) {
        return null;
      }
      const sample = document.createElement('canvas');
      sample.width = canvas.width;
      sample.height = canvas.height;
      const context = sample.getContext('2d', { willReadFrequently: true });
      if (!context) {
        return null;
      }
      context.drawImage(canvas, 0, 0);
      return [
        ...context.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
        ).data,
      ];
    }, selector);
  const isNearColor = (
    actual: number[] | null,
    expected: readonly number[],
    tolerance = 10,
  ) =>
    actual !== null &&
    actual.every(
      (channel, index) =>
        Math.abs(channel - (expected[index] ?? channel)) <= tolerance,
    );

  await expect
    .poll(async () =>
      isNearColor(
        await readCanvasCenter(
          '[data-testid="layer-mirror-canvas"][data-layer-id="blend-backdrop"]',
        ),
        [64, 128, 192, 255],
      ),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      isNearColor(
        await readCanvasCenter(
          '[data-testid="layer-mirror-canvas"][data-layer-id="blend-source"]',
        ),
        [192, 96, 32, 166],
      ),
    )
    .toBe(true);

  const sourceCard = page.locator(
    '[data-testid="layer-card"][data-layer-id="blend-source"]',
  );
  const visibilityToggle = sourceCard.getByTestId('toggle-layer-visibility');
  await visibilityToggle.click();
  await expect(page.getByTestId('layer-mirror-canvas')).toHaveCount(1);
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        enabled: window.__vizEditorDebug?.vizSessionStore
          .getState()
          .project.workingProject.layers.find(
            (layer) => layer.id === 'blend-source',
          )?.enabled,
        rendered:
          window.__vizEditorDebug?.editorControl.preview
            .inspectRuntimePreview()
            .lastRenderedLayerIds.includes('blend-source') ?? true,
      })),
    )
    .toEqual({ enabled: false, rendered: false });
  await expect
    .poll(async () =>
      isNearColor(
        await readCanvasCenter('canvas[data-runtime-preview-canvas]'),
        [64, 128, 192, 255],
      ),
    )
    .toBe(true);

  await visibilityToggle.click();
  await expect(page.getByTestId('layer-mirror-canvas')).toHaveCount(2);
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        enabled: window.__vizEditorDebug?.vizSessionStore
          .getState()
          .project.workingProject.layers.find(
            (layer) => layer.id === 'blend-source',
          )?.enabled,
        rendered:
          window.__vizEditorDebug?.editorControl.preview
            .inspectRuntimePreview()
            .lastRenderedLayerIds.includes('blend-source') ?? false,
      })),
    )
    .toEqual({ enabled: true, rendered: true });
  expect(
    await page.locator('canvas[data-runtime-preview-canvas]').count(),
  ).toBe(1);

  const blendModes = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
    'add',
  ] as const;

  for (const blendMode of blendModes) {
    const beforeCycle = await page.evaluate(
      () =>
        window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
          .renderCycle ?? 0,
    );
    await page.evaluate((mode) => {
      const debug = window.__vizEditorDebug;
      if (!debug) {
        throw new Error('Viz editor debug control is not mounted.');
      }
      const project = debug.editorControl.project.exportWorkingProject();
      const source = project.layers.find(
        (layer) => layer.id === 'blend-source',
      );
      if (!source) {
        throw new Error('Blend source layer is missing.');
      }
      source.blendMode = mode;
      debug.editorControl.project.importWorkingProject(project);
    }, blendMode);
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
              .renderCycle ?? 0,
        ),
      )
      .toBeGreaterThan(beforeCycle);

    const comparison = await page.evaluate((mode) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        'canvas[data-runtime-preview-canvas]',
      );
      if (!canvas) {
        throw new Error('Runtime preview canvas is not mounted.');
      }
      const sample = document.createElement('canvas');
      sample.width = canvas.width;
      sample.height = canvas.height;
      const sampleContext = sample.getContext('2d', {
        willReadFrequently: true,
      });
      if (!sampleContext) {
        throw new Error('Could not create the sample canvas.');
      }
      sampleContext.drawImage(canvas, 0, 0);
      const actual = [
        ...sampleContext.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
        ).data,
      ];

      const expectedCanvas = document.createElement('canvas');
      expectedCanvas.width = 1;
      expectedCanvas.height = 1;
      const expectedContext = expectedCanvas.getContext('2d', {
        willReadFrequently: true,
      });
      if (!expectedContext) {
        throw new Error('Could not create the reference canvas.');
      }
      expectedContext.fillStyle = 'rgb(64, 128, 192)';
      expectedContext.fillRect(0, 0, 1, 1);
      expectedContext.globalCompositeOperation =
        mode === 'add' ? 'lighter' : mode;
      expectedContext.globalAlpha = 0.65;
      expectedContext.fillStyle = 'rgb(192, 96, 32)';
      expectedContext.fillRect(0, 0, 1, 1);
      return {
        actual,
        expected: [...expectedContext.getImageData(0, 0, 1, 1).data],
      };
    }, blendMode);

    comparison.actual.forEach((channel, index) => {
      expect(
        Math.abs(channel - comparison.expected[index]!),
        `${blendMode} channel ${index}: ${comparison.actual.join(',')} vs ${comparison.expected.join(',')}`,
      ).toBeLessThanOrEqual(10);
    });
  }

  const beforeAlphaCycle = await page.evaluate(
    () =>
      window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
        .renderCycle ?? 0,
  );
  await page.evaluate(() => {
    const debug = window.__vizEditorDebug;
    if (!debug) {
      throw new Error('Viz editor debug control is not mounted.');
    }
    const project = debug.editorControl.project.exportWorkingProject();
    project.layerOrder = ['alpha-source'];
    project.layers = [
      {
        id: 'alpha-source',
        name: 'Solid Color',
        componentId: 'solid-color',
        enabled: true,
        opacity: 0.65,
        blendMode: 'normal',
        surface: { backgroundColor: 'transparent' },
        settings: { color: 'rgba(192, 96, 32, 0.5)' },
      },
    ];
    debug.editorControl.project.importWorkingProject(project);
  });
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
            .renderCycle ?? 0,
      ),
    )
    .toBeGreaterThan(beforeAlphaCycle);

  const alphaComparison = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[data-runtime-preview-canvas]',
    );
    if (!canvas) {
      throw new Error('Runtime preview canvas is not mounted.');
    }
    const sample = document.createElement('canvas');
    sample.width = canvas.width;
    sample.height = canvas.height;
    const sampleContext = sample.getContext('2d', {
      willReadFrequently: true,
    });
    if (!sampleContext) {
      throw new Error('Could not create the sample canvas.');
    }
    sampleContext.drawImage(canvas, 0, 0);
    const actual = [
      ...sampleContext.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
      ).data,
    ];

    const expectedCanvas = document.createElement('canvas');
    expectedCanvas.width = 1;
    expectedCanvas.height = 1;
    const expectedContext = expectedCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    if (!expectedContext) {
      throw new Error('Could not create the reference canvas.');
    }
    expectedContext.globalAlpha = 0.65;
    expectedContext.fillStyle = 'rgba(192, 96, 32, 0.5)';
    expectedContext.fillRect(0, 0, 1, 1);
    return {
      actual,
      expected: [...expectedContext.getImageData(0, 0, 1, 1).data],
    };
  });
  alphaComparison.actual.forEach((channel, index) => {
    expect(
      Math.abs(channel - alphaComparison.expected[index]!),
      `nested alpha channel ${index}: ${alphaComparison.actual.join(',')} vs ${alphaComparison.expected.join(',')}`,
    ).toBeLessThanOrEqual(3);
  });

  expect(diagnostics).toEqual([]);
});

test('attaches a portable model asset through the preserved editor and restores it', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const diagnostics: string[] = [];
  let phase = 'load';
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${phase}/${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  phase = 'add-morph-layer';
  const initialLayerIds = (await readEditorSnapshot(page)).layerIds;
  await page.getByText('Add New Layer', { exact: true }).click();
  await page
    .getByPlaceholder('Search visual compositions...')
    .fill('Morph Shapes');
  await page.getByText('Morph Shapes', { exact: true }).click();
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  phase = 'open-morph-settings';

  const added = await readEditorSnapshot(page);
  const morphLayerId = added.layerIds.find(
    (layerId) => !initialLayerIds.includes(layerId),
  );
  expect(morphLayerId).toBeDefined();
  const morphCard = page.locator(`[data-layer-id="${morphLayerId}"]`);
  await morphCard.getByText('Shape A Settings', { exact: true }).click();
  phase = 'set-model-shape';
  await page.evaluate((layerId) => {
    window.__vizEditorDebug?.editorControl.project.updateLayerValue(
      layerId!,
      ['shapeASettings', 'shape'],
      'model',
    );
  }, morphLayerId);
  await expect(morphCard.getByTestId('asset-file-input')).toHaveCount(1);

  const fileBytes = createTriangleGltf();
  phase = 'attach';
  await morphCard.getByTestId('asset-file-input').setInputFiles({
    name: 'portable-triangle.gltf',
    mimeType: 'model/gltf+json',
    buffer: fileBytes,
  });

  const attached = await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const debug = window.__vizEditorDebug;
        const project =
          debug?.vizSessionStore.getState().project.workingProject;
        const layer = project?.layers.find(
          (candidate) => candidate.id === layerId,
        );
        const value = (
          layer?.settings?.shapeASettings as Record<string, unknown> | undefined
        )?.modelUrl;
        const assetId =
          typeof value === 'string' && value.startsWith('asset:')
            ? value.slice('asset:'.length)
            : undefined;
        const ref = project?.assetRefs?.find((asset) => asset.id === assetId);
        const resolved = debug?.vizControl
          .getProjectResources()
          .resolvedAssets.find((asset) => asset.id === assetId);
        return {
          value,
          ref,
          resolvedBytes: resolved?.bytes?.byteLength,
          resolvedUri: resolved?.uri,
        };
      }, morphLayerId),
    )
    .toMatchObject({
      value: expect.stringMatching(/^asset:asset-[0-9a-f]{64}$/),
      ref: {
        kind: 'model',
        source: 'local',
        label: 'portable-triangle.gltf',
      },
      resolvedBytes: fileBytes.length,
      resolvedUri: expect.stringMatching(/^blob:/),
    });
  expect(attached).toBeUndefined();

  await expect(morphCard.getByTestId('asset-uri-input')).toHaveValue(
    /^asset:asset-[0-9a-f]{64}$/,
  );
  await page.waitForTimeout(300);
  phase = 'reload';
  await page.reload();
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const debug = window.__vizEditorDebug;
        if (!debug) {
          return undefined;
        }
        const layer = debug.vizSessionStore
          .getState()
          .project.workingProject.layers.find(
            (candidate) => candidate.id === layerId,
          );
        const value = (
          layer?.settings?.shapeASettings as Record<string, unknown> | undefined
        )?.modelUrl;
        const assetId =
          typeof value === 'string' && value.startsWith('asset:')
            ? value.slice('asset:'.length)
            : undefined;
        const resolved = debug.vizControl
          .getProjectResources()
          .resolvedAssets.find((asset) => asset.id === assetId);
        return {
          value,
          resolvedBytes: resolved?.bytes?.byteLength,
          usesBrowserLocalUri: value?.startsWith('idb:') ?? false,
        };
      }, morphLayerId),
    )
    .toMatchObject({
      value: expect.stringMatching(/^asset:asset-[0-9a-f]{64}$/),
      resolvedBytes: fileBytes.length,
      usesBrowserLocalUri: false,
    });

  expect(diagnostics).toEqual([]);
});

test('renders the complete authoring vocabulary and keeps continuous edits live until commit', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.push(`pageerror: ${error.message}`),
  );

  await waitForEditor(page);
  const observedKinds = new Set<string>();
  const observeVisibleKinds = async () => {
    const kinds = await page
      .getByTestId('component-setting-field')
      .evaluateAll((fields) =>
        fields
          .filter((field) => (field as HTMLElement).offsetParent !== null)
          .map((field) => field.getAttribute('data-setting-kind'))
          .filter((kind): kind is string => kind !== null),
      );
    kinds.forEach((kind) => observedKinds.add(kind));
  };
  const addLayer = async (name: string) => {
    const previousIds = (await readEditorSnapshot(page)).layerIds;
    await page.getByText('Add New Layer', { exact: true }).click();
    await page.getByPlaceholder('Search visual compositions...').fill(name);
    await page.getByText(name, { exact: true }).click();
    const nextIds = (await readEditorSnapshot(page)).layerIds;
    const layerId = nextIds.find((id) => !previousIds.includes(id));
    if (!layerId) throw new Error(`Could not identify added ${name} layer.`);
    return page.locator(
      `[data-testid="layer-card"][data-layer-id="${layerId}"]`,
    );
  };

  const morphCard = await addLayer('Morph Shapes');
  await morphCard.getByText('Shape A Settings', { exact: true }).click();
  const shapeField = morphCard.locator(
    '[data-setting-path="shapeASettings.shape"]',
  );
  await shapeField.getByRole('combobox', { name: 'Shape' }).click();
  await page.getByRole('option', { name: 'custom-text' }).click();

  const textField = morphCard.locator(
    '[data-setting-path="shapeASettings.text"]',
  );
  const textInput = textField.getByRole('textbox', { name: 'Custom Text' });
  await expect(textInput).toBeVisible();
  await observeVisibleKinds();
  const textLayerId = await morphCard.getAttribute('data-layer-id');
  const beforeText = await page.evaluate(() => ({
    revision:
      window.__vizEditorDebug?.vizSessionStore.getState().project.revision ??
      -1,
    renderCycle:
      window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
        .renderCycle ?? -1,
  }));
  await textInput.focus();
  await textInput.fill('LIVE V2');
  await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const debug = window.__vizEditorDebug;
        return {
          canonical: (
            debug?.vizSessionStore
              .getState()
              .project.workingProject.layers.find(
                (layer) => layer.id === layerId,
              )?.settings.shapeASettings as Record<string, unknown> | undefined
          )?.text,
          live: debug?.vizSessionHost.getLiveLayerSetting({
            layerId: layerId!,
            path: ['shapeASettings', 'text'],
          })?.value,
          revision: debug?.vizSessionStore.getState().project.revision,
          renderCycle:
            debug?.editorControl.preview.inspectRuntimePreview().renderCycle,
        };
      }, textLayerId),
    )
    .toMatchObject({
      canonical: '',
      live: 'LIVE V2',
      revision: beforeText.revision,
      renderCycle: expect.any(Number),
    });
  expect(
    await page.evaluate(
      () =>
        window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
          .renderCycle ?? -1,
    ),
  ).toBeGreaterThan(beforeText.renderCycle);
  await textInput.blur();
  await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const debug = window.__vizEditorDebug;
        return {
          value: (
            debug?.vizSessionStore
              .getState()
              .project.workingProject.layers.find(
                (layer) => layer.id === layerId,
              )?.settings.shapeASettings as Record<string, unknown> | undefined
          )?.text,
          revision: debug?.vizSessionStore.getState().project.revision,
          live: debug?.vizSessionHost.getLiveLayerSetting({
            layerId: layerId!,
            path: ['shapeASettings', 'text'],
          }),
        };
      }, textLayerId),
    )
    .toEqual({
      value: 'LIVE V2',
      revision: beforeText.revision + 1,
      live: undefined,
    });

  const positionField = morphCard.locator(
    '[data-setting-path="shapeASettings.position"]',
  );
  const xInput = positionField.getByRole('spinbutton', {
    name: 'Position X',
  });
  const scrubHandle = positionField
    .getByTitle('Drag to adjust (Shift=10x, Alt=0.1x). Click arrows to step.')
    .first();
  await scrubHandle.scrollIntoViewIfNeeded();
  const scrubBox = await scrubHandle.boundingBox();
  if (!scrubBox) throw new Error('Vector scrub handle is not visible.');
  const beforeVector = await readEditorSnapshot(page);
  await page.mouse.move(
    scrubBox.x + scrubBox.width / 2,
    scrubBox.y + scrubBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(scrubBox.x + scrubBox.width / 2, scrubBox.y - 40, {
    steps: 8,
  });
  expect((await readEditorSnapshot(page)).revision).toBe(beforeVector.revision);
  expect(Number(await xInput.inputValue())).toBeGreaterThan(0);
  await expect
    .poll(async () =>
      page.evaluate((layerId) => {
        const value =
          window.__vizEditorDebug?.vizSessionHost.getLiveLayerSetting({
            layerId: layerId!,
            path: ['shapeASettings', 'position'],
          })?.value as { x?: number } | undefined;
        return value?.x;
      }, textLayerId),
    )
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect
    .poll(async () => (await readEditorSnapshot(page)).revision)
    .toBe(beforeVector.revision + 1);

  await shapeField.getByRole('combobox', { name: 'Shape' }).click();
  await page.getByRole('option', { name: 'model' }).click();
  await expect(
    morphCard.locator('[data-setting-path="shapeASettings.modelUrl"]'),
  ).toBeVisible();

  const lightTunnelCard = await addLayer('Light Tunnel');
  await lightTunnelCard.getByText('Visual Style', { exact: true }).click();
  const paletteField = lightTunnelCard.locator(
    '[data-setting-path="appearance.colorPalette"]',
  );
  await expect(
    paletteField.getByRole('button', { name: 'Color', exact: true }),
  ).toHaveCount(2);
  const beforeList = await readEditorSnapshot(page);
  await paletteField.getByRole('button', { name: 'Add Color' }).click();
  await expect(
    paletteField.getByRole('button', { name: 'Color', exact: true }),
  ).toHaveCount(3);
  expect((await readEditorSnapshot(page)).revision).toBe(
    beforeList.revision + 1,
  );

  const stageCard = await addLayer('Stage Scene');
  await stageCard.getByText('Camera', { exact: true }).click();
  await expect(stageCard.getByTestId('component-action-field')).toBeVisible();

  await observeVisibleKinds();
  for (const kind of [
    'number',
    'color',
    'text',
    'file',
    'boolean',
    'select',
    'vector3',
    'list',
  ]) {
    expect(observedKinds.has(kind), `visible ${kind} setting`).toBe(true);
  }
  expect(diagnostics).toEqual([]);
});

test('authors canonical graph nodes directly with history, clipboard, and reload', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  const editor = await readEditorSnapshot(page);
  const parameterId = editor.graphBindingParameterId;
  const graphId = editor.graphBindingGraphId;
  expect(parameterId).toBeDefined();
  expect(graphId).toBeDefined();
  await openGraph(page, parameterId!, graphId);

  const initial = await readGraphSnapshot(page, graphId!);
  const graphCanvas = page.getByTestId('node-network');
  const canvasBox = await graphCanvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  const liveGraphValueSamples = await page.evaluate(async () => {
    const debug = window.__vizEditorDebug;
    if (!debug) {
      throw new Error('Viz editor debug control is not mounted.');
    }
    const samples: string[] = [];
    debug.editorControl.preview.play();
    for (let index = 0; index < 12; index += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      samples.push(
        [...document.querySelectorAll('[data-testid="graph-live-value"]')]
          .map((element) => element.textContent ?? '')
          .join('|'),
      );
    }
    debug.editorControl.preview.pause();
    return samples;
  });
  expect(new Set(liveGraphValueSamples).size).toBeGreaterThan(1);
  await expect(page.getByTestId('graph-live-output')).not.toHaveText('0.00');

  const viewport = graphCanvas.locator('.react-flow__viewport');
  const initialViewportTransform = await viewport.getAttribute('style');
  const revisionBeforeViewportNavigation = (await readEditorSnapshot(page))
    .revision;
  await graphCanvas.hover();
  await page.mouse.wheel(72, 48);
  await expect
    .poll(async () => viewport.getAttribute('style'))
    .not.toBe(initialViewportTransform);
  const pannedViewportTransform = await viewport.getAttribute('style');
  await graphCanvas.locator('.react-flow__controls-zoomin').click();
  await expect
    .poll(async () => viewport.getAttribute('style'))
    .not.toBe(pannedViewportTransform);
  expect((await readEditorSnapshot(page)).revision).toBe(
    revisionBeforeViewportNavigation,
  );
  await graphCanvas.locator('.react-flow__controls-fitview').click();

  const initialMathNode = initial.nodes.find((node) => node.type === 'Math');
  expect(initialMathNode).toBeDefined();
  const initialMathLocator = await getGraphNodeLocator(
    page,
    initialMathNode!.id,
  );
  const initialMathBox = await initialMathLocator.boundingBox();
  expect(initialMathBox).not.toBeNull();
  const revisionBeforeNodeMove = (await readEditorSnapshot(page)).revision;
  await page.mouse.move(initialMathBox!.x + 24, initialMathBox!.y + 6);
  await page.mouse.down();
  await page.mouse.move(initialMathBox!.x + 56, initialMathBox!.y + 18, {
    steps: 6,
  });
  await page.mouse.up();
  await expect
    .poll(
      async () =>
        (await readGraphSnapshot(page, graphId!)).nodes.find(
          (node) => node.id === initialMathNode!.id,
        )?.position,
    )
    .not.toEqual(initialMathNode!.position);
  expect((await readEditorSnapshot(page)).revision).toBe(
    revisionBeforeNodeMove + 1,
  );

  await graphCanvas.click({
    button: 'right',
    position: {
      x: canvasBox!.width * 0.82,
      y: canvasBox!.height * 0.82,
    },
  });
  await page.getByPlaceholder('Search nodes...').fill('Math');
  await page.getByRole('option', { name: 'Math', exact: true }).click();

  await expect
    .poll(async () => (await readGraphSnapshot(page, graphId!)).nodes.length)
    .toBe(initial.nodes.length + 1);
  const duplicated = await readGraphSnapshot(page, graphId!);
  const duplicateNode = duplicated.nodes.find(
    (node) => !initial.nodes.some((candidate) => candidate.id === node.id),
  );
  expect(duplicateNode).toBeDefined();
  expect(duplicateNode?.type).toBe('Math');

  await page.evaluate(
    (parameterId) =>
      window.__vizEditorDebug?.editorControl.history.undoNodeEditor(
        parameterId,
      ),
    graphId,
  );
  await expect
    .poll(async () => (await readGraphSnapshot(page, graphId!)).nodes.length)
    .toBe(initial.nodes.length);
  await page.evaluate(
    (parameterId) =>
      window.__vizEditorDebug?.editorControl.history.redoNodeEditor(
        parameterId,
      ),
    graphId,
  );
  await expect
    .poll(async () => (await readGraphSnapshot(page, graphId!)).nodes.length)
    .toBe(initial.nodes.length + 1);

  const addedMathLocator = await getGraphNodeLocator(page, duplicateNode!.id);
  const existingMathLocator = await getGraphNodeLocator(
    page,
    initialMathNode!.id,
  );
  const revisionBeforeConnection = (await readEditorSnapshot(page)).revision;
  await connectGraphHandles(
    page,
    addedMathLocator.getByLabel('Output Result (Number)'),
    existingMathLocator.getByLabel('Input A (Number)'),
  );
  await expect
    .poll(
      async () =>
        (await readGraphSnapshot(page, graphId!)).nodes.find(
          (node) => node.id === initialMathNode!.id,
        )?.inputs.a,
    )
    .toMatchObject({
      kind: 'node-output',
      nodeId: duplicateNode!.id,
      output: 'result',
    });
  expect((await readEditorSnapshot(page)).revision).toBe(
    revisionBeforeConnection + 1,
  );

  const revisionBeforeCycleAttempt = (await readEditorSnapshot(page)).revision;
  await connectGraphHandles(
    page,
    existingMathLocator.getByLabel('Output Result (Number)'),
    addedMathLocator.getByLabel('Input A (Number)'),
  );
  await expect(
    page.getByText('That connection would create a graph cycle.'),
  ).toBeVisible();
  expect((await readEditorSnapshot(page)).revision).toBe(
    revisionBeforeCycleAttempt,
  );

  await addedMathLocator.click({ position: { x: 30, y: 5 } });
  await expect(addedMathLocator).toHaveClass(/selected/);
  await pressPrimaryShortcut(page, 'c');
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.nodeGraphClipboardStore.getState().clipboard
            ?.nodes.length,
      ),
    )
    .toBe(1);
  await graphCanvas.click({
    button: 'right',
    position: {
      x: canvasBox!.width * 0.5,
      y: canvasBox!.height * 0.75,
    },
  });
  await page.getByRole('menuitem', { name: 'Paste', exact: true }).click();
  await expect
    .poll(async () => (await readGraphSnapshot(page, graphId!)).nodes.length)
    .toBe(initial.nodes.length + 2);

  const pasted = (await readGraphSnapshot(page, graphId!)).nodes.find(
    (node) =>
      node.id !== duplicateNode!.id &&
      !initial.nodes.some((candidate) => candidate.id === node.id),
  );
  expect(pasted).toBeDefined();
  const pastedLocator = await getGraphNodeLocator(page, pasted!.id);
  await pastedLocator.click({ position: { x: 30, y: 5 } });
  await expect(
    page.getByRole('button', { name: 'Delete selected graph nodes' }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Delete selected graph nodes' })
    .click();
  await expect
    .poll(async () => (await readGraphSnapshot(page, graphId!)).nodes.length)
    .toBe(initial.nodes.length + 1);

  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await openGraph(page, graphId!);
  await expect
    .poll(async () => {
      const graph = await readGraphSnapshot(page, graphId!);
      return graph.nodes.some((node) => node.id === duplicateNode!.id);
    })
    .toBe(true);

  const restoredDuplicate = await getGraphNodeLocator(page, duplicateNode!.id);
  await restoredDuplicate.click({
    button: 'right',
    position: { x: 30, y: 5 },
  });
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await expect
    .poll(async () => (await readGraphSnapshot(page, graphId!)).nodes.length)
    .toBe(initial.nodes.length);
  expect(
    (await readGraphSnapshot(page, graphId!)).outputs.some((output) =>
      output.nodeId.endsWith('-output-node'),
    ),
  ).toBe(false);

  const beforePreset = await readGraphSnapshot(page, graphId!);
  const revisionBeforePreset = (await readEditorSnapshot(page)).revision;
  await page.getByRole('combobox', { name: 'Load graph preset' }).click();
  await page
    .getByPlaceholder('Search presets...')
    .fill('Spectral Centroid Hue');
  await page.getByRole('option', { name: /Spectral Centroid Hue/ }).click();
  await expect
    .poll(async () => (await readGraphSnapshot(page, graphId!)).nodes.length)
    .toBe(4);
  expect((await readEditorSnapshot(page)).revision).toBe(
    revisionBeforePreset + 1,
  );
  await page.evaluate((parameterId) => {
    window.__vizEditorDebug?.editorControl.history.undoNodeEditor(parameterId);
  }, graphId);
  await expect
    .poll(async () => readGraphSnapshot(page, graphId!))
    .toEqual(beforePreset);
  expect(diagnostics).toEqual([]);
});

test('roundtrips a saved canonical project through the visible file workflow', async ({
  page,
}) => {
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  const initial = await readEditorSnapshot(page);
  await page
    .getByTestId('layer-card')
    .first()
    .getByTestId('duplicate-layer')
    .click();
  await expect(page.getByTestId('layer-card')).toHaveCount(4);

  await page.getByRole('menuitem', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save As/ }).click();
  await page.getByLabel('Project Name').fill('canonical-roundtrip');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'canonical-roundtrip.vizengine.json',
  );
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const projectText = await readFile(downloadPath!, 'utf8');
  const projectFile = JSON.parse(projectText) as Record<string, any>;
  expect(projectFile.version).toBe(projectFile.project.schemaVersion);
  expect(projectFile.project.layers).toHaveLength(4);
  expect(projectFile.project.graphs.length).toBeGreaterThan(0);
  expect(JSON.stringify(projectFile.project)).not.toContain('NodeNetwork');
  expect(projectFile.nodeEditorUi).toBeDefined();

  await page.getByRole('menuitem', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'New Project' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('layer-card')).toHaveCount(0);

  await page
    .locator('input[accept=".vizengine.json"]')
    .setInputFiles(downloadPath!);
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  const reopened = await readEditorSnapshot(page);
  expect(reopened.layerIds).toHaveLength(4);
  expect(reopened.layerIds).toEqual(expect.arrayContaining(initial.layerIds));
  expect(
    reopened.layerIds.find((layerId) => !initial.layerIds.includes(layerId)),
  ).toMatch(/^layer-/);

  const stableProject = await readEditorSnapshot(page);
  await page.locator('input[accept=".vizengine.json"]').setInputFiles({
    name: 'malformed.vizengine.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not-json'),
  });
  await expect(
    page.getByText(/Unexpected token|Expected property name/).last(),
  ).toBeVisible();
  expect(await readEditorSnapshot(page)).toEqual(stableProject);

  await page.locator('input[accept=".vizengine.json"]').setInputFiles({
    name: 'unsupported.vizengine.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ ...projectFile, version: 'viz-project@999' }),
    ),
  });
  await expect(
    page.getByText(/Unsupported project version "viz-project@999"/),
  ).toBeVisible();
  expect(await readEditorSnapshot(page)).toEqual(stableProject);

  await page.locator('input[accept=".vizengine.json"]').setInputFiles({
    name: 'malformed-graph.vizengine.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...projectFile,
        project: {
          ...projectFile.project,
          graphs: [
            ...projectFile.project.graphs,
            {
              id: 'malformed-graph',
              name: 'Malformed Graph',
              nodes: [
                {
                  id: 'target',
                  type: 'Math',
                  inputs: {
                    a: {
                      kind: 'node-output',
                      nodeId: 'missing-node',
                      output: 'result',
                    },
                  },
                },
              ],
              outputs: [],
            },
          ],
        },
      }),
    ),
  });
  await expect(
    page.getByText(/references missing upstream node "missing-node"/).last(),
  ).toBeVisible();
  expect(await readEditorSnapshot(page)).toEqual(stableProject);

  const rejectedDrop = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(['not a project'], 'notes.txt', { type: 'text/plain' }),
    );
    return transfer;
  });
  await page
    .getByTestId('project-dropzone')
    .dispatchEvent('drop', { dataTransfer: rejectedDrop });
  await expect(
    page.getByText('Choose one .vizengine.json project file.'),
  ).toBeVisible();
  expect(await readEditorSnapshot(page)).toEqual(stableProject);
  expect(diagnostics).toEqual([]);
});

test('exports a nonblank still through the visible editor workflow', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  await page.evaluate(() => {
    const debug = window.__vizEditorDebug!;
    const project = debug.editorControl.project.exportWorkingProject();
    project.projectId = 'still-export-proof';
    project.name = 'Still Export Proof';
    project.viewport = {
      width: 320,
      height: 180,
      backgroundColor: 'transparent',
    };
    project.layerOrder = ['still-alpha-source'];
    project.layers = [
      {
        id: 'still-alpha-source',
        name: 'Strobe Light',
        componentId: 'strobe-light',
        enabled: true,
        opacity: 0.65,
        blendMode: 'normal',
        surface: { backgroundColor: 'transparent' },
        settings: {
          mode: 'Manual',
          color: 'rgb(192, 96, 32)',
          strength: 1,
        },
      },
    ];
    project.graphs = [];
    debug.editorControl.project.importWorkingProject(project);
    debug.editorControl.preview.seekToFrame(23);
    debug.editorControl.preview.pause();
  });
  await expect(page.getByTestId('layer-card')).toHaveCount(1);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.editorControl.preview.inspectRuntimePreview()
            .lastRenderedLayerIds[0],
      ),
    )
    .toBe('still-alpha-source');
  const stateBeforeExport = await page.evaluate(() => {
    const debug = window.__vizEditorDebug!;
    return {
      project: debug.editorControl.project.exportWorkingProject(),
      revision: debug.vizSessionStore.getState().project.revision,
      transport: debug.vizSessionHost.getSnapshot().transport,
    };
  });
  await page.getByRole('menuitem', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Export Image...' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export Current Frame' });
  await expect(dialog).toBeVisible();

  const selectors = dialog.getByRole('combobox');
  await selectors.nth(0).click();
  await page.getByRole('option', { name: '720p (1280×720)' }).click();
  await selectors.nth(1).click();
  await page.getByRole('option', { name: 'PNG' }).click();
  await dialog.getByRole('button', { name: 'Capture Frame' }).click();
  const preview = dialog.getByRole('img', { name: 'Export preview' });
  await expect(preview).toBeVisible({ timeout: 30_000 });

  const imageStats = await preview.evaluate((image: HTMLImageElement) => {
    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 36;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Could not create image sampling context.');
    }
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let minimum = 255;
    let maximum = 0;
    let nonblack = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance =
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      minimum = Math.min(minimum, luminance);
      maximum = Math.max(maximum, luminance);
      if (luminance > 3) nonblack += 1;
    }
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      luminanceRange: maximum - minimum,
      nonblackRatio: nonblack / (pixels.length / 4),
      center: [
        ...context.getImageData(
          Math.floor(sample.width / 2),
          Math.floor(sample.height / 2),
          1,
          1,
        ).data,
      ],
    };
  });
  expect(imageStats).toMatchObject({ width: 1280, height: 720 });
  expect(imageStats.nonblackRatio).toBeGreaterThan(0.99);
  expect(imageStats.center[0]).toBeGreaterThanOrEqual(188);
  expect(imageStats.center[0]).toBeLessThanOrEqual(196);
  expect(imageStats.center[1]).toBeGreaterThanOrEqual(92);
  expect(imageStats.center[1]).toBeLessThanOrEqual(100);
  expect(imageStats.center[2]).toBeGreaterThanOrEqual(28);
  expect(imageStats.center[2]).toBeLessThanOrEqual(36);
  expect(imageStats.center[3]).toBeGreaterThanOrEqual(163);
  expect(imageStats.center[3]).toBeLessThanOrEqual(169);

  const stateAfterCapture = await page.evaluate(() => {
    const debug = window.__vizEditorDebug!;
    return {
      project: debug.editorControl.project.exportWorkingProject(),
      revision: debug.vizSessionStore.getState().project.revision,
      transport: debug.vizSessionHost.getSnapshot().transport,
    };
  });
  expect(stateAfterCapture).toEqual(stateBeforeExport);

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download' }).click();
  const download = await downloadPromise;
  const outputPath = await download.path();
  expect(outputPath).not.toBeNull();
  const bytes = await readFile(outputPath!);
  expect(Array.from(bytes.subarray(0, 8))).toEqual([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  expect(bytes.byteLength).toBeGreaterThan(10_000);
  expect(diagnostics).toEqual([]);
});

test('keeps canonical and rendered resource counts stable through bounded edit and playback churn', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.nodeEditor.closeNetwork(),
  );
  const readResourceSnapshot = () =>
    page.evaluate(() => {
      const debug = window.__vizEditorDebug;
      if (!debug) throw new Error('Viz editor debug control is not mounted.');
      const project = debug.vizSessionStore.getState().project.workingProject;
      const resources = debug.vizControl.getProjectResources();
      return {
        layers: project.layers.length,
        graphs: project.graphs?.length ?? 0,
        assetRefs: project.assetRefs?.length ?? 0,
        resolvedAssets: resources.resolvedAssets.length,
        resolvedArtifacts: resources.resolvedArtifacts.length,
        canvases: document.querySelectorAll('[data-renderer-container] canvas')
          .length,
      };
    });
  const baseline = await readResourceSnapshot();

  const churnStart = Date.now();
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const before = await readEditorSnapshot(page);
    await page
      .getByTestId('layer-card')
      .first()
      .getByTestId('duplicate-layer')
      .click();
    await expect(page.getByTestId('layer-card')).toHaveCount(4);
    const after = await readEditorSnapshot(page);
    const addedId = after.layerIds.find(
      (layerId) => !before.layerIds.includes(layerId),
    );
    expect(addedId).toBeDefined();
    await page
      .locator(`[data-layer-id="${addedId}"]`)
      .getByTestId('delete-layer')
      .click();
    await expect(page.getByTestId('layer-card')).toHaveCount(3);
  }
  expect(Date.now() - churnStart).toBeLessThan(40_000);

  const playbackToggle = page.getByRole('button', { name: 'Play/Pause' });
  for (let iteration = 0; iteration < 8; iteration += 1) {
    await page.evaluate(
      (frame) => {
        window.__vizEditorDebug?.editorControl.preview.seekToFrame(frame);
      },
      (iteration * 17) % 120,
    );
    await playbackToggle.click();
    await page.waitForTimeout(25);
    await playbackToggle.click();
  }
  await expect
    .poll(async () => (await readEditorSnapshot(page)).isPlaying)
    .toBe(false);
  await page.waitForTimeout(500);

  expect(await readResourceSnapshot()).toEqual(baseline);
  expect(diagnostics).toEqual([]);
});

test('exports and probes a short nonblank, nonfrozen video through the visible editor workflow', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text()) &&
      !message.text().includes('Wake Lock API not supported') &&
      !message.text().includes('Could not acquire wake lock')
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  const editorAudio = page.locator('#bottom-right-panel audio');
  await expect
    .poll(
      async () =>
        editorAudio.evaluate((audio) => {
          const duration = (audio as HTMLAudioElement).duration;
          return Number.isFinite(duration) ? duration : 0;
        }),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(1);

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export Video' });
  await expect(dialog).toBeVisible();

  const selectors = dialog.getByRole('combobox');
  await selectors.nth(0).click();
  await page.getByRole('option', { name: '720p (1280×720)' }).click();
  await selectors.nth(1).click();
  await page.getByRole('option', { name: '30 FPS' }).click();
  await selectors.nth(2).click();
  await page.getByRole('option', { name: 'Low (Smaller file)' }).click();

  const audioDuration = await editorAudio.evaluate(
    (audio) => (audio as HTMLAudioElement).duration,
  );
  const range = dialog.getByTestId('range-selector');
  const rangeBox = await range.boundingBox();
  const endHandleBox = await dialog
    .getByTestId('range-selector-end')
    .boundingBox();
  expect(rangeBox).not.toBeNull();
  expect(endHandleBox).not.toBeNull();
  await page.mouse.move(
    endHandleBox!.x + endHandleBox!.width / 2,
    endHandleBox!.y + endHandleBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    rangeBox!.x + rangeBox!.width * (1 / audioDuration),
    rangeBox!.y + rangeBox!.height / 2,
    { steps: 20 },
  );
  await page.mouse.up();
  await expect(dialog.getByText(/End: 0:0[12]\.\d/)).toBeVisible();
  await expect(dialog.getByText(/\([3-6]\d frames @ 30 FPS\)/)).toBeVisible();

  const downloadPromise = page.waitForEvent('download', { timeout: 240_000 });
  await dialog.getByRole('button', { name: 'Start Export' }).click();
  const download = await downloadPromise;
  const videoPath = await download.path();
  expect(videoPath).not.toBeNull();
  expect((await readFile(videoPath!)).byteLength).toBeGreaterThan(20_000);

  const { stdout: probeOutput } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate',
    '-of',
    'json',
    videoPath!,
  ]);
  const probe = JSON.parse(probeOutput);
  const videoStream = probe.streams.find(
    (stream: Record<string, unknown>) => stream.codec_type === 'video',
  );
  const audioStream = probe.streams.find(
    (stream: Record<string, unknown>) => stream.codec_type === 'audio',
  );
  expect(videoStream).toMatchObject({
    codec_name: 'h264',
    width: 1280,
    height: 720,
    avg_frame_rate: '30/1',
  });
  expect(audioStream).toBeDefined();
  expect(Number(probe.format.duration)).toBeGreaterThanOrEqual(1);
  expect(Number(probe.format.duration)).toBeLessThanOrEqual(2.1);

  const { stdout: frameHashes } = await execFileAsync('ffmpeg', [
    '-v',
    'error',
    '-i',
    videoPath!,
    '-an',
    '-vf',
    'fps=4',
    '-f',
    'framemd5',
    '-',
  ]);
  const hashes = frameHashes
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(',').at(-1)?.trim())
    .filter(Boolean);
  expect(hashes.length).toBeGreaterThanOrEqual(3);
  expect(new Set(hashes).size).toBeGreaterThan(1);
  expect(diagnostics).toEqual([]);
});
