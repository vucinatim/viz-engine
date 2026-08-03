import { createVizComponentRegistryFromCapabilityPacks } from '@viz-engine/contracts';
import {
  coreNodePackageIdentity,
  createCoreNodeRegistry,
} from '@viz-engine/nodes-core';
import {
  SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  createSignalCathedralProject,
  signalCathedralAudioAssetRef,
  signalCathedralCapabilityPack,
  signalCathedralThreeRendererExtension,
} from '@viz-engine/production-signal-cathedral';
import {
  createVizThreeProgramRegistry,
  vizThreeBrowserBackendIdentity,
  vizThreeRendererPackageIdentity,
} from '@viz-engine/renderer-three';
import { vizRuntimePackageIdentity } from '@viz-engine/runtime';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  if (!value) {
    throw new Error(`Missing ${name} argument.`);
  }
  return value;
};

const writeSummary = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const prepare = () =>
  prepareAudioProductionBundle({
    production: 'signal-cathedral',
    outputDirectory: resolve(requireArgument('--out')),
    sourcePath: resolve(repoRoot, 'public/music/[House] Progressive House.mp3'),
    derivativePath: resolve(
      repoRoot,
      '.artifacts/signal-cathedral/staging/signal-cathedral-progressive-house-48s-60s.mp3',
    ),
    sourceStartSeconds: 48,
    durationSeconds: 12,
    audioAssetRef: signalCathedralAudioAssetRef,
    backgroundColor: '#02030d',
    contentIdentityFormat: 'hex',
  });

const finalize = () => {
  const componentRegistry = createVizComponentRegistryFromCapabilityPacks(
    [signalCathedralCapabilityPack],
    { strict: true },
  );
  const nodeRegistry = createCoreNodeRegistry();
  const rendererRegistry = createVizThreeProgramRegistry([
    signalCathedralThreeRendererExtension,
  ]);
  return finalizeAudioProductionBundle({
    production: 'signal-cathedral',
    sourceDirectory: resolve(requireArgument('--dir')),
    outputDirectory: resolve(requireArgument('--out')),
    audioAssetId: SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
    createProject: createSignalCathedralProject,
    executionEnvironment: {
      runtime: vizRuntimePackageIdentity,
      components: componentRegistry.listRegistrations(),
      nodePackages: [
        {
          ...coreNodePackageIdentity,
          nodes: nodeRegistry.list(),
        },
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
  writeSummary({ ok: true, mode, ...prepare() });
} else if (mode === 'finalize') {
  writeSummary({ ok: true, mode, ...finalize() });
} else {
  throw new Error(
    'Usage: materialize-signal-cathedral-production.ts prepare --out <dir> | finalize --dir <baked-dir> --out <dir>',
  );
}
