import {
  VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
  VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  type VizProjectBundleManifest,
} from '@viz-engine/contracts';
import {
  exampleAudioTimelineArtifact,
  exampleProjectDocument,
} from '@viz-engine/example-projects';
import { loadBrowserVizProjectBundle } from '@viz-engine/project-bundle/browser';
import { describe, expect, it } from 'vitest';

describe('browser project bundle loader', () => {
  it('resolves project resources from a portable bundle URL', async () => {
    const manifest: VizProjectBundleManifest = {
      schemaVersion: VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
      kind: VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
      projectFile: 'project.json',
      assetEntries: (exampleProjectDocument.assetRefs ?? []).map((asset) => ({
        assetId: asset.id,
        kind: asset.kind,
        path: `assets/${asset.id}`,
      })),
      artifactEntries: [
        {
          artifactId: exampleAudioTimelineArtifact.id,
          kind: exampleAudioTimelineArtifact.kind,
          path: `baked/${exampleAudioTimelineArtifact.id}.json`,
          encoding: 'json',
        },
      ],
    };
    const responses = new Map<string, unknown>([
      ['https://viz.test/production/bundle-manifest.json', manifest],
      ['https://viz.test/production/project.json', exampleProjectDocument],
      [
        `https://viz.test/production/baked/${exampleAudioTimelineArtifact.id}.json`,
        exampleAudioTimelineArtifact,
      ],
    ]);
    const fetchImplementation: typeof fetch = async (input) => {
      const url = input instanceof URL ? input.href : String(input);
      const payload = responses.get(url);
      return payload === undefined
        ? new Response(null, { status: 404 })
        : Response.json(payload);
    };

    const bundle = await loadBrowserVizProjectBundle(
      'https://viz.test/production',
      fetchImplementation,
    );

    expect(bundle.bundleUrl).toBe('https://viz.test/production/');
    expect(bundle.project).toEqual(exampleProjectDocument);
    expect(bundle.resolvedAssets).toHaveLength(
      exampleProjectDocument.assetRefs?.length ?? 0,
    );
    expect(bundle.resolvedAssets[0]?.uri).toMatch(
      /^https:\/\/viz\.test\/production\/assets\//,
    );
    expect(bundle.resolvedArtifacts).toEqual([
      expect.objectContaining({
        id: exampleAudioTimelineArtifact.id,
        payload: exampleAudioTimelineArtifact,
      }),
    ]);
  });
});
