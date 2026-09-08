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
const workspace = mkdtempSync(resolve(tmpdir(), 'viz-human-signal-built-'));
const bundleDirectory = resolve(workspace, 'bundle');
try {
  const written = await writeHumanSignalBundle({
    repositoryRoot,
    bundleDirectory,
  });
  const reopened = loadLocalVizProjectBundle(bundleDirectory);
  deepStrictEqual(reopened.issues, []);
  deepStrictEqual(reopened.project, createHumanSignalProject(written.audio));
  deepStrictEqual(reopened.executionManifest, written.executionManifest);
  strictEqual(
    resolveVizProjectAudioAsset(reopened.project, reopened.resolvedAssets)?.ref
      .id,
    written.audio.asset.id,
  );
  console.log(
    'Human Signal built package exports, materialization and reopen pass in plain Node.',
  );
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
