import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { relative, resolve } from 'node:path';

import {
  CheckStage,
  canonicalCheckPlan,
  checkStages,
  isPrettierFile,
} from './check-contract';
import {
  CheckEvidenceRecord,
  validateCheckEvidenceRecord,
} from './check-evidence';
import { validateLocalDocumentLinks } from './document-links';
import { readHumanValidationQueue } from './human-validation';
import { writeJsonFileAtomic } from './json-file';
import { readLease } from './lease';
import { withOperationalSnapshot } from './operational-lock';
import { defaultProgramPath, repositoryRoot } from './paths';
import { readExecutionProgram } from './program';
import { readRepositoryIdentity } from './repository-state';
import { readAndValidateSensoryMap } from './sensory-map';

export { checkStages };
export type { CheckStage };

const unique = <T>(values: T[]) => [...new Set(values)];

const runGit = (arguments_: string[], root = repositoryRoot) => {
  const result = spawnSync('git', arguments_, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0)
    throw new Error(result.stderr || 'Git command failed.');
  return result.stdout.trim();
};

export const getChangedFiles = (base = 'HEAD', root = repositoryRoot) => {
  const tracked = runGit(
    ['diff', '--name-only', '--diff-filter=ACMRD', base],
    root,
  );
  const staged = runGit(
    ['diff', '--cached', '--name-only', '--diff-filter=ACMRD', base],
    root,
  );
  const untracked = runGit(
    ['ls-files', '--others', '--exclude-standard'],
    root,
  );
  return unique(
    [tracked, staged, untracked]
      .flatMap((value) => value.split('\n'))
      .map((value) => value.trim())
      .filter(Boolean),
  ).sort();
};

export const planChecks = (
  stage: CheckStage,
  changedFiles = getChangedFiles(),
) => canonicalCheckPlan(stage, changedFiles);

