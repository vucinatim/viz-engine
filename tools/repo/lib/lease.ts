import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  mkdirSync,
  openSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

import { writeJsonFileAtomic } from './json-file';
import {
  LeaseIdentity,
  RepositoryLease,
  ResumeMarker,
  assertCheckoutIdentity,
  assertLeaseIdentity,
  assertLeaseShape,
  leaseIsExpired,
  leasePath,
  readLease,
  readResumeMarker,
  writeResumeMarker,
} from './lease-record';
import { withOperationalLock } from './operational-lock';
import { resolveOperationalDirectory } from './paths';
import { processIsAlive, readRepositoryIdentity } from './repository-state';

export { leaseIsExpired, readLease, readResumeMarker, writeResumeMarker };
export type { LeaseIdentity, RepositoryLease, ResumeMarker };

export const assertOwnedLease = (root: string, expected: LeaseIdentity) => {
  const lease = readLease(root);
  if (!lease) throw new Error('No repository writer lease exists.');
  if (leaseIsExpired(lease)) throw new Error(`Lease ${lease.id} has expired.`);
  assertLeaseIdentity(lease, expected);
  assertCheckoutIdentity(root, lease);
  return lease;
};

export const assertLeaseForFinalization = (
  root: string,
  expected: LeaseIdentity,
) => {
  const lease = readLease(root);
  if (!lease) throw new Error('No repository writer lease exists.');
  assertLeaseIdentity(lease, expected);
  assertCheckoutIdentity(root, lease);
  return lease;
};

export const assertActiveLeaseId = (root: string, expected: LeaseIdentity) =>
  assertOwnedLease(root, expected);

const createLeaseRecord = (options: {
  root: string;
  owner: string;
  programId: string;
  workItemId: string;
  claimId: string;
  ttlMinutes: number;
  now: Date;
  allowDirty: boolean;
  recoveredFrom?: string;
  startingHead?: string;
  initialStatusHash?: string;
  id?: string;
}) => {
  if (
    !Number.isFinite(options.ttlMinutes) ||
    options.ttlMinutes <= 0 ||
    options.ttlMinutes > 360
  ) {
    throw new Error(
      'Lease TTL must be greater than zero and at most 360 minutes.',
    );
  }
  const identity = readRepositoryIdentity(options.root);
  if (!identity.branch)
    throw new Error('Writer leases require a named branch.');
  if (!options.allowDirty && !identity.clean) {
    throw new Error('Refusing writer lease because the worktree is not clean.');
  }
  const timestamp = options.now.toISOString();
  return assertLeaseShape({
    schemaVersion: 1,
    id: options.id ?? randomUUID(),
    owner: options.owner,
    programId: options.programId,
    workItemId: options.workItemId,
    claimId: options.claimId,
    branch: identity.branch,
    startingHead: options.startingHead ?? identity.head,
    acquiredAt: timestamp,
    heartbeatAt: timestamp,
    expiresAt: new Date(
      options.now.getTime() + options.ttlMinutes * 60_000,
    ).toISOString(),
    host: identity.host,
    pid: identity.pid,
    worktreeRoot: identity.root,
    initialStatusHash: options.initialStatusHash ?? identity.statusHash,
    ...(options.recoveredFrom ? { recoveredFrom: options.recoveredFrom } : {}),
  });
};

