import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { CheckStage } from './check-contract';
import { readAndValidateCheckEvidence } from './check-evidence';
import { getChangedFiles } from './checks';
import { readHumanValidationQueue } from './human-validation';
import { writeJsonFileAtomic } from './json-file';
import { readLease, readResumeMarker } from './lease';
import { withOperationalSnapshot } from './operational-lock';
import {
  defaultProgramPath,
  repositoryRoot,
  resolveOperationalDirectory,
} from './paths';
import {
  ExecutionProgram,
  readExecutionProgram,
  summarizeExecutionProgram,
} from './program';
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

export const classifyAdmittedCheckEvidence = (options: {
  reference: string;
  workItemId: string;
  requirementId: string;
  checkStage: CheckStage | undefined;
  programDefinitionHash: string;
  terminalIdentity: NonNullable<
    ExecutionProgram['workItems'][number]['terminalIdentity']
  >;
  root?: string;
}) => {
  const root = options.root ?? repositoryRoot;
  const hash = options.reference.match(/^command:sha256:([0-9a-f]{64})$/u)?.[1];
  const identity = {
    workItemId: options.workItemId,
    requirementId: options.requirementId,
    reference: options.reference,
    terminalHead: options.terminalIdentity.head,
  };
  if (!hash) {
    return {
      ...identity,
      classification: 'invalid' as const,
      error: 'Admitted command evidence reference is malformed.',
    };
  }
  const path = resolve(resolveOperationalDirectory(root), 'evidence', hash);
  if (!existsSync(path)) {
    return {
      ...identity,
      classification: 'invalid' as const,
      error: 'Admitted command evidence object is missing.',
    };
  }
  try {
    const record = readAndValidateCheckEvidence(
      path,
      `review packet ${options.workItemId}.${options.requirementId}`,
      root,
      {
        checkStage: options.checkStage,
        programDefinitionHash: options.programDefinitionHash,
        claimId: options.terminalIdentity.claimId,
        leaseId: options.terminalIdentity.leaseId,
        startingHead: options.terminalIdentity.startingHead,
        terminalHead: options.terminalIdentity.head,
        // Completion already admitted the canonical plan. Historical evidence
        // is revalidated against its recorded plan and terminal bytes rather
        // than reinterpreted through a later tool version or active diff.
        enforceCanonicalPlan: false,
        requirePassing: true,
      },
    );
    return {
      ...identity,
      sha256: hash,
      classification: 'admitted' as const,
      stage: record.stage,
      status: record.status,
      finishedAt: record.finishedAt,
      durationMs: record.durationMs,
      recordedIdentity: record.repository.final,
    };
  } catch (error) {
    return {
      ...identity,
      sha256: hash,
      classification: 'invalid' as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const admittedCheckEvidence = (program: ExecutionProgram) =>
  program.workItems.flatMap((item) => {
    if (item.status !== 'complete' || !item.terminalIdentity) return [];
    const requirements = new Map(
      item.evidenceRequirements.map((requirement) => [
        requirement.id,
        requirement,
      ]),
    );
    return item.evidence
      .filter(({ reference }) => reference.startsWith('command:'))
      .map(({ requirementId, reference }) =>
        classifyAdmittedCheckEvidence({
          reference,
          workItemId: item.id,
          requirementId,
          checkStage: requirements.get(requirementId)?.checkStage,
          programDefinitionHash: program.definitionHash,
          terminalIdentity: item.terminalIdentity!,
        }),
      );
  });
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
  const admittedChecks = admittedCheckEvidence(program);
  const finalIdentity = readRepositoryIdentity();
  if (
    startingIdentity.head !== finalIdentity.head ||
    startingIdentity.branch !== finalIdentity.branch ||
    startingIdentity.statusHash !== finalIdentity.statusHash
  ) {
    throw new Error('Repository changed while assembling the review packet.');
  }
  const packet = {
    schemaVersion: 3,
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
    admittedChecks,
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
