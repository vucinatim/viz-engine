import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { dirname, resolve } from 'node:path';

import { readJsonFile, writeJsonFileAtomic } from './json-file';
import { readLease, writeResumeMarker } from './lease-record';
import { resolveOperationalDirectory } from './paths';
import { processIsAlive, readRepositoryIdentity } from './repository-state';

export interface OperationalLockOwner {
  schemaVersion: 1;
  host: string;
  pid: number;
  acquiredAt: string;
}
interface TransitionJournal {
  schemaVersion: 1;
  id: string;
  label: string;
  createdAt: string;
  repository: {
    root: string;
    branch: string;
    head: string;
    statusHash: string;
  };
  files: Record<string, string>;
}

const lockPath = (root: string) =>
  resolve(resolveOperationalDirectory(root), 'state-mutex');
const journalPath = (root: string) =>
  resolve(resolveOperationalDirectory(root), 'active-transition.json');
const managedFiles = ['lease.json', 'resume.json'];
const managedDirectories = [
  'program-state',
  'resume',
  'human-validation',
  'human-decisions',
];
const heldOperationalLocks = new Set<string>();
const pause = (milliseconds: number) =>
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)),
    0,
    0,
    milliseconds,
  );

const collectDirectoryFiles = (
  root: string,
  relativeDirectory: string,
): string[] => {
  const directory = resolve(
    resolveOperationalDirectory(root),
    relativeDirectory,
  );
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const relativePath = `${relativeDirectory}/${entry}`;
    const absolutePath = resolve(
      resolveOperationalDirectory(root),
      relativePath,
    );
    return statSync(absolutePath).isDirectory()
      ? collectDirectoryFiles(root, relativePath)
      : [relativePath];
  });
};
const currentManagedPaths = (root: string) => [
  ...managedFiles.filter((path) =>
    existsSync(resolve(resolveOperationalDirectory(root), path)),
  ),
  ...managedDirectories.flatMap((path) => collectDirectoryFiles(root, path)),
];
const snapshotManagedState = (root: string) =>
  Object.fromEntries(
    currentManagedPaths(root).map((path) => [
      path,
      readFileSync(resolve(resolveOperationalDirectory(root), path)).toString(
        'base64',
      ),
    ]),
  );
