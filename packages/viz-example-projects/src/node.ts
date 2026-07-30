import type { VizProjectBundleManifest } from '@viz-engine/contracts';
import {
  VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
  VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
} from '@viz-engine/contracts';
import { exampleAudioTimelineArtifact } from './index.js';

export const exampleProjectBundleDirectoryUrl = new URL(
  '../fixtures/example-reactive-bars-bundle/',
  import.meta.url,
).href;

export const exampleProjectBundleManifest: VizProjectBundleManifest = {
  schemaVersion: VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  kind: VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
  projectFile: 'project.json',
  assetEntries: [
    {
      assetId: 'asset-audio-main',
      kind: 'audio',
      path: 'assets/main-song-placeholder.mp3',
      mimeType: 'audio/mpeg',
    },
    {
      assetId: 'asset-image-cover',
      kind: 'image',
      path: 'assets/example-cover.svg',
      mimeType: 'image/svg+xml',
      metadata: {
        width: 720,
        height: 720,
      },
    },
  ],
  artifactEntries: [
    {
      artifactId: exampleAudioTimelineArtifact.id,
      kind: exampleAudioTimelineArtifact.kind,
      path: 'baked/audio-standard-main.json',
      metadata: {
        profile: exampleAudioTimelineArtifact.profile,
      },
    },
  ],
  metadata: {
    fixture: 'example-reactive-bars-bundle',
  },
};
