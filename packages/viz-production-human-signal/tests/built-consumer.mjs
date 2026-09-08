// Plain Node self-reference resolves published exports, without TS/Vite loaders.
import { createHumanSignalProject } from '@viz-engine/production-human-signal';
import { writeHumanSignalBundle } from '@viz-engine/production-human-signal/node';
import { loadLocalVizProjectBundle } from '@viz-engine/project-bundle/node';
import { resolveVizProjectAudioAsset } from '@viz-engine/runtime';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const bundleDirectory = mkdtempSync(
  resolve(tmpdir(), 'viz-human-signal-built-'),
);
try {
  const written = writeHumanSignalBundle({ repositoryRoot, bundleDirectory });
  const reopened = loadLocalVizProjectBundle(bundleDirectory);
  deepStrictEqual(reopened.issues, []);
  deepStrictEqual(reopened.project, createHumanSignalProject());
  deepStrictEqual(reopened.executionManifest, written.executionManifest);
  strictEqual(
    resolveVizProjectAudioAsset(reopened.project, reopened.resolvedAssets),
    undefined,
  );
  console.log(
    'Human Signal built package exports, materialization and reopen pass in plain Node.',
  );
} finally {
  rmSync(bundleDirectory, { recursive: true, force: true });
}
