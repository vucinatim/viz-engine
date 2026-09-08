import { exportExampleBundle } from '@viz-engine/dev-cli';
import { loadLocalVizProjectBundle } from '@viz-engine/project-bundle/node';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const createExportedBundle = () => {
  const bundleDirectory = mkdtempSync(join(tmpdir(), 'viz-bundle-corruption-'));
  const output = exportExampleBundle(bundleDirectory);

  expect(output.ok).toBe(true);

  return bundleDirectory;
};

describe('Viz bundle corruption validation', () => {
  it('reports invalid manifest kind and schema version', () => {
    const bundleDirectory = createExportedBundle();

    try {
      const manifestPath = join(bundleDirectory, 'bundle-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        kind: string;
        schemaVersion: number;
      };

      manifest.kind = 'invalid.bundle.kind';
      manifest.schemaVersion = 999;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      const loaded = loadLocalVizProjectBundle(bundleDirectory);
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'invalid-manifest-kind',
      );
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'invalid-manifest-schema-version',
      );
    } finally {
      rmSync(bundleDirectory, { recursive: true, force: true });
    }
  });

  it('reports missing asset and artifact files', () => {
    const bundleDirectory = createExportedBundle();

    try {
      unlinkSync(join(bundleDirectory, 'assets/asset-image-cover.svg'));
      unlinkSync(
        join(bundleDirectory, 'baked/artifact-audio-authored-main.json'),
      );

      const loaded = loadLocalVizProjectBundle(bundleDirectory);
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'missing-asset-file',
      );
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'missing-artifact-file',
      );
    } finally {
      rmSync(bundleDirectory, { recursive: true, force: true });
    }
  });

  it('reports orphan bundle entries that are not referenced by the project', () => {
    const bundleDirectory = createExportedBundle();

    try {
      const manifestPath = join(bundleDirectory, 'bundle-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        assetEntries: Array<Record<string, unknown>>;
        artifactEntries: Array<Record<string, unknown>>;
      };

      manifest.assetEntries.push({
        assetId: 'asset-orphan-entry',
        kind: 'image',
        path: 'assets/example-cover.svg',
      });
      manifest.artifactEntries.push({
        artifactId: 'artifact-orphan-entry',
        kind: 'analysis-payload',
        path: 'baked/artifact-audio-authored-main.json',
      });

      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      const loaded = loadLocalVizProjectBundle(bundleDirectory);
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'orphan-asset-entry',
      );
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'orphan-artifact-entry',
      );
    } finally {
      rmSync(bundleDirectory, { recursive: true, force: true });
    }
  });

  it('reports project references that are missing manifest entries', () => {
    const bundleDirectory = createExportedBundle();

    try {
      const manifestPath = join(bundleDirectory, 'bundle-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        assetEntries: Array<{ assetId: string }>;
        artifactEntries: Array<{ artifactId: string }>;
      };

      manifest.assetEntries = manifest.assetEntries.filter(
        (entry) => entry.assetId !== 'asset-image-cover',
      );
      manifest.artifactEntries = manifest.artifactEntries.filter(
        (entry) => entry.artifactId !== 'artifact-audio-authored-main',
      );

      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      const loaded = loadLocalVizProjectBundle(bundleDirectory);
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'missing-asset-entry',
      );
      expect(loaded.issues.map((issue) => issue.code)).toContain(
        'missing-artifact-entry',
      );
    } finally {
      rmSync(bundleDirectory, { recursive: true, force: true });
    }
  });
});