export const runChecks = (options: {
  stage: CheckStage;
  changedFiles?: string[];
  record?: boolean;
  programPath?: string;
  root?: string;
}) => {
  const root = options.root ?? repositoryRoot;
  const startedAt = new Date();
  const plan = planChecks(
    options.stage,
    options.changedFiles ?? getChangedFiles('HEAD', root),
  );
  const startingRepository = readRepositoryIdentity(root);
  const leaseIdentity = (lease: ReturnType<typeof readLease>) =>
    lease
      ? {
          id: lease.id,
          owner: lease.owner,
          workItemId: lease.workItemId,
          claimId: lease.claimId,
        }
      : null;
  let startingLease: ReturnType<typeof leaseIdentity> = null;

  const results: Array<{
    id: string;
    status: 'passed' | 'failed';
    durationMs: number;
    exitCode: number;
  }> = [];
  let programId: string | null = null;
  let programDefinitionHash: string | null = null;
  let sensoryCriteria: number | null = null;
  let documentFilesChecked: number | null = null;
  let failure: string | undefined;
  let operationalObservationFailure: string | undefined;
  try {
    startingLease = withOperationalSnapshot(root, () =>
      leaseIdentity(readLease(root)),
    );
    withOperationalSnapshot(root, () => {
      const program = readExecutionProgram(
        options.programPath ?? defaultProgramPath,
        root,
      );
      const sensory = readAndValidateSensoryMap();
      readHumanValidationQueue(
        undefined,
        root,
        new Set(program.workItems.map(({ id }) => id)),
        program.id,
      );
      const docs = validateLocalDocumentLinks(
        unique([
          'README.md',
          'AGENTS.md',
          'CLAUDE.md',
          'docs/docs-index.md',
          'docs/current-state.md',
          'docs/autonomous-development-compass.md',
          'docs/working-agreements.md',
          'docs/plans/v2/goal-five-autonomous-sensory-feedback-operating-system.md',
          ...plan.changedFiles,
        ]),
      );
      programId = program.id;
      programDefinitionHash = program.definitionHash;
      sensoryCriteria = sensory.criteria.length;
      documentFilesChecked = docs.filesChecked;
    });
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    if (failure.includes('Operational state')) {
      operationalObservationFailure = failure;
    }
  }

  if (!failure) {
    for (const entry of plan.commands) {
      const commandStartedAt = performance.now();
      const result = spawnSync(entry.command, entry.arguments, {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          CI: '1',
          FORCE_COLOR: '0',
          PLAYWRIGHT_HTML_OPEN: 'never',
          VIZ_AUDIO_MUTED: '1',
        },
      });
      const status = result.status === 0 ? 'passed' : 'failed';
      results.push({
        id: entry.id,
        status,
        durationMs: Math.round(performance.now() - commandStartedAt),
        exitCode: result.status ?? 1,
      });
      if (status === 'failed') break;
    }
  }

  const finishedAt = new Date();
  const finalRepository = readRepositoryIdentity(root);
  let finalLease: ReturnType<typeof leaseIdentity> = null;
  try {
    finalLease = withOperationalSnapshot(root, () =>
      leaseIdentity(readLease(root)),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    operationalObservationFailure = message;
    failure = failure ? `${failure}; final snapshot: ${message}` : message;
  }
  const repositoryStable =
    startingRepository.head === finalRepository.head &&
    startingRepository.branch === finalRepository.branch &&
    startingRepository.statusHash === finalRepository.statusHash;
  const leaseStable =
    !operationalObservationFailure &&
    JSON.stringify(startingLease) === JSON.stringify(finalLease);
  const appendFailure = (message: string) => {
    failure = failure ? `${failure}; ${message}` : message;
  };
  if (!repositoryStable) {
    appendFailure('Repository identity changed while checks ran.');
  }
  if (!leaseStable && !operationalObservationFailure) {
    appendFailure('Writer lease identity changed while checks ran.');
  }
  const passed =
    !failure &&
    results.length === plan.commands.length &&
    results.every((result) => result.status === 'passed') &&
    repositoryStable &&
    leaseStable;
  const hashFile = (path: string) =>
    createHash('sha256')
      .update(readFileSync(resolve(root, path)))
      .digest('hex');
  const hashContractFile = (path: string) =>
    existsSync(resolve(root, path))
      ? hashFile(path)
      : createHash('sha256').update(`missing:${path}`).digest('hex');
  const evidence: CheckEvidenceRecord = {
    schemaVersion: 2,
    kind: 'viz-engine-check-run',
    stage: options.stage,
    status: passed ? 'passed' : 'failed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    planHash: createHash('sha256').update(JSON.stringify(plan)).digest('hex'),
    plan,
    changedFiles: plan.changedFiles.map((path) => {
      const baseBlob = spawnSync('git', ['rev-parse', `HEAD:${path}`], {
        cwd: root,
        encoding: 'utf8',
      });
      return {
        path,
        sha256: existsSync(resolve(root, path)) ? hashFile(path) : null,
        baseBlob: baseBlob.status === 0 ? baseBlob.stdout.trim() : null,
      };
    }),
    repository: {
      starting: {
        head: startingRepository.head,
        branch: startingRepository.branch,
        statusHash: startingRepository.statusHash,
      },
      final: {
        head: finalRepository.head,
        branch: finalRepository.branch,
        statusHash: finalRepository.statusHash,
      },
    },
    operational: {
      startingLease,
      finalLease,
      leaseStable,
      ...(operationalObservationFailure
        ? { observationFailure: operationalObservationFailure }
        : {}),
    },
    contracts: {
      programId,
      programDefinitionHash,
      sensoryMapHash: hashContractFile(
        'docs/parity/goal-five-sensory-map.json',
      ),
      certificationMatrixHash: hashContractFile(
        'docs/parity/goal-five-certification-matrix.json',
      ),
      sensoryCriteria,
      documentFilesChecked,
    },
    environment: {
      platform: platform(),
      architecture: arch(),
      node: process.version,
      quiet: {
        CI: '1',
        PLAYWRIGHT_HTML_OPEN: 'never',
        VIZ_AUDIO_MUTED: '1',
      },
    },
    repositoryStable,
    results,
    ...(failure ? { failure } : {}),
  };
  validateCheckEvidenceRecord(evidence, 'generated check record', root);
  let evidencePath: string | null = null;
  if (options.record !== false) {
    const directory = resolve(root, '.artifacts/autonomy/checks');
    mkdirSync(directory, { recursive: true });
    evidencePath = resolve(
      directory,
      `${startedAt.toISOString().replaceAll(':', '-')}-${options.stage}.json`,
    );
    writeJsonFileAtomic(evidencePath, evidence);
  }
  return {
    ...evidence,
    evidencePath: evidencePath ? relative(root, evidencePath) : null,
  };
};

export const canonicalizeChangedFiles = (
  mode: 'check' | 'apply',
  changedFiles = getChangedFiles(),
) => {
  const files = changedFiles.filter((file) => isPrettierFile(file));
  if (files.length === 0) return { mode, files: [], status: 'passed' as const };
  const result = spawnSync(
    'pnpm',
    ['exec', 'prettier', mode === 'apply' ? '--write' : '--check', ...files],
    { cwd: repositoryRoot, stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error(`Canonicalizer ${mode} failed.`);
  return { mode, files, status: 'passed' as const };
};
