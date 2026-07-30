import { createBakePlan } from '@viz-engine/bake';
import { exampleProjectDocument } from '@viz-engine/example-projects';
import { describe, expect, it } from 'vitest';

describe('Viz bake planning', () => {
  it('creates a standard audio-feature bake request for audio assets', () => {
    const bakePlan = createBakePlan(exampleProjectDocument);

    expect(bakePlan.projectId).toBe(exampleProjectDocument.projectId);
    expect(bakePlan.requests).toEqual([
      {
        kind: 'audio-feature-timeline',
        sourceAssetId: 'asset-audio-main',
        profile: 'standard',
        fps: exampleProjectDocument.timeline.fps,
      },
    ]);
  });
});
