import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const validator = resolve(
  repositoryRoot,
  'tools/foundation/validate-goal-five-certification.mjs',
);
const canonicalMatrix = JSON.parse(
  readFileSync(
    resolve(repositoryRoot, 'docs/parity/goal-five-certification-matrix.json'),
    'utf8',
  ),
);
const temporaryDirectories: string[] = [];

const runValidator = (matrix: unknown, arguments_: string[] = []) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'viz-goal-five-'));
  temporaryDirectories.push(directory);
  const matrixPath = resolve(directory, 'matrix.json');
  writeFileSync(matrixPath, JSON.stringify(matrix));
  const result = spawnSync(process.execPath, [validator, ...arguments_], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      VIZ_GOAL5_CERTIFICATION_MATRIX: matrixPath,
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout;
};

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    );
});

describe('Goal Five certification matrix', () => {
  it('validates the frozen planning contract', () => {
    const result = JSON.parse(runValidator(canonicalMatrix));

    expect(result).toMatchObject({
      ok: true,
      mode: 'planning',
      goalId: 'goal-five-flagship',
      criterionCount: 46,
      statusCounts: { pending: 46 },
    });
  });

  it('rejects unresolved harnesses during final certification', () => {
    expect(() => runValidator(canonicalMatrix, ['--final'])).toThrow(
      /still has a planned harness in final mode/,
    );
  });

  it('never permits an approved exclusion for a mandatory criterion', () => {
    const matrix = structuredClone(canonicalMatrix);
    matrix.criteria[0].status = 'approved-exclusion';
    matrix.criteria[0].evidence = ['docs/current-state.md'];

    expect(() => runValidator(matrix)).toThrow(
      /cannot exclude a mandatory obligation/,
    );
  });
});
