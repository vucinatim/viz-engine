import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { readJsonFile, writeJsonFileAtomic } from './json-file';
import { resolveOperationalDirectory } from './paths';
import { readRepositoryIdentity } from './repository-state';

export interface RepositoryLease {
  schemaVersion: 1;
  id: string;
  owner: string;
  programId: string;
  workItemId: string;
  claimId: string;
  branch: string;
  startingHead: string;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
  host: string;
  pid: number;
  worktreeRoot: string;
  initialStatusHash: string;
  recoveredFrom?: string;
}

export interface ResumeMarker {
  schemaVersion: 1;
  leaseId: string;
  owner: string;
  programId: string;
  workItemId: string;
  claimId: string;
  branch: string;
  worktreeRoot: string;
  startingHead: string;
  currentHead: string;
  statusHash: string;
  updatedAt: string;
  lastAction:
    'claimed' | 'checkpointed' | 'recovered' | 'blocked' | 'completed';
  note: string;
}

export interface LeaseIdentity {
  leaseId: string;
  owner: string;
  workItemId: string;
  claimId: string;
}
interface LatestResumePointer {
  schemaVersion: 1;
  claimId: string;
}

export const leasePath = (root: string) =>
  join(resolveOperationalDirectory(root), 'lease.json');
const resumePath = (root: string) =>
  join(resolveOperationalDirectory(root), 'resume.json');
const claimResumePath = (root: string, claimId: string) =>
  join(resolveOperationalDirectory(root), 'resume', `${claimId}.json`);

const parseTimestamp = (value: string, label: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp))
    throw new Error(`${label} is not a timestamp.`);
  return timestamp;
};

export const assertLeaseShape = (lease: RepositoryLease) => {
  if (lease.schemaVersion !== 1) throw new Error('Unsupported lease schema.');
  for (const field of [
    'id',
    'owner',
    'programId',
    'workItemId',
    'claimId',
    'branch',
    'startingHead',
    'acquiredAt',
    'heartbeatAt',
    'expiresAt',
    'host',
    'worktreeRoot',
    'initialStatusHash',
  ] as const) {
    if (typeof lease[field] !== 'string' || lease[field].length === 0) {
      throw new Error(`Lease ${field} must be a non-empty string.`);
    }
  }
  if (!Number.isInteger(lease.pid) || lease.pid <= 0) {
    throw new Error('Lease pid must be positive.');
  }
  parseTimestamp(lease.acquiredAt, 'lease.acquiredAt');
  parseTimestamp(lease.heartbeatAt, 'lease.heartbeatAt');
  parseTimestamp(lease.expiresAt, 'lease.expiresAt');
  return lease;
};

const assertResumeShape = (marker: ResumeMarker) => {
  if (marker.schemaVersion !== 1) throw new Error('Unsupported resume schema.');
  for (const field of [
    'leaseId',
    'owner',
    'programId',
    'workItemId',
    'claimId',
    'branch',
    'worktreeRoot',
    'startingHead',
    'currentHead',
    'statusHash',
    'updatedAt',
    'note',
  ] as const) {
    if (typeof marker[field] !== 'string' || marker[field].length === 0) {
      throw new Error(`Resume marker ${field} must be a non-empty string.`);
    }
  }
  parseTimestamp(marker.updatedAt, 'resume.updatedAt');
  return marker;
};

export const readLease = (root: string): RepositoryLease | null =>
  existsSync(leasePath(root))
    ? assertLeaseShape(readJsonFile<RepositoryLease>(leasePath(root)))
    : null;

export const readResumeMarker = (
  root: string,
  claimId?: string,
): ResumeMarker | null => {
  let selectedClaimId = claimId;
  if (!selectedClaimId) {
    if (!existsSync(resumePath(root))) return null;
    const pointer = readJsonFile<LatestResumePointer>(resumePath(root));
    if (
      pointer.schemaVersion !== 1 ||
      typeof pointer.claimId !== 'string' ||
      pointer.claimId.length === 0
    ) {
      throw new Error('Latest resume pointer is malformed.');
    }
    selectedClaimId = pointer.claimId;
  }
  const path = claimResumePath(root, selectedClaimId);
  if (!existsSync(path)) {
    throw new Error(
      `Latest resume pointer references missing claim ${selectedClaimId}.`,
    );
  }
  return assertResumeShape(readJsonFile<ResumeMarker>(path));
};

export const leaseIsExpired = (lease: RepositoryLease, now = Date.now()) =>
  parseTimestamp(lease.expiresAt, 'lease.expiresAt') <= now;

export const assertLeaseIdentity = (
  lease: RepositoryLease,
  expected: LeaseIdentity,
) => {
  if (
    lease.id !== expected.leaseId ||
    lease.owner !== expected.owner ||
    lease.workItemId !== expected.workItemId ||
    lease.claimId !== expected.claimId
  ) {
    throw new Error(
      'Repository lease ownership does not match the work item claim.',
    );
  }
};

export const assertCheckoutIdentity = (
  root: string,
  lease: RepositoryLease,
) => {
  const identity = readRepositoryIdentity(root);
  if (
    identity.root !== lease.worktreeRoot ||
    identity.branch !== lease.branch
  ) {
    throw new Error(
      'Repository checkout identity changed while the lease was active.',
    );
  }
  return identity;
};

export const writeResumeMarker = (
  root: string,
  lease: RepositoryLease,
  lastAction: ResumeMarker['lastAction'],
  note: string,
) => {
  const identity = assertCheckoutIdentity(root, lease);
  const marker: ResumeMarker = {
    schemaVersion: 1,
    leaseId: lease.id,
    owner: lease.owner,
    programId: lease.programId,
    workItemId: lease.workItemId,
    claimId: lease.claimId,
    branch: identity.branch,
    worktreeRoot: identity.root,
    startingHead: lease.startingHead,
    currentHead: identity.head,
    statusHash: identity.statusHash,
    updatedAt: new Date().toISOString(),
    lastAction,
    note,
  };
  writeJsonFileAtomic(claimResumePath(root, lease.claimId), marker);
  writeJsonFileAtomic(resumePath(root), {
    schemaVersion: 1,
    claimId: lease.claimId,
  } satisfies LatestResumePointer);
  return marker;
};
