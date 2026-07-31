import { expect, test, type Locator, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type EditorSnapshot = {
  layerIds: string[];
  revision: number;
  currentFrame: number;
  durationFrames: number;
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
  }>;
  outputs: Array<{
    key: string;
    nodeId: string;
    output: string;
  }>;
};

const readEditorSnapshot = async (page: Page): Promise<EditorSnapshot> =>
  page.evaluate(() => {
    const debug = window.__vizEditorDebug;
    if (!debug) {
      throw new Error('Viz editor debug control is not mounted.');
    }

    const state = debug.vizSessionStore.getState();
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
      revision: state.project.revision,
      currentFrame: state.preview.transport.currentFrame,
      durationFrames: state.preview.transport.durationFrames,
      isPlaying: state.preview.transport.isPlaying,
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
  await expect
    .poll(async () =>
      page
        .getByTestId('node-network')
        .getByTestId('graph-node')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-graph-node-id')),
        ),
    )
    .toContain(`${expectedGraphId}-input-node`);
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
  message.includes('GL Driver Message') &&
  message.includes('GPU stall due to ReadPixels');

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

  const addedLocator = await getGraphNodeLocator(page, duplicateNode!.id);
  await addedLocator.click({ position: { x: 30, y: 5 } });
  await expect(addedLocator).toHaveClass(/selected/);
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
  await pastedLocator.click({
    button: 'right',
    position: { x: 30, y: 5 },
  });
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
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

  const projectFile = JSON.parse(
    await readFile(downloadPath!, 'utf8'),
  ) as Record<string, any>;
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
    const context = sample.getContext('2d');
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
    };
  });
  expect(imageStats).toMatchObject({ width: 1280, height: 720 });
  expect(imageStats.luminanceRange).toBeGreaterThan(10);
  expect(imageStats.nonblackRatio).toBeGreaterThan(0.01);

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
