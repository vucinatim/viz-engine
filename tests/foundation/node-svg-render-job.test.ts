import { createCoreComponentRegistry } from '@viz-engine/components-core';
import type { VizRenderRequest } from '@viz-engine/contracts';
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  createVizRenderJobService,
  createVizRenderSourceContentIdentity,
} from '@viz-engine/render';
import { createVizNodeSvgRenderExecutor } from '@viz-engine/render/node';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Node SVG render jobs', () => {
  it('materializes deterministic still and contact-sheet artifacts', async () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), 'viz-node-svg-render-'));
    tempDirectories.push(outputDirectory);
    const sourceBase = {
      project: exampleProjectDocument,
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
    };
    const contentIdentity = createVizRenderSourceContentIdentity(sourceBase);
    let jobCounter = 0;
    const service = createVizRenderJobService({
      sourceResolver: {
        resolve: async () => ({
          ...sourceBase,
          contentIdentity,
        }),
      },
      executors: [
        createVizNodeSvgRenderExecutor({
          outputDirectory,
          componentRegistry: createCoreComponentRegistry(),
          nodeRegistry: createCoreNodeRegistry(),
          seed: 'node-svg-render-test',
        }),
      ],
      createJobId: () => `node-svg-render-${++jobCounter}`,
    });
    const common = {
      schemaVersion: 1 as const,
      source: {
        projectId: exampleProjectDocument.projectId,
        expectedContentIdentity: contentIdentity,
      },
      intent: 'preview' as const,
      executorId: 'node-svg',
      viewport: {
        width: 320,
        height: 180,
        backgroundColor: '#000000',
      },
      quality: 'draft' as const,
    };
    const stillRequest: VizRenderRequest = {
      ...common,
      kind: 'still',
      outputLabel: 'Example Still',
      frame: 36,
      format: 'svg',
    };

    const first = await service.wait(service.start(stillRequest).id);
    const second = await service.wait(service.start(stillRequest).id);

    expect(first.status).toBe('succeeded');
    expect(second.status).toBe('succeeded');
    expect(first.result?.outputs[0]?.contentIdentity).toBe(
      second.result?.outputs[0]?.contentIdentity,
    );
    const stillOutput = first.result?.outputs[0];
    expect(stillOutput?.mimeType).toBe('image/svg+xml');
    const stillMarkup = readFileSync(fileURLToPath(stillOutput!.uri), 'utf8');
    expect(stillMarkup).toContain('Viz frame 36');
    expect(stillMarkup).toContain('<svg');
    expect(first.result?.performance.renderedFrameCount).toBe(1);

    const contactRequest: VizRenderRequest = {
      ...common,
      kind: 'contact-sheet',
      outputLabel: 'Example Contact Sheet',
      frames: [0, 18, 36, 54],
      columns: 2,
      gap: 4,
      format: 'svg',
    };
    const contact = await service.wait(service.start(contactRequest).id);

    expect(contact.status).toBe('succeeded');
    expect(contact.result?.outputs[0]).toMatchObject({
      role: 'contact-sheet',
      width: 644,
      height: 364,
      frameCount: 4,
    });
    const contactMarkup = readFileSync(
      fileURLToPath(contact.result!.outputs[0]!.uri),
      'utf8',
    );
    expect(contactMarkup).toContain('aria-label="Frame 0"');
    expect(contactMarkup).toContain('aria-label="Frame 54"');
    expect(contact.result?.performance.renderedFrameCount).toBe(4);
  });
});
