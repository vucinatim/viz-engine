import { VIZ_PROJECT_SCHEMA_VERSION } from '@viz-engine/contracts';
import {
  loadLocalVizProjectBundle,
  writeExclusiveLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import * as fsAsync from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>();
  return { ...actual, rm: vi.fn(actual.rm) };
});
const roots: string[] = [];
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'viz-bundle-publication-test-'));
  roots.push(root);
  return {
    root,
    options: {
      bundleDirectory: join(root, 'output'),
      project: {
        schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
        projectId: 'publication',
        name: 'Publication',
        timeline: { fps: 60, durationInFrames: 1 },
        viewport: { width: 64, height: 48 },
        layerOrder: [],
        layers: [],
      },
      resolvedAssets: [],
      resolvedArtifacts: [],
    },
  };
};
afterEach(async () => {
  const actual =
    await vi.importActual<typeof import('node:fs/promises')>(
      'node:fs/promises',
    );
  vi.mocked(fsAsync.rm).mockImplementation(actual.rm);
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

it('publishes a complete validated bundle and removes staging', async () => {
  const { root, options } = fixture();
  const result = await writeExclusiveLocalVizProjectBundle(options);
  expect(result.bundleDirectory).toBe(options.bundleDirectory);
  expect(loadLocalVizProjectBundle(result.bundleDirectory).issues).toEqual([]);
  expect(readdirSync(root)).toEqual(['output']);
});

it.each(['existing-empty', 'created-during-validation'] as const)(
  'preserves a competing %s destination',
  async (kind) => {
    const { root, options } = fixture();
    if (kind === 'existing-empty') mkdirSync(options.bundleDirectory);
    await expect(
      writeExclusiveLocalVizProjectBundle({
        ...options,
        validatePrepared() {
          if (kind === 'created-during-validation') {
            mkdirSync(options.bundleDirectory);
            writeFileSync(
              join(options.bundleDirectory, 'sentinel'),
              'preserve',
            );
          }
        },
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(readdirSync(root)).toEqual(['output']);
    if (kind === 'created-during-validation')
      expect(
        readFileSync(join(options.bundleDirectory, 'sentinel'), 'utf8'),
      ).toBe('preserve');
    else expect(readdirSync(options.bundleDirectory)).toEqual([]);
  },
);

it('rejects prepared validation without publication, then succeeds on recovery', async () => {
  const { root, options } = fixture();
  await expect(
    writeExclusiveLocalVizProjectBundle({
      ...options,
      validatePrepared(bundle) {
        expect(bundle.issues).toEqual([]);
        throw new Error('rejected prepared data');
      },
    }),
  ).rejects.toThrow('rejected prepared data');
  expect(readdirSync(root)).toEqual([]);
  await expect(
    writeExclusiveLocalVizProjectBundle(options),
  ).resolves.toMatchObject({ issues: [] });
});

it.each(['cancel', 'cleanup-failure', 'rollback-failure'] as const)(
  'settles %s during final cleanup without false success',
  async (kind) => {
    const { root, options } = fixture();
    const controller = new AbortController();
    const actual =
      await vi.importActual<typeof import('node:fs/promises')>(
        'node:fs/promises',
      );
    vi.mocked(fsAsync.rm).mockImplementation(async (path, options) => {
      if (String(path).includes('.viz-bundle-')) {
        if (kind === 'cancel') {
          controller.abort();
          return actual.rm(path, options);
        }
        throw new Error('staging cleanup failed');
      }
      if (kind === 'rollback-failure') throw new Error('rollback also failed');
      return actual.rm(path, options);
    });
    const result = writeExclusiveLocalVizProjectBundle({
      ...options,
      signal: controller.signal,
    });
    if (kind === 'cancel')
      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    else
      await expect(result).rejects.toMatchObject({
        code: 'bundle-publication-failed',
        message:
          kind === 'rollback-failure'
            ? expect.stringMatching(
                /staging cleanup failed.*rollback also failed/,
              )
            : expect.stringContaining('staging cleanup failed'),
      });
    expect(existsSync(options.bundleDirectory)).toBe(
      kind === 'rollback-failure',
    );
    if (kind === 'cancel') expect(readdirSync(root)).toEqual([]);
  },
);

it('normalizes a file URL containing spaces through the canonical bundle path owner', async () => {
  const { root, options } = fixture();
  const path = join(root, 'output with spaces');
  const written = await writeExclusiveLocalVizProjectBundle({
    ...options,
    bundleDirectory: pathToFileURL(path).href,
  });
  expect(written.bundleDirectory).toBe(path);
  expect(loadLocalVizProjectBundle(pathToFileURL(path).href).issues).toEqual(
    [],
  );
  expect(readdirSync(root)).toEqual(['output with spaces']);
});