const restoreManagedState = (root: string, files: Record<string, string>) => {
  const operational = resolveOperationalDirectory(root);
  currentManagedPaths(root)
    .filter((path) => !(path in files))
    .forEach((path) => unlinkSync(resolve(operational, path)));
  Object.entries(files).forEach(([path, base64]) => {
    const destination = resolve(operational, path);
    mkdirSync(dirname(destination), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.restore`;
    writeFileSync(temporary, Buffer.from(base64, 'base64'), {
      flag: 'wx',
      mode: 0o600,
    });
    renameSync(temporary, destination);
  });
};
const restoreTransactionSnapshot = (
  root: string,
  journal: TransitionJournal,
) => {
  const identity = readRepositoryIdentity(root);
  if (
    identity.root !== journal.repository.root ||
    identity.branch !== journal.repository.branch ||
    identity.head !== journal.repository.head ||
    identity.statusHash !== journal.repository.statusHash
  ) {
    throw new Error(
      'Repository identity changed after the interrupted transition; automatic rollback is unsafe.',
    );
  }
  restoreManagedState(root, journal.files);
  const lease = readLease(root);
  if (lease && identity.head === lease.startingHead) {
    writeResumeMarker(
      root,
      lease,
      'checkpointed',
      `Recovered operational transition ${journal.id}.`,
    );
  }
};

export const readOperationalLock = (
  root: string,
): OperationalLockOwner | null => {
  const path = resolve(lockPath(root), 'owner.json');
  return existsSync(path) ? readJsonFile<OperationalLockOwner>(path) : null;
};

export const withOperationalLock = <T>(root: string, operation: () => T): T => {
  if (heldOperationalLocks.has(root)) return operation();
  const ownerDirectory = resolve(
    resolveOperationalDirectory(root),
    `state-mutex-owner-${randomUUID()}`,
  );
  mkdirSync(ownerDirectory, { mode: 0o700 });
  writeJsonFileAtomic(resolve(ownerDirectory, 'owner.json'), {
    schemaVersion: 1,
    host: hostname(),
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  } satisfies OperationalLockOwner);
  try {
    symlinkSync(ownerDirectory, lockPath(root), 'dir');
  } catch (error) {
    rmSync(ownerDirectory, { recursive: true, force: true });
    throw new Error(
      `Operational state mutation is already active. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  heldOperationalLocks.add(root);
  try {
    return operation();
  } finally {
    try {
      unlinkSync(lockPath(root));
    } finally {
      heldOperationalLocks.delete(root);
      rmSync(ownerDirectory, { recursive: true, force: true });
    }
  }
};

export const recoverOperationalLock = (options: {
  root: string;
  expectedHost: string;
  expectedPid: number;
}) => {
  const owner = readOperationalLock(options.root);
  if (
    !owner ||
    owner.host !== options.expectedHost ||
    owner.pid !== options.expectedPid
  ) {
    throw new Error(
      'Operational mutex identity does not match recovery request.',
    );
  }
  if (owner.host !== hostname()) {
    throw new Error('Cannot prove a remote operational mutex owner is dead.');
  }
  if (processIsAlive(owner.pid)) {
    throw new Error('Operational mutex owner process is still alive.');
  }
  const archivedPath = `${lockPath(options.root)}.recovered-${Date.now()}-${randomUUID()}`;
  renameSync(lockPath(options.root), archivedPath);
  return { owner, archivedPath };
};

export const readOperationalTransaction = (root: string) =>
  existsSync(journalPath(root))
    ? readJsonFile<TransitionJournal>(journalPath(root))
    : null;

export const withOperationalTransaction = <T>(
  root: string,
  label: string,
  operation: () => T,
) =>
  withOperationalLock(root, () => {
    if (existsSync(journalPath(root))) {
      throw new Error(
        'An interrupted operational transition requires recovery.',
      );
    }
    const journal: TransitionJournal = {
      schemaVersion: 1,
      id: randomUUID(),
      label,
      createdAt: new Date().toISOString(),
      repository: (() => {
        const identity = readRepositoryIdentity(root);
        return {
          root: identity.root,
          branch: identity.branch,
          head: identity.head,
          statusHash: identity.statusHash,
        };
      })(),
      files: snapshotManagedState(root),
    };
    writeJsonFileAtomic(journalPath(root), journal);
    try {
      const result = operation();
      unlinkSync(journalPath(root));
      return result;
    } catch (error) {
      restoreTransactionSnapshot(root, journal);
      unlinkSync(journalPath(root));
      throw error;
    }
  });

export const withOperationalSnapshot = <T>(
  root: string,
  operation: () => T,
) => {
  const deadline = Date.now() + 2_000;
  for (;;) {
    try {
      return withOperationalLock(root, () => {
        if (existsSync(journalPath(root))) {
          throw new Error(
            'An interrupted operational transition requires recovery before reading state.',
          );
        }
        return operation();
      });
    } catch (error) {
      const owner = readOperationalLock(root);
      const retryable =
        error instanceof Error &&
        error.message.startsWith(
          'Operational state mutation is already active.',
        ) &&
        owner?.host === hostname() &&
        processIsAlive(owner.pid) &&
        Date.now() < deadline;
      if (!retryable) throw error;
      pause(20);
    }
  }
};

export const recoverOperationalTransaction = (options: {
  root: string;
  expectedId: string;
}) =>
  withOperationalLock(options.root, () => {
    const journal = readOperationalTransaction(options.root);
    if (!journal || journal.id !== options.expectedId) {
      throw new Error(
        'Operational transition identity does not match recovery request.',
      );
    }
    restoreTransactionSnapshot(options.root, journal);
    const archiveDirectory = resolve(
      resolveOperationalDirectory(options.root),
      'transition-archive',
    );
    mkdirSync(archiveDirectory, { recursive: true });
    const archivedPath = resolve(
      archiveDirectory,
      `${journal.createdAt.replaceAll(':', '-')}-${journal.id}.json`,
    );
    renameSync(journalPath(options.root), archivedPath);
    return { journal, archivedPath };
  });
