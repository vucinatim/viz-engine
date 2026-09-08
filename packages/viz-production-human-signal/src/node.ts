import {
  coreComponentCapabilityPack,
  coreComponents,
  STAGE_MODEL_ASSET_DEFINITIONS,
} from '@viz-engine/components-core';
import type { VizResolvedAsset } from '@viz-engine/contracts';
import {
  coreNodePackageIdentity,
  createCoreNodeRegistry,
} from '@viz-engine/nodes-core';
import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
  type VizExecutionManifestEnvironment,
} from '@viz-engine/project-bundle/node';
import {
  coreVizThreeRendererExtension,
  createVizThreeProgramRegistry,
  vizThreeBrowserBackendIdentity,
  vizThreeRendererPackageIdentity,
} from '@viz-engine/renderer-three';
import {
  validateProjectDocument,
  vizRuntimePackageIdentity,
} from '@viz-engine/runtime';
import { deepStrictEqual } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHumanSignalModelAssets } from './assets.js';
import { createHumanSignalDirection } from './direction.js';
import { humanSignalProvenance } from './identity.js';
import {
  createHumanSignalProductionMetadata,
  createHumanSignalProject,
} from './project.js';

const contentIdentity = (bytes: Uint8Array) =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

export const createHumanSignalExecutionEnvironment =
  (): VizExecutionManifestEnvironment => ({
    runtime: vizRuntimePackageIdentity,
    components: coreComponents.map((component) => ({
      component,
      capabilityPack: coreComponentCapabilityPack.manifest,
    })),
    nodePackages: [
      { ...coreNodePackageIdentity, nodes: createCoreNodeRegistry().list() },
    ],
    renderer: {
      package: vizThreeRendererPackageIdentity,
      backend: vizThreeBrowserBackendIdentity,
      programs: createVizThreeProgramRegistry([
        coreVizThreeRendererExtension,
      ]).list(),
    },
    metadata: createHumanSignalProductionMetadata(),
  });

/** Verify source identities before any output is written. Local URIs stay in IO. */
export const verifyHumanSignalSources = (repositoryRoot: string) => {
  const direction = createHumanSignalDirection();
  const inputs = [
    ...Object.values(humanSignalProvenance),
    {
      path: direction.music.sourcePath,
      contentIdentity: direction.music.sourceContentIdentity,
    },
    ...direction.models,
  ];
  const verified = inputs.map((input) => {
    const bytes = readFileSync(resolve(repositoryRoot, input.path));
    const actual = contentIdentity(bytes);
    if (actual !== input.contentIdentity)
      throw new Error(
        `Human Signal source identity mismatch: ${input.path}; expected ${input.contentIdentity}, received ${actual}`,
      );
    return {
      path: input.path,
      contentIdentity: actual,
      byteLength: bytes.byteLength,
    };
  });
  type Direction = ReturnType<typeof createHumanSignalDirection>;
  type Treatment = Omit<Direction, 'layers'> & {
    layers: Array<Direction['layers'][number] & { component: { id: string } }>;
  };
  const treatment = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, humanSignalProvenance.treatment.path),
      'utf8',
    ),
  ) as Treatment;
  const approvedProjection: Direction = {
    music: treatment.music,
    acts: treatment.acts,
    transitions: treatment.transitions,
    energyTargets: treatment.energyTargets,
    graphs: treatment.graphs,
    layers: treatment.layers.map(
      ({
        id,
        role,
        compositor,
        activeRanges,
        baselineSettings,
        authoringPresetId,
        component,
      }) => ({
        id,
        role,
        compositor,
        activeRanges,
        baselineSettings,
        authoringPresetId,
        componentId: component.id,
      }),
    ),
    models: treatment.models.map(({ path, contentIdentity, risk }) => ({
      path,
      contentIdentity,
      risk,
    })),
  };
  deepStrictEqual(
    direction,
    approvedProjection,
    'Human Signal direction differs from the approved treatment.',
  );
  return verified;
};

export const writeHumanSignalBundle = ({
  repositoryRoot,
  bundleDirectory,
}: {
  repositoryRoot: string;
  bundleDirectory: string;
}) => {
  const sources = verifyHumanSignalSources(repositoryRoot);
  const project = createHumanSignalProject();
  const validation = validateProjectDocument(project);
  if (!validation.ok)
    throw new Error(
      `Invalid Human Signal project: ${JSON.stringify(validation.issues)}`,
    );
  const approvedSources = new Map(
    sources.map((source) => [source.path, source.contentIdentity]),
  );
  const expectedAssets: Array<{ assetId: string; contentIdentity: string }> =
    [];
  const resolvedAssets: VizResolvedAsset[] = createHumanSignalModelAssets().map(
    (asset) => {
      const model = STAGE_MODEL_ASSET_DEFINITIONS.find(
        (definition) => definition.asset.id === asset.id,
      );
      if (!model)
        throw new Error(`Human Signal model registration missing: ${asset.id}`);
      const sourcePath = `public/models/stage/${model.asset.originalFileName}`;
      const expectedIdentity = approvedSources.get(sourcePath);
      if (!expectedIdentity)
        throw new Error(
          `Human Signal asset source is not approved: ${sourcePath}`,
        );
      if (asset.metadata?.contentIdentity !== expectedIdentity)
        throw new Error(
          `Human Signal model registry identity differs from approved source: ${asset.id}`,
        );
      expectedAssets.push({
        assetId: asset.id,
        contentIdentity: expectedIdentity,
      });
      return {
        id: asset.id,
        kind: asset.kind,
        source: asset.source,
        uri: pathToFileURL(resolve(repositoryRoot, sourcePath)).href,
        ...(asset.mimeType ? { mimeType: asset.mimeType } : {}),
      };
    },
  );
  deepStrictEqual(
    expectedAssets.map((asset) => asset.contentIdentity).sort(),
    createHumanSignalDirection()
      .models.map((model) => model.contentIdentity)
      .sort(),
    'Human Signal model assignments must cover every approved performer exactly once.',
  );
  const written = writeLocalVizProjectBundle({
    bundleDirectory,
    project,
    resolvedAssets,
    resolvedArtifacts: [],
    executionEnvironment: createHumanSignalExecutionEnvironment(),
  });
  if (written.issues.length || !written.executionManifest)
    throw new Error(
      `Human Signal bundle write failed: ${JSON.stringify(written.issues)}`,
    );
  const reopened = loadLocalVizProjectBundle(bundleDirectory);
  if (reopened.issues.length)
    throw new Error(
      `Human Signal bundle reopen failed: ${JSON.stringify(reopened.issues)}`,
    );
  deepStrictEqual(
    reopened.executionManifest?.assets,
    expectedAssets,
    'Human Signal bundled assets differ from the approved source identities.',
  );
  return { ...written, sources, realization: project.metadata?.realization };
};
