import {
  VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
  VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  type VizProjectBundleManifest,
  type VizProjectDocument,
  type VizResolvedArtifact,
  type VizResolvedAsset,
} from '@viz-engine/contracts';
import {
  VIZ_AUDIO_ARTIFACT_CONTAINER_ENCODING,
  decodeVizAudioArtifactContainer,
} from './audio-artifact-container.js';

export interface BrowserVizProjectBundle {
  bundleUrl: string;
  manifest: VizProjectBundleManifest;
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
}

const fetchResponse = async (
  url: URL,
  fetchImplementation: typeof fetch,
): Promise<Response> => {
  const response = await fetchImplementation(url);
  if (!response.ok) {
    throw new Error(
      `Could not load Viz bundle resource "${url}" (${response.status}).`,
    );
  }
  return response;
};

const resourceUrl = (bundleUrl: URL, path: string): URL =>
  new URL(path.replace(/^\/+/, ''), bundleUrl);

export const loadBrowserVizProjectBundle = async (
  bundleUrlInput: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<BrowserVizProjectBundle> => {
  const bundleUrl = new URL(
    bundleUrlInput.endsWith('/') ? bundleUrlInput : `${bundleUrlInput}/`,
    globalThis.location?.href,
  );
  const manifest = (await (
    await fetchResponse(
      resourceUrl(bundleUrl, 'bundle-manifest.json'),
      fetchImplementation,
    )
  ).json()) as VizProjectBundleManifest;
  if (
    manifest.kind !== VIZ_PROJECT_BUNDLE_MANIFEST_KIND ||
    manifest.schemaVersion !== VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION
  ) {
    throw new Error('Viz bundle manifest is incompatible.');
  }
  const project = (await (
    await fetchResponse(
      resourceUrl(bundleUrl, manifest.projectFile),
      fetchImplementation,
    )
  ).json()) as VizProjectDocument;
  const assetRefs = new Map(
    (project.assetRefs ?? []).map((asset) => [asset.id, asset]),
  );
  const artifactRefs = new Map(
    (project.artifactRefs ?? []).map((artifact) => [artifact.id, artifact]),
  );
  const resolvedAssets = manifest.assetEntries.map((entry) => {
    const reference = assetRefs.get(entry.assetId);
    if (!reference) {
      throw new Error(
        `Viz bundle asset "${entry.assetId}" is not declared by the project.`,
      );
    }
    return {
      id: entry.assetId,
      kind: entry.kind,
      source: reference.source,
      uri: resourceUrl(bundleUrl, entry.path).href,
      ...(entry.mimeType === undefined ? {} : { mimeType: entry.mimeType }),
      ...(entry.metadata === undefined ? {} : { metadata: entry.metadata }),
    } satisfies VizResolvedAsset;
  });
  const resolvedArtifacts = await Promise.all(
    manifest.artifactEntries.map(async (entry) => {
      const reference = artifactRefs.get(entry.artifactId);
      if (!reference) {
        throw new Error(
          `Viz bundle artifact "${entry.artifactId}" is not declared by the project.`,
        );
      }
      const url = resourceUrl(bundleUrl, entry.path);
      const response = await fetchResponse(url, fetchImplementation);
      const payload =
        entry.encoding === VIZ_AUDIO_ARTIFACT_CONTAINER_ENCODING
          ? decodeVizAudioArtifactContainer(
              new Uint8Array(await response.arrayBuffer()),
            )
          : await response.json();
      return {
        id: entry.artifactId,
        kind: entry.kind,
        uri: url.href,
        payload,
        ...(entry.metadata === undefined ? {} : { metadata: entry.metadata }),
      } satisfies VizResolvedArtifact;
    }),
  );

  return {
    bundleUrl: bundleUrl.href,
    manifest,
    project,
    resolvedAssets,
    resolvedArtifacts,
  };
};
