import { createStudioRenderSource } from '@/lib/viz-session/render-source';
import { STAGE_MODEL_ASSET_DEFINITIONS } from '@viz-engine/components-core';
import { createVizRenderSourceContentIdentity } from '@viz-engine/render';
import { expect, it } from 'vitest';
import { createTestProject } from './viz-session-test-utils';

it('binds source identity after bundled defaults resolve and preserves explicit assets', () => {
  const project = createTestProject();
  project.assetRefs = [STAGE_MODEL_ASSET_DEFINITIONS[0]!.asset];
  const resources = { project, resolvedAssets: [], resolvedArtifacts: [] };
  const source = createStudioRenderSource(resources, 7);
  expect(source.resolvedAssets).toHaveLength(1);
  expect(source.contentIdentity).toBe(
    createVizRenderSourceContentIdentity(source),
  );
  expect(source.contentIdentity).not.toBe(
    createVizRenderSourceContentIdentity(resources),
  );
  const supplied = { ...source.resolvedAssets[0]!, uri: 'blob:authored-model' };
  const explicit = createStudioRenderSource(
    { ...resources, resolvedAssets: [supplied] },
    8,
  );
  expect(explicit.resolvedAssets).toEqual([supplied]);
  expect(explicit.contentIdentity).toBe(
    createVizRenderSourceContentIdentity(explicit),
  );
});
