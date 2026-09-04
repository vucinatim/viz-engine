import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CheckPlan,
  CheckStage,
  canonicalCheckPlan,
  checkStages,
} from './check-contract';
import { readJsonFile } from './json-file';
import { readRepositoryIdentity } from './repository-state';

interface RecordedRepositoryIdentity {
  head: string;
  branch: string;
  statusHash: string;
}
interface RecordedLeaseIdentity {
  id: string;
  owner: string;
  workItemId: string;
  claimId: string;
}
interface CheckResult {
  id: string;
  status: 'passed' | 'failed';
  durationMs: number;
  exitCode: number;
}
interface ChangedFileIdentity {
  path: string;
  sha256: string | null;
  baseBlob: string | null;
}

export interface CheckEvidenceRecord {
  schemaVersion: 2;
  kind: 'viz-engine-check-run';
  stage: CheckStage;
  status: 'passed' | 'failed';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  planHash: string;
  plan: CheckPlan;
  changedFiles: ChangedFileIdentity[];
  repository: {
    starting: RecordedRepositoryIdentity;
    final: RecordedRepositoryIdentity;
  };
  operational: {
    startingLease: RecordedLeaseIdentity | null;
    finalLease: RecordedLeaseIdentity | null;
    leaseStable: boolean;
    observationFailure?: string;
  };
  contracts: {
    programId: string | null;
    programDefinitionHash: string | null;
    sensoryMapHash: string;
    certificationMatrixHash: string;
    sensoryCriteria: number | null;
    documentFilesChecked: number | null;
  };
  environment: {
    platform: string;
    architecture: string;
    node: string;
    quiet: {
      CI: '1';
      PLAYWRIGHT_HTML_OPEN: 'never';
      VIZ_AUDIO_MUTED: '1';
    };
  };
  repositoryStable: boolean;
  results: CheckResult[];
  failure?: string;
}

export interface CheckEvidenceExpectation {
  checkStage?: CheckStage;
  programDefinitionHash?: string;
  claimId?: string;
  leaseId?: string;
  startingHead?: string;
  terminalHead?: string;
  enforceCanonicalPlan?: boolean;
  requirePassing?: boolean;
}

const commitPattern = /^[0-9a-f]{40}$/u;
const sha256Pattern = /^[0-9a-f]{64}$/u;
const stableId = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/u;
const nonEmpty = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;
const timestamp = (value: unknown) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const fileHash = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const validRepositoryIdentity = (value: RecordedRepositoryIdentity) =>
  value &&
  commitPattern.test(value.head) &&
  nonEmpty(value.branch) &&
  sha256Pattern.test(value.statusHash);
const validLeaseIdentity = (value: RecordedLeaseIdentity | null) =>
  value === null ||
  (nonEmpty(value.id) &&
    nonEmpty(value.owner) &&
    nonEmpty(value.workItemId) &&
    nonEmpty(value.claimId));

const validatePlan = (
  record: CheckEvidenceRecord,
  label: string,
  root: string,
  enforceCanonicalPlan: boolean,
) => {
  const plan = record.plan;
  if (
    !plan ||
    plan.stage !== record.stage ||
    !checkStages.includes(record.stage) ||
    !Array.isArray(plan.changedFiles) ||
    !Array.isArray(plan.commands) ||
    createHash('sha256').update(JSON.stringify(plan)).digest('hex') !==
      record.planHash ||
    plan.commands.some(
      (command) =>
        !command ||
        !stableId.test(command.id) ||
        !nonEmpty(command.command) ||
        !Array.isArray(command.arguments) ||
        command.arguments.some((argument) => typeof argument !== 'string') ||
        !nonEmpty(command.reason),
    ) ||
    new Set(plan.commands.map(({ id }) => id)).size !== plan.commands.length ||
    plan.changedFiles.some((path) => {
      const absolute = resolve(root, path);
      return (
        !nonEmpty(path) ||
        path.startsWith('/') ||
        absolute === root ||
        !absolute.startsWith(`${root}/`)
      );
    })
  ) {
    throw new Error(`${label} has a malformed check plan.`);
  }
  if (
    enforceCanonicalPlan &&
    !same(canonicalCheckPlan(record.stage, plan.changedFiles), plan)
  ) {
    throw new Error(`${label} does not contain the canonical check plan.`);
  }
  return plan;
};

