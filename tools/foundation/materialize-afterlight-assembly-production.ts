import {
  STAGE_MODEL_ASSET_DEFINITIONS,
  coreComponentCapabilityPack,
} from '@viz-engine/components-core';
import {
  coreNodePackageIdentity,
  createCoreNodeRegistry,
} from '@viz-engine/nodes-core';
import {
  AFTERLIGHT_ASSEMBLY_AUDIO_ASSET_ID,
  afterlightAssemblyAudioAssetRef,
  createAfterlightAssemblyProject,
} from '@viz-engine/production-afterlight-assembly';
import {
  coreVizThreeRendererExtension,
  createVizThreeProgramRegistry,
  vizThreeBrowserBackendIdentity,
  vizThreeRendererPackageIdentity,
} from '@viz-engine/renderer-three';
import { vizRuntimePackageIdentity } from '@viz-engine/runtime';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  finalizeAudioProductionBundle,
  prepareAudioProductionBundle,
} from './audio-production-bundle.js';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

const readArgument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};

const requireArgument = (name: string): string => {
  const value = readArgument(name);
  if (!value) throw new Error(`Missing ${name} argument.`);
  return value;
};

const print = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const prepare = () =>
  prepareAudioProductionBundle({
    production: 'afterlight-assembly',
    outputDirectory: resolve(requireArgument('--out')),
    sourcePath: resolve(repoRoot, 'public/music/[DnB] Dancefloor DnB.mp3'),
    derivativePath: resolve(
      repoRoot,
      '.artifacts/afterlight-assembly/staging/afterlight-dancefloor-dnb-60s-72s.mp3',
    ),
    sourceStartSeconds: 60,
    durationSeconds: 12,
    audioAssetRef: afterlightAssemblyAudioAssetRef,
    backgroundColor: '#030108',
  });

const finalize = () => {
  const componentRegistry = coreComponentCapabilityPack;
  const nodeRegistry = createCoreNodeRegistry();
  const rendererRegistry = createVizThreeProgramRegistry([
    coreVizThreeRendererExtension,
  ]);

  return finalizeAudioProductionBundle({
    production: 'afterlight-assembly',
    sourceDirectory: resolve(requireArgument('--dir')),
    outputDirectory: resolve(requireArgument('--out')),
    audioAssetId: AFTERLIGHT_ASSEMBLY_AUDIO_ASSET_ID,
    createProject: createAfterlightAssemblyProject,
    additionalResolvedAssets: STAGE_MODEL_ASSET_DEFINITIONS.map(
      (definition) => ({
        ...definition.asset,
        uri: pathToFileURL(
          resolve(
            repoRoot,
            'public/models/stage',
            definition.asset.originalFileName!,
          ),
        ).href,
      }),
    ),
    executionEnvironment: {
      runtime: vizRuntimePackageIdentity,
      components: componentRegistry.components.map((component) => ({
        component,
        capabilityPack: componentRegistry.manifest,
      })),
      nodePackages: [
        { ...coreNodePackageIdentity, nodes: nodeRegistry.list() },
      ],
      renderer: {
        package: vizThreeRendererPackageIdentity,
        backend: vizThreeBrowserBackendIdentity,
        programs: rendererRegistry.list(),
      },
    },
  });
};

const mode = process.argv[2];
if (mode === 'prepare') {
  print({ ok: true, mode, ...prepare() });
} else if (mode === 'finalize') {
  print({ ok: true, mode, ...finalize() });
} else {
  throw new Error(
    'Usage: materialize-afterlight-assembly-production.ts prepare --out <dir> | finalize --dir <baked-dir> --out <dir>',
  );
}
