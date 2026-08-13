import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const reporter = resolve(
  repositoryRoot,
  'tools/foundation/report-source-metrics.mjs',
);
const activationCommit = '62322d30292974e15b29f87b833a78f9b30210c9';

describe('source metrics reporter', () => {
  it('reconstructs an immutable historical baseline', () => {
    const report = JSON.parse(
      execFileSync(process.execPath, [reporter, '--commit', activationCommit], {
        cwd: repositoryRoot,
        encoding: 'utf8',
      }),
    );

    expect(report).toEqual({
      schemaVersion: 1,
      commit: activationCommit,
      source: 'git-commit',
      scopes: {
        production: { files: 366, lines: 74216 },
        tools: { files: 17, lines: 3002 },
        tests: { files: 72, lines: 20698 },
        playground: { files: 22, lines: 3139 },
        allCode: { files: 482, lines: 101286 },
      },
    });
  });
});