const validateResults = (
  record: CheckEvidenceRecord,
  label: string,
  plan: CheckPlan,
) => {
  if (!Array.isArray(record.results)) {
    throw new Error(`${label} has malformed command results.`);
  }
  const plannedIds = plan.commands.map(({ id }) => id);
  const resultIds = record.results.map(({ id }) => id);
  const prefixMatches = resultIds.every(
    (id, index) => id === plannedIds[index],
  );
  const shaped = record.results.every(
    (result) =>
      result &&
      stableId.test(result.id) &&
      ['passed', 'failed'].includes(result.status) &&
      Number.isFinite(result.durationMs) &&
      result.durationMs >= 0 &&
      Number.isInteger(result.exitCode),
  );
  if (!prefixMatches || !shaped || record.results.length > plannedIds.length) {
    throw new Error(`${label} has malformed command results.`);
  }
  if (
    record.status === 'passed' &&
    (resultIds.length !== plannedIds.length ||
      record.results.some(
        ({ status, exitCode }) => status !== 'passed' || exitCode !== 0,
      ))
  ) {
    throw new Error(`${label} does not reference a passing check record.`);
  }
  if (
    record.status === 'failed' &&
    !record.failure &&
    !record.results.some(
      ({ status, exitCode }) => status === 'failed' || exitCode !== 0,
    )
  ) {
    throw new Error(`${label} failed without a recorded failure.`);
  }
};

const validateChangedFiles = (
  record: CheckEvidenceRecord,
  label: string,
  plan: CheckPlan,
) => {
  if (
    !Array.isArray(record.changedFiles) ||
    record.changedFiles.map(({ path }) => path).join('\0') !==
      plan.changedFiles.join('\0') ||
    record.changedFiles.some(
      (file) =>
        !file ||
        !nonEmpty(file.path) ||
        (file.sha256 !== null && !sha256Pattern.test(file.sha256)) ||
        (file.baseBlob !== null && !commitPattern.test(file.baseBlob)),
    )
  ) {
    throw new Error(`${label} changed-file identities do not match its plan.`);
  }
};

const validateRecordedIdentity = (
  record: CheckEvidenceRecord,
  label: string,
) => {
  const repositoryActuallyStable = same(
    record.repository?.starting,
    record.repository?.final,
  );
  if (
    !record.repository ||
    !validRepositoryIdentity(record.repository.starting) ||
    !validRepositoryIdentity(record.repository.final) ||
    record.repositoryStable !== repositoryActuallyStable ||
    (record.status === 'passed' && !repositoryActuallyStable)
  ) {
    throw new Error(`${label} check identity changed while it ran.`);
  }
  const operational = record.operational;
  const leaseActuallyStable = same(
    operational?.startingLease,
    operational?.finalLease,
  );
  if (
    !operational ||
    !validLeaseIdentity(operational.startingLease) ||
    !validLeaseIdentity(operational.finalLease)
  ) {
    throw new Error(`${label} lease identity changed while it ran.`);
  }
  if (operational.observationFailure) {
    if (
      record.status !== 'failed' ||
      !nonEmpty(operational.observationFailure) ||
      operational.leaseStable
    ) {
      throw new Error(`${label} has malformed lease observation failure.`);
    }
  } else if (
    operational.leaseStable !== leaseActuallyStable ||
    (record.status === 'passed' && !leaseActuallyStable)
  ) {
    throw new Error(`${label} lease identity changed while it ran.`);
  }
};

const validateMetadata = (record: CheckEvidenceRecord, label: string) => {
  if (
    record.schemaVersion !== 2 ||
    record.kind !== 'viz-engine-check-run' ||
    !['passed', 'failed'].includes(record.status) ||
    !timestamp(record.startedAt) ||
    !timestamp(record.finishedAt) ||
    !Number.isFinite(record.durationMs) ||
    record.durationMs < 0 ||
    Date.parse(record.finishedAt) < Date.parse(record.startedAt) ||
    Math.abs(
      Date.parse(record.finishedAt) -
        Date.parse(record.startedAt) -
        record.durationMs,
    ) > 1
  ) {
    throw new Error(`${label} has malformed check-run metadata.`);
  }
  const contracts = record.contracts;
  if (
    !contracts ||
    (contracts.programId !== null && !nonEmpty(contracts.programId)) ||
    (contracts.programDefinitionHash !== null &&
      !sha256Pattern.test(contracts.programDefinitionHash)) ||
    !sha256Pattern.test(contracts.sensoryMapHash) ||
    !sha256Pattern.test(contracts.certificationMatrixHash) ||
    (contracts.sensoryCriteria !== null &&
      (!Number.isInteger(contracts.sensoryCriteria) ||
        contracts.sensoryCriteria < 0)) ||
    (contracts.documentFilesChecked !== null &&
      (!Number.isInteger(contracts.documentFilesChecked) ||
        contracts.documentFilesChecked < 0))
  ) {
    throw new Error(`${label} has malformed contract identities.`);
  }
  if (
    !record.environment ||
    !nonEmpty(record.environment.platform) ||
    !nonEmpty(record.environment.architecture) ||
    !nonEmpty(record.environment.node) ||
    record.environment.quiet?.CI !== '1' ||
    record.environment.quiet.PLAYWRIGHT_HTML_OPEN !== 'never' ||
    record.environment.quiet.VIZ_AUDIO_MUTED !== '1'
  ) {
    throw new Error(`${label} has malformed environment identity.`);
  }
  if (
    record.status === 'passed' &&
    (!nonEmpty(contracts.programId) ||
      !contracts.programDefinitionHash ||
      contracts.sensoryCriteria !== 46 ||
      contracts.documentFilesChecked === null)
  ) {
    throw new Error(`${label} passing record lacks complete contracts.`);
  }
};

