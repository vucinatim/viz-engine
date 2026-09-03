import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { readAndValidateCheckEvidence } from './check-evidence';
import { getChangedFiles } from './checks';
import { readHumanValidationQueue } from './human-validation';
import { writeJsonFileAtomic } from './json-file';
import { readLease, readResumeMarker } from './lease';
import { withOperationalSnapshot } from './operational-lock';
import { defaultProgramPath, repositoryRoot } from './paths';
import { readExecutionProgram, summarizeExecutionProgram } from './program';
import { readRepositoryIdentity } from './repository-state';
import { readAndValidateSensoryMap } from './sensory-map';

const sha256 = (bytes: string | Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
export const classifyCheckEvidence = (
  path: string,
  identity: { head: string; branch: string; statusHash: string },
  root = repositoryRoot,
  programDefinitionHash?: string,
) => {
  const bytes = readFileSync(path);
  try {
    const record = readAndValidateCheckEvidence(
      path,
      'review packet check evidence',
      root,
    );
    const final = record.repository.final;
    const classification =
      final.head === identity.head &&
      final.branch === identity.branch &&
      final.statusHash === identity.statusHash
        ? 'current'
        : 'stale';
    if (classification === 'current' && record.status === 'passed') {
      readAndValidateCheckEvidence(path, 'review packet check evidence', root, {
        checkStage: record.stage,
        programDefinitionHash,
        enforceCanonicalPlan: true,
        requirePassing: true,
      });
    }
    return {
      file: relative(root, path),
      sha256: sha256(bytes),
      classification,
      stage: record.stage,
      status: record.status,
      finishedAt: record.finishedAt,
      durationMs: record.durationMs,
      recordedIdentity: final,
    };
  } catch (error) {
    return {
      file: relative(root, path),
      sha256: sha256(bytes),
      classification: 'invalid',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
const latestCheckEvidence = (
  identity: { head: string; branch: string; statusHash: string },
  programDefinitionHash: string,
) => {
  const directory = resolve(repositoryRoot, '.artifacts/autonomy/checks');
  if (!existsSync(directory)) return [];
  const classified = readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse()
    .map((file) =>
      classifyCheckEvidence(
        resolve(directory, file),
        identity,
        repositoryRoot,
        programDefinitionHash,
      ),
    );
  const selectedStages = new Set<string>();
  let invalidCount = 0;
  return classified.filter((record) => {
    if (record.classification === 'invalid' || !record.stage) {
      invalidCount += 1;
      return invalidCount <= 3;
    }
    if (selectedStages.has(record.stage)) return false;
    selectedStages.add(record.stage);
    return true;
  });
};

const createReviewPacketImpl = (programPath: string) => {
  const createdAt = new Date();
  const startingIdentity = readRepositoryIdentity();
  const program = readExecutionProgram(programPath);
  const sensory = readAndValidateSensoryMap();
  const humanQueue = readHumanValidationQueue(
    undefined,
    repositoryRoot,
    new Set(program.workItems.map(({ id }) => id)),
    program.id,
  );
  const changedFiles = getChangedFiles();
  const checks = latestCheckEvidence(startingIdentity, program.definitionHash);
  const finalIdentity = readRepositoryIdentity();
  if (
    startingIdentity.head !== finalIdentity.head ||
    startingIdentity.branch !== finalIdentity.branch ||
    startingIdentity.statusHash !== finalIdentity.statusHash
  ) {
    throw new Error('Repository changed while assembling the review packet.');
  }
  const packet = {
    schemaVersion: 2,
    kind: 'viz-engine-autonomous-review-packet',
    createdAt: createdAt.toISOString(),
    identity: {
      branch: finalIdentity.branch,
      head: finalIdentity.head,
      clean: finalIdentity.clean,
      statusHash: finalIdentity.statusHash,
    },
    program: summarizeExecutionProgram(program),
    operational: {
      lease: readLease(repositoryRoot),
      resume: readResumeMarker(repositoryRoot),
    },
    sensoryCoverage: sensory.counts,
    humanValidation: {
      pending: humanQueue.items.filter((item) => item.status === 'pending'),
      resolved: humanQueue.items.filter((item) => item.status === 'resolved')
        .length,
    },
    checks,
    currentPassingCheckStages: checks
      .filter(
        (check) =>
          check.classification === 'current' && check.status === 'passed',
      )
      .map((check) => check.stage),
    diff: {
      changedFiles: changedFiles.map((path) => {
        const absolutePath = resolve(repositoryRoot, path);
        return {
          path,
          sha256: existsSync(absolutePath)
            ? sha256(readFileSync(absolutePath))
            : null,
        };
      }),
    },
  };
  const directory = resolve(repositoryRoot, '.artifacts/autonomy/review');
  mkdirSync(directory, { recursive: true });
  const path = resolve(
    directory,
    `${createdAt.toISOString().replaceAll(':', '-')}-review-packet.json`,
  );
  writeJsonFileAtomic(path, packet);
  return {
    packet,
    path: relative(repositoryRoot, path),
    sha256: sha256(readFileSync(path)),
  };
};

export const createReviewPacket = (programPath = defaultProgramPath) =>
  withOperationalSnapshot(repositoryRoot, () =>
    createReviewPacketImpl(programPath),
  );