const createLeaseFile = (root: string, lease: RepositoryLease) => {
  const descriptor = openSync(leasePath(root), 'wx', 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(lease, null, 2)}\n`, 'utf8');
  } finally {
    closeSync(descriptor);
  }
};

const archiveLease = (root: string, lease: RepositoryLease, reason: string) => {
  const archiveDirectory = join(
    resolveOperationalDirectory(root),
    'lease-archive',
  );
  mkdirSync(archiveDirectory, { recursive: true });
  const archivedPath = join(
    archiveDirectory,
    `${lease.acquiredAt.replaceAll(':', '-')}-${lease.id}-${reason}.json`,
  );
  renameSync(leasePath(root), archivedPath);
  return archivedPath;
};

export const acquireLease = (options: {
  root: string;
  owner: string;
  programId: string;
  workItemId: string;
  claimId: string;
  ttlMinutes?: number;
  now?: Date;
}) =>
  withOperationalLock(options.root, () => {
    const existing = readLease(options.root);
    if (existing) {
      const state = leaseIsExpired(existing) ? 'expired' : 'active';
      throw new Error(
        `Repository writer lease ${existing.id} is ${state}; use explicit recovery for expired leases.`,
      );
    }
    const lease = createLeaseRecord({
      ...options,
      ttlMinutes: options.ttlMinutes ?? 210,
      now: options.now ?? new Date(),
      allowDirty: false,
    });
    createLeaseFile(options.root, lease);
    return lease;
  });

export const resumeBlockedLease = (options: {
  root: string;
  owner: string;
  programId: string;
  workItemId: string;
  claimId: string;
  previousClaimId: string;
  ttlMinutes?: number;
  now?: Date;
}) =>
  withOperationalLock(options.root, () => {
    if (readLease(options.root)) {
      throw new Error('A repository writer lease already exists.');
    }
    const resume = readResumeMarker(options.root, options.previousClaimId);
    const identity = readRepositoryIdentity(options.root);
    if (
      !identity.clean &&
      (!resume ||
        resume.lastAction !== 'blocked' ||
        resume.programId !== options.programId ||
        resume.workItemId !== options.workItemId ||
        resume.branch !== identity.branch ||
        resume.worktreeRoot !== identity.root ||
        resume.currentHead !== identity.head ||
        resume.statusHash !== identity.statusHash)
    ) {
      throw new Error(
        'Blocked resume marker and current Git state disagree; continuation is unsafe.',
      );
    }
    const lease = createLeaseRecord({
      ...options,
      ttlMinutes: options.ttlMinutes ?? 210,
      now: options.now ?? new Date(),
      allowDirty: !identity.clean,
      ...(resume
        ? {
            recoveredFrom: resume.leaseId,
            startingHead: identity.clean ? identity.head : resume.startingHead,
            initialStatusHash: identity.clean
              ? identity.statusHash
              : resume.statusHash,
          }
        : {}),
    });
    createLeaseFile(options.root, lease);
    return lease;
  });

export const heartbeatLease = (
  root: string,
  expected: LeaseIdentity,
  ttlMinutes = 210,
  now = new Date(),
) =>
  withOperationalLock(root, () => {
    const lease = readLease(root);
    if (!lease) throw new Error('No repository writer lease exists.');
    assertLeaseIdentity(lease, expected);
    assertCheckoutIdentity(root, lease);
    if (leaseIsExpired(lease, now.getTime())) {
      throw new Error(
        'Cannot heartbeat an expired lease; use explicit recovery.',
      );
    }
    if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0 || ttlMinutes > 360) {
      throw new Error(
        'Lease TTL must be greater than zero and at most 360 minutes.',
      );
    }
    const updated = {
      ...lease,
      heartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
    };
    writeJsonFileAtomic(leasePath(root), updated);
    return updated;
  });

export const recoverExpiredLease = (options: {
  root: string;
  expectedLeaseId: string;
  owner: string;
  programId: string;
  workItemId: string;
  claimId: string;
  ttlMinutes?: number;
  now?: Date;
  allowCommittedCheckpointRecovery?: boolean;
}) =>
  withOperationalLock(options.root, () => {
    const now = options.now ?? new Date();
    const existing = readLease(options.root);
    if (!existing || existing.id !== options.expectedLeaseId) {
      throw new Error(
        'Expired lease identity does not match recovery request.',
      );
    }
    if (!leaseIsExpired(existing, now.getTime())) {
      throw new Error(
        'Refusing recovery because the existing lease is still active.',
      );
    }
    assertLeaseIdentity(existing, {
      leaseId: options.expectedLeaseId,
      owner: options.owner,
      workItemId: options.workItemId,
      claimId: options.claimId,
    });
    if (existing.programId !== options.programId) {
      throw new Error('Expired lease program identity does not match.');
    }
    if (existing.host === hostname() && processIsAlive(existing.pid)) {
      throw new Error(
        'Expired lease owner process is still alive; refusing recovery.',
      );
    }
    const identity = assertCheckoutIdentity(options.root, existing);
    const resume = readResumeMarker(options.root, existing.claimId);
    const resumeMatches =
      resume?.leaseId === existing.id &&
      resume.owner === existing.owner &&
      resume.programId === existing.programId &&
      resume.workItemId === existing.workItemId &&
      resume.claimId === existing.claimId &&
      resume.branch === identity.branch &&
      resume.worktreeRoot === identity.root &&
      resume.currentHead === identity.head &&
      resume.statusHash === identity.statusHash;
    if (!resumeMatches && options.allowCommittedCheckpointRecovery) {
      let parentHead = '';
      try {
        parentHead = execFileSync('git', ['rev-parse', 'HEAD^'], {
          cwd: options.root,
          encoding: 'utf8',
        }).trim();
      } catch {
        // The exact direct-child requirement below remains false.
      }
      if (!identity.clean || parentHead !== existing.startingHead) {
        throw new Error(
          'Committed-checkpoint recovery requires a clean direct child of the lease starting commit.',
        );
      }
    } else if (!resumeMatches) {
      throw new Error(
        'Resume marker and current Git state disagree; recovery is unsafe.',
      );
    }
    const archivedPath = archiveLease(options.root, existing, 'recovered');
    const lease = createLeaseRecord({
      ...options,
      ttlMinutes: options.ttlMinutes ?? 210,
      now,
      allowDirty: true,
      recoveredFrom: existing.id,
      id: existing.id,
      startingHead: existing.startingHead,
      initialStatusHash: existing.initialStatusHash,
    });
    try {
      createLeaseFile(options.root, lease);
    } catch (error) {
      renameSync(archivedPath, leasePath(options.root));
      throw error;
    }
    return { lease, archivedPath };
  });

export const rollbackRecoveredLease = (
  root: string,
  expected: LeaseIdentity,
  archivedPath: string,
) =>
  withOperationalLock(root, () => {
    const active = readLease(root);
    if (!active) throw new Error('No recovered lease exists to roll back.');
    assertLeaseIdentity(active, expected);
    archiveLease(root, active, 'recovery-rollback');
    renameSync(archivedPath, leasePath(root));
  });

export const releaseLease = (
  root: string,
  expected: LeaseIdentity,
  reason = 'released',
) =>
  withOperationalLock(root, () => {
    const lease = readLease(root);
    if (!lease) throw new Error('No repository writer lease exists.');
    assertLeaseIdentity(lease, expected);
    assertCheckoutIdentity(root, lease);
    return { lease, archivedPath: archiveLease(root, lease, reason) };
  });
