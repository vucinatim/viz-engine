import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  acquireLease,
  heartbeatLease,
  readLease,
  recoverExpiredLease,
  releaseLease,
  writeResumeMarker,
} from '../../tools/repo/lib/lease';
import { resolveOperationalDirectory } from '../../tools/repo/lib/paths';
import { readRepositoryIdentity } from '../../tools/repo/lib/repository-state';

const temporaryDirectories: string[] = [];

const createRepository = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'viz-repo-lease-'));
  temporaryDirectories.push(root);
  execFileSync('git', ['init', '--initial-branch=codex/test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
    cwd: root,
  });
  execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
    cwd: root,
  });
  writeFileSync(resolve(root, 'seed.txt'), 'seed\n');
  execFileSync('git', ['add', 'seed.txt'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
  return root;
};

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    );
});

describe('repository writer lease', () => {
  it('binds repository identity to changed bytes, not only porcelain shape', () => {
    const root = createRepository();
    writeFileSync(resolve(root, 'seed.txt'), 'first changed value\n');
    const first = readRepositoryIdentity(root);
    writeFileSync(resolve(root, 'seed.txt'), 'second changed value\n');
    const second = readRepositoryIdentity(root);
    expect(second.status).toBe(first.status);
    expect(second.statusHash).not.toBe(first.statusHash);
  });
  it('admits one writer, heartbeats it, and explicitly releases it', () => {
    const root = createRepository();
    const acquired = acquireLease({
      root,
      owner: '/root/one',
      programId: 'program',
      workItemId: 'A-01',
      claimId: 'claim-one',
      now: new Date('2026-09-03T00:00:00.000Z'),
      ttlMinutes: 30,
    });
    expect(() =>
      acquireLease({
        root,
        owner: '/root/two',
        programId: 'program',
        workItemId: 'B-01',
        claimId: 'claim-two',
      }),
    ).toThrow(/writer lease/u);

    const heartbeat = heartbeatLease(
      root,
      {
        leaseId: acquired.id,
        owner: acquired.owner,
        workItemId: acquired.workItemId,
        claimId: acquired.claimId,
      },
      30,
      new Date('2026-09-03T00:10:00.000Z'),
    );
    expect(heartbeat.expiresAt).toBe('2026-09-03T00:40:00.000Z');
    releaseLease(root, {
      leaseId: acquired.id,
      owner: acquired.owner,
      workItemId: acquired.workItemId,
      claimId: acquired.claimId,
    });
    expect(readLease(root)).toBeNull();
  });

  it('refuses unknown dirty state but preserves dirty work during exact stale recovery', () => {
    const root = createRepository();
    writeFileSync(resolve(root, 'unknown.txt'), 'unknown\n');
    expect(() =>
      acquireLease({
        root,
        owner: '/root/one',
        programId: 'program',
        workItemId: 'A-01',
        claimId: 'claim-one',
      }),
    ).toThrow(/not clean/u);
    execFileSync('git', ['clean', '-f', '--', 'unknown.txt'], { cwd: root });

    const expired = acquireLease({
      root,
      owner: '/root/one',
      programId: 'program',
      workItemId: 'A-01',
      claimId: 'claim-one',
      now: new Date('2026-09-03T00:00:00.000Z'),
      ttlMinutes: 1,
    });
    writeFileSync(resolve(root, 'owned-change.txt'), 'preserve me\n');
    const leasePath = resolve(resolveOperationalDirectory(root), 'lease.json');
    const deadOwner = { ...expired, pid: 99_999_999 };
    writeFileSync(leasePath, `${JSON.stringify(deadOwner, null, 2)}\n`);
    writeResumeMarker(
      root,
      deadOwner,
      'checkpointed',
      'Exact dirty recovery state.',
    );
    const { lease: recovered } = recoverExpiredLease({
      root,
      expectedLeaseId: expired.id,
      owner: '/root/one',
      programId: 'program',
      workItemId: 'A-01',
      claimId: 'claim-one',
      now: new Date('2026-09-03T00:02:00.000Z'),
    });
    expect(recovered.recoveredFrom).toBe(expired.id);
    expect(readLease(root)?.id).toBe(recovered.id);
    expect(() =>
      recoverExpiredLease({
        root,
        expectedLeaseId: recovered.id,
        owner: '/root/other',
        programId: 'program',
        workItemId: 'A-01',
        claimId: 'claim-one',
        now: new Date('2026-09-04T00:00:00.000Z'),
      }),
    ).toThrow(/ownership does not match/u);
  });

  it('refuses stale recovery from another linked worktree', () => {
    const root = createRepository();
    const other = `${root}-other`;
    temporaryDirectories.push(other);
    execFileSync('git', ['worktree', 'add', '-b', 'codex/other', other], {
      cwd: root,
    });
    const expired = acquireLease({
      root,
      owner: '/root/one',
      programId: 'program',
      workItemId: 'A-01',
      claimId: 'claim-one',
      now: new Date('2026-09-03T00:00:00.000Z'),
      ttlMinutes: 1,
    });
    const deadOwner = { ...expired, pid: 99_999_999 };
    writeFileSync(
      resolve(resolveOperationalDirectory(root), 'lease.json'),
      `${JSON.stringify(deadOwner, null, 2)}\n`,
    );
    writeResumeMarker(root, deadOwner, 'checkpointed', 'Original checkout.');
    expect(() =>
      recoverExpiredLease({
        root: other,
        expectedLeaseId: expired.id,
        owner: '/root/one',
        programId: 'program',
        workItemId: 'A-01',
        claimId: 'claim-one',
        now: new Date('2026-09-03T00:02:00.000Z'),
      }),
    ).toThrow(/checkout identity changed/u);
  });
});