const validateTerminalBinding = (
  record: CheckEvidenceRecord,
  label: string,
  root: string,
  expected: CheckEvidenceExpectation,
) => {
  if (!expected.startingHead || !expected.terminalHead) return;
  if (record.repository.final.head !== expected.startingHead) {
    throw new Error(
      `${label} must be recorded before the terminal checkpoint commit.`,
    );
  }
  const committedFiles = execFileSync(
    'git',
    [
      'diff',
      '--name-only',
      '--diff-filter=ACMRD',
      `${expected.startingHead}..${expected.terminalHead}`,
    ],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();
  if (
    committedFiles.join('\0') !==
    [...record.plan.changedFiles].sort().join('\0')
  ) {
    throw new Error(`${label} does not cover the terminal commit diff.`);
  }
  record.changedFiles.forEach((file) => {
    const commitPath = `${expected.terminalHead}:${file.path}`;
    if (file.sha256 === null) {
      try {
        execFileSync('git', ['cat-file', '-e', commitPath], {
          cwd: root,
          stdio: 'ignore',
        });
      } catch {
        return;
      }
      throw new Error(`${label} expected ${file.path} to be deleted.`);
    }
    let committed: Buffer;
    try {
      const byteLength = Number(
        execFileSync('git', ['cat-file', '-s', commitPath], {
          cwd: root,
          encoding: 'utf8',
        }).trim(),
      );
      if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
        throw new Error(`Invalid committed byte length for ${file.path}.`);
      }
      committed = execFileSync('git', ['show', commitPath], {
        cwd: root,
        maxBuffer: byteLength + 64 * 1024,
      });
    } catch {
      throw new Error(`${label} terminal commit lacks ${file.path}.`);
    }
    if (createHash('sha256').update(committed).digest('hex') !== file.sha256) {
      throw new Error(`${label} terminal content differs for ${file.path}.`);
    }
  });
};

export const validateCheckEvidenceRecord = (
  record: CheckEvidenceRecord,
  label: string,
  root: string,
  expected: CheckEvidenceExpectation = {},
) => {
  validateMetadata(record, label);
  const plan = validatePlan(
    record,
    label,
    root,
    expected.enforceCanonicalPlan ?? false,
  );
  validateResults(record, label, plan);
  validateChangedFiles(record, label, plan);
  validateRecordedIdentity(record, label);
  if (expected.requirePassing && record.status !== 'passed') {
    throw new Error(`${label} does not reference a passing check record.`);
  }
  if (expected.checkStage && record.stage !== expected.checkStage) {
    throw new Error(`${label} must reference a ${expected.checkStage} check.`);
  }
  if (
    expected.programDefinitionHash &&
    record.contracts.programDefinitionHash !== expected.programDefinitionHash
  ) {
    throw new Error(
      `${label} was produced against another program definition.`,
    );
  }
  const startingLease = record.operational.startingLease;
  const finalLease = record.operational.finalLease;
  if (
    expected.claimId &&
    (startingLease?.claimId !== expected.claimId ||
      finalLease?.claimId !== expected.claimId ||
      startingLease.id !== expected.leaseId ||
      finalLease.id !== expected.leaseId)
  ) {
    throw new Error(`${label} was not produced under this work-item claim.`);
  }
  validateTerminalBinding(record, label, root, expected);

  if (expected.enforceCanonicalPlan) {
    const current = readRepositoryIdentity(root);
    const final = record.repository.final;
    if (final.branch !== current.branch) {
      throw new Error(`${label} check branch differs from the current branch.`);
    }
    if (current.clean) {
      try {
        execFileSync(
          'git',
          ['merge-base', '--is-ancestor', final.head, current.head],
          {
            cwd: root,
            stdio: 'ignore',
          },
        );
      } catch {
        throw new Error(`${label} check commit is not an ancestor of HEAD.`);
      }
    } else if (
      final.head !== current.head ||
      final.statusHash !== current.statusHash
    ) {
      throw new Error(`${label} is stale for the current worktree.`);
    }
    record.changedFiles.forEach((file) => {
      const currentPath = resolve(root, file.path);
      if (
        file.sha256 === null
          ? existsSync(currentPath)
          : !existsSync(currentPath) || fileHash(currentPath) !== file.sha256
      ) {
        throw new Error(`${label} is stale for ${file.path}.`);
      }
    });
  }
  return record;
};

export const readAndValidateCheckEvidence = (
  path: string,
  label: string,
  root: string,
  expected: CheckEvidenceExpectation = {},
) =>
  validateCheckEvidenceRecord(
    readJsonFile<CheckEvidenceRecord>(path),
    label,
    root,
    expected,
  );
