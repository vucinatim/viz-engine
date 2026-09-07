import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getChangedFiles,
  planChecks,
  runChecks,
} from '../../tools/repo/lib/checks';
import { resolveOperationalDirectory } from '../../tools/repo/lib/paths';
import { readAndValidateSensoryMap } from '../../tools/repo/lib/sensory-map';

const createPassingCheckFixture = (mutation: 'repository' | 'lease') => {
  const root = mkdtempSync(resolve(tmpdir(), `viz-check-${mutation}-`));
  execFileSync('git', ['init', '--initial-branch=codex/viz-engine-v2'], {
    cwd: root,
  });
  execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
    cwd: root,
  });
  execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
    cwd: root,
  });
  mkdirSync(resolve(root, 'docs'), { recursive: true });
  mkdirSync(resolve(root, 'tools/repo/programs'), { recursive: true });
  writeFileSync(resolve(root, '.gitignore'), '.artifacts/\n');
  writeFileSync(resolve(root, 'tracked.txt'), 'initial\n');
  writeFileSync(resolve(root, 'docs/goal.md'), '# Goal\n');
  writeFileSync(resolve(root, 'docs/plan.md'), '# Plan\n');
  writeFileSync(
    resolve(root, 'docs/criteria.json'),
    `${JSON.stringify({ criteria: [{ id: 'criterion' }] })}\n`,
  );
  const mutationScript =
    mutation === 'repository'
      ? "import { writeFileSync } from 'node:fs'; writeFileSync('tracked.txt', 'changed\\n');\n"
      : `import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';
const root = process.cwd();
const gitDirectory = resolve(root, execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim());
const operational = resolve(gitDirectory, 'viz-engine-autonomy');
mkdirSync(operational, { recursive: true });
writeFileSync(resolve(operational, 'lease.json'), JSON.stringify({
  schemaVersion: 1,
  id: 'changed-lease',
  owner: 'other-run',
  programId: 'test-program',
  workItemId: 'TEST-01',
  claimId: 'other-claim',
  branch: 'codex/viz-engine-v2',
  startingHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  acquiredAt: new Date().toISOString(),
  heartbeatAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  host: hostname(),
  pid: process.pid,
  worktreeRoot: root,
  initialStatusHash: 'fixture'
}) + '\\n');
`;
  writeFileSync(resolve(root, 'mutate.mjs'), mutationScript);
  writeFileSync(
    resolve(root, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        scripts: {
          'architecture:validate': 'node mutate.mjs',
          'parity:validate': 'node -e ""',
          'goal5:criteria:validate': 'node -e ""',
        },
      },
      null,
      2,
    )}\n`,
  );
  const programPath = resolve(
    root,
    'tools/repo/programs/autonomous-readiness.json',
  );
  writeFileSync(
    programPath,
    `${JSON.stringify(
      {
        schemaVersion: 2,
        id: 'test-program',
        title: 'Test program',
        targetBranch: 'codex/viz-engine-v2',
        parentGoal: 'docs/goal.md',
        executionPlan: 'docs/plan.md',
        criteriaContract: 'docs/criteria.json',
        gates: [{ id: 'gate', title: 'Gate', wave: 0 }],
        workItems: [
          {
            id: 'TEST-01',
            gate: 'gate',
            lane: 'test',
            priority: 1,
            title: 'Test work',
            authority: 'autonomous',
            dependsOn: [],
            estimate: { agentHoursMin: 1, agentHoursMax: 1 },
            acceptance: ['The test completes.'],
            evidenceLanes: ['code-architecture'],
            affectedCriteria: ['criterion'],
            evidenceRequirements: [
              {
                id: 'result',
                kind: 'document',
                description: 'Test result',
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
  return { root, programPath };
};

describe('staged repository checks', () => {
  it('keeps fast feedback bounded and escalates evidence by stage', () => {
    const changed = [
      'tools/repo/lib/program.ts',
      'tests/foundation/repo-program.test.ts',
      'packages/viz-runtime/src/index.ts',
      'docs/current-state.md',
    ];
    const fast = planChecks('fast', changed);
    const focused = planChecks('focused', changed);
    const checkpoint = planChecks('checkpoint', changed);
    const integration = planChecks('integration', changed);
    const certification = planChecks('certification', changed);

    expect(fast.commands.map(({ id }) => id)).toEqual([
      'git-diff',
      'architecture',
      'parity-contract',
      'goal-five-contract',
    ]);
    expect(focused.commands.map(({ id }) => id)).toContain('related-tests');
    expect(
      focused.commands.find(({ id }) => id === 'repo-contract-tests')
        ?.arguments,
    ).toContain('--no-file-parallelism');
    const packageScripts = (
      JSON.parse(
        readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
      ) as { scripts: Record<string, string> }
    ).scripts;
    expect(packageScripts['test:foundation']).toContain(
      '--no-file-parallelism',
    );
    expect(checkpoint.commands.map(({ id }) => id)).toContain(
      'typecheck-foundation',
    );
    expect(integration.commands.map(({ id }) => id)).toContain('build-all');
    expect(certification.commands.map(({ id }) => id)).toEqual([
      'foundation-certification',
    ]);
    expect(fast.commands.length).toBeLessThan(focused.commands.length);
    expect(focused.commands.length).toBeLessThan(checkpoint.commands.length);
  });

  it('derives evidence ownership for all frozen Goal Five criteria', () => {
    const result = readAndValidateSensoryMap();
    expect(result.counts).toEqual({
      total: 46,
      ready: 1,
      planned: 32,
      review: 12,
      human: 1,
    });
    expect(
      result.criteria.every(({ evidenceLanes }) => evidenceLanes.length > 0),
    ).toBe(true);
  });

  it('includes deletions in the changed-file evidence set', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'viz-check-files-'));
    try {
      execFileSync('git', ['init', '--initial-branch=codex/test'], {
        cwd: root,
      });
      execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
        cwd: root,
      });
      execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
        cwd: root,
      });
      writeFileSync(resolve(root, 'deleted.ts'), 'export {};\n');
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
      unlinkSync(resolve(root, 'deleted.ts'));
      expect(getChangedFiles('HEAD', root)).toContain('deleted.ts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('records an operational-lock observation failure before running commands', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'viz-check-lock-'));
    try {
      execFileSync('git', ['init', '--initial-branch=codex/test'], {
        cwd: root,
      });
      execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
        cwd: root,
      });
      execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
        cwd: root,
      });
      writeFileSync(resolve(root, '.gitignore'), '.artifacts/\n');
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
      const operational = resolveOperationalDirectory(root);
      const ownerDirectory = resolve(operational, 'test-owner');
      mkdirSync(ownerDirectory);
      writeFileSync(
        resolve(ownerDirectory, 'owner.json'),
        `${JSON.stringify({
          schemaVersion: 1,
          host: hostname(),
          pid: process.pid,
          acquiredAt: new Date().toISOString(),
        })}\n`,
      );
      symlinkSync(ownerDirectory, resolve(operational, 'state-mutex'), 'dir');

      const result = runChecks({
        stage: 'fast',
        changedFiles: [],
        root,
      });
      expect(result.status).toBe('failed');
      expect(result.results).toEqual([]);
      expect(result.operational.leaseStable).toBe(false);
      expect(result.operational.observationFailure).toMatch(
        /Operational state mutation is already active/u,
      );
      expect(result.evidencePath).not.toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it('records repository drift after otherwise-passing commands', () => {
    const fixture = createPassingCheckFixture('repository');
    try {
      const result = runChecks({
        stage: 'fast',
        changedFiles: [],
        programPath: fixture.programPath,
        root: fixture.root,
      });
      expect(result.results).toHaveLength(result.plan.commands.length);
      expect(result.results.every(({ status }) => status === 'passed')).toBe(
        true,
      );
      expect(result.status).toBe('failed');
      expect(result.repositoryStable).toBe(false);
      expect(result.failure).toMatch(
        /Repository identity changed while checks ran/u,
      );
      expect(
        JSON.parse(
          readFileSync(resolve(fixture.root, result.evidencePath!), 'utf8'),
        ),
      ).toMatchObject({ status: 'failed', repositoryStable: false });
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }, 20_000);

  it('records lease drift after otherwise-passing commands', () => {
    const fixture = createPassingCheckFixture('lease');
    try {
      const result = runChecks({
        stage: 'fast',
        changedFiles: [],
        programPath: fixture.programPath,
        root: fixture.root,
      });
      expect(result.results).toHaveLength(result.plan.commands.length);
      expect(result.results.every(({ status }) => status === 'passed')).toBe(
        true,
      );
      expect(result.status).toBe('failed');
      expect(result.repositoryStable).toBe(true);
      expect(result.operational.leaseStable).toBe(false);
      expect(result.failure).toMatch(
        /Writer lease identity changed while checks ran/u,
      );
      expect(
        JSON.parse(
          readFileSync(resolve(fixture.root, result.evidencePath!), 'utf8'),
        ),
      ).toMatchObject({
        status: 'failed',
        repositoryStable: true,
        operational: { leaseStable: false },
      });
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }, 20_000);
});
