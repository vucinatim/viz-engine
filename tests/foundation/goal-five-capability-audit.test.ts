import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const validator = resolve(
  repositoryRoot,
  'tools/foundation/audit-goal-five-capability-surface.mjs',
);
const catalogPath = resolve(
  repositoryRoot,
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-capability-catalog.json',
);
const temporaryDirectories: string[] = [];

const runHistoricalValidation = (path: string) =>
  spawnSync(
    'pnpm',
    ['exec', 'tsx', validator, '--verify-historical', '--catalog', path],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    );
});

describe('Goal Five historical capability audit', () => {
  it('accepts the exact immutable catalog', () => {
    const result = runHistoricalValidation(catalogPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Validated Goal Five capability catalog');
  });

  it('rejects semantic tampering even when counts and source refs remain valid', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'viz-capability-audit-'));
    temporaryDirectories.push(directory);
    const tamperedPath = resolve(directory, 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    catalog.components[0].name = 'Invented capability meaning';
    writeFileSync(tamperedPath, `${JSON.stringify(catalog, null, 2)}\n`);

    const result = runHistoricalValidation(tamperedPath);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'The complete historical capability catalog digest drifted.',
    );
  });
});
