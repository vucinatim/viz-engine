import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  acquireLease,
  readResumeMarker,
  recoverExpiredLease,
  writeResumeMarker,
} from '../../tools/repo/lib/lease';
import {
  readOperationalLock,
  readOperationalTransaction,
  recoverOperationalLock,
  recoverOperationalTransaction,
  withOperationalLock,
  withOperationalTransaction,
} from '../../tools/repo/lib/operational-lock';
import { resolveOperationalDirectory } from '../../tools/repo/lib/paths';
import { assessAutonomousReadiness } from '../../tools/repo/lib/preflight';
import { readRepositoryIdentity } from '../../tools/repo/lib/repository-state';

const roots: string[] = [];
const createRepository = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'viz-operational-'));
  roots.push(root);
  execFileSync('git', ['init', '--initial-branch=codex/test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
    cwd: root,
  });
  execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
    cwd: root,
  });
  writeFileSync(resolve(root, 'seed.txt'), 'seed\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
  return root;
};

afterEach(() => {
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe('operational state transaction', () => {
  it('rolls back all managed state when an ordinary transition throws', () => {
    const root = createRepository();
    const resumePath = resolve(
      resolveOperationalDirectory(root),
      'resume.json',
    );
    writeFileSync(resumePath, 'before\n');

    expect(() =>
      withOperationalTransaction(root, 'throwing-transition', () => {
        writeFileSync(resumePath, 'after\n');
        throw new Error('planned failure');
      }),
    ).toThrow(/planned failure/u);

    expect(readFileSync(resumePath, 'utf8')).toBe('before\n');
    expect(readOperationalLock(root)).toBeNull();
    expect(readOperationalTransaction(root)).toBeNull();
  });

  it('requires exact recovery after process death and restores the journal snapshot', () => {
    const root = createRepository();
    const operational = resolveOperationalDirectory(root);
    const resumePath = resolve(operational, 'resume.json');
    writeFileSync(resumePath, 'before-crash\n');
    const script = resolve(root, 'crash-transition.ts');
    const implementation = resolve(
      process.cwd(),
      'tools/repo/lib/operational-lock.ts',
    );
    writeFileSync(
      script,
      [
        `import { writeFileSync } from 'node:fs';`,
        `import { withOperationalTransaction } from ${JSON.stringify(implementation)};`,
        `withOperationalTransaction(${JSON.stringify(root)}, 'crash-transition', () => {`,
        `  writeFileSync(${JSON.stringify(resumePath)}, 'after-crash\\n');`,
        `  process.exit(17);`,
        `});`,
      ].join('\n'),
    );
    const crashed = spawnSync('pnpm', ['exec', 'tsx', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(crashed.status).toBe(17);

    const owner = readOperationalLock(root);
    const journal = readOperationalTransaction(root);
    expect(owner).not.toBeNull();
    expect(journal?.label).toBe('crash-transition');
    expect(readFileSync(resumePath, 'utf8')).toBe('after-crash\n');
    expect(
      assessAutonomousReadiness({ root, path: resolve(root, 'missing.json') })
        .requiredAction,
    ).toBe('recover-operational-lock');

    recoverOperationalLock({
      root,
      expectedHost: owner!.host,
      expectedPid: owner!.pid,
    });
    const interrupted = assessAutonomousReadiness({
      root,
      path: resolve(root, 'missing.json'),
    });
    expect(interrupted.requiredAction).toBe('recover-transition');
    expect(interrupted.mutationAllowed).toBe(true);

    recoverOperationalTransaction({ root, expectedId: journal!.id });
    expect(readFileSync(resumePath, 'utf8')).toBe('before-crash\n');
    expect(readOperationalLock(root)).toBeNull();
    expect(readOperationalTransaction(root)).toBeNull();
  });

  it('reconciles dirty Git identity after recovering a process-death journal', () => {
    const root = createRepository();
    const lease = acquireLease({
      root,
      owner: '/root/crash-test',
      programId: 'program',
      workItemId: 'A-01',
      claimId: 'claim-one',
      now: new Date('2026-09-03T00:00:00.000Z'),
      ttlMinutes: 1,
    });
    writeResumeMarker(root, lease, 'claimed', 'Before dirty work.');
    writeFileSync(resolve(root, 'owned.txt'), 'owned dirty work\n');

    const operational = resolveOperationalDirectory(root);
    const resumePath = resolve(operational, 'resume.json');
    const script = resolve(root, 'dirty-crash-transition.ts');
    const implementation = resolve(
      process.cwd(),
      'tools/repo/lib/operational-lock.ts',
    );
    writeFileSync(
      script,
      [
        `import { writeFileSync } from 'node:fs';`,
        `import { withOperationalTransaction } from ${JSON.stringify(implementation)};`,
        `withOperationalTransaction(${JSON.stringify(root)}, 'dirty-crash-transition', () => {`,
        `  writeFileSync(${JSON.stringify(resumePath)}, 'corrupt in-flight state\\n');`,
        `  process.exit(23);`,
        `});`,
      ].join('\n'),
    );
    const crashed = spawnSync('pnpm', ['exec', 'tsx', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(crashed.status).toBe(23);
    const owner = readOperationalLock(root)!;
    const journal = readOperationalTransaction(root)!;
    recoverOperationalLock({
      root,
      expectedHost: owner.host,
      expectedPid: owner.pid,
    });
    recoverOperationalTransaction({ root, expectedId: journal.id });

    const identity = readRepositoryIdentity(root);
    const resume = readResumeMarker(root)!;
    expect(identity.clean).toBe(false);
    expect(resume.currentHead).toBe(identity.head);
    expect(resume.statusHash).toBe(identity.statusHash);

    const leasePath = resolve(operational, 'lease.json');
    writeFileSync(
      leasePath,
      `${JSON.stringify({
        ...lease,
        expiresAt: '1970-01-01T00:00:00.000Z',
        pid: 99_999_999,
      })}\n`,
    );
    const recovered = recoverExpiredLease({
      root,
      expectedLeaseId: lease.id,
      owner: lease.owner,
      programId: lease.programId,
      workItemId: lease.workItemId,
      claimId: lease.claimId,
      now: new Date('2026-09-03T00:02:00.000Z'),
    });
    expect(recovered.lease.id).toBe(lease.id);
  }, 15_000);

  it('tells overlapping wakes to exit while the owner process is live', () => {
    const root = createRepository();
    withOperationalLock(root, () => {
      const readiness = assessAutonomousReadiness({
        root,
        path: resolve(root, 'missing.json'),
      });
      expect(readiness.requiredAction).toBe('wait-operational-lock');
      expect(readiness.mutationAllowed).toBe(false);
      expect(readiness.candidates).toEqual([]);
    });
  });
});
