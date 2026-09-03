import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CheckPlan } from '../../tools/repo/lib/check-contract';
import { CheckEvidenceRecord } from '../../tools/repo/lib/check-evidence';
import { readRepositoryIdentity } from '../../tools/repo/lib/repository-state';

const sha256 = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');

export const passingCheckEvidenceFixture = (options: {
  root: string;
  plan: CheckPlan;
  programDefinitionHash: string;
  programId?: string;
  lease?: {
    id: string;
    owner: string;
    workItemId: string;
    claimId: string;
  } | null;
}): CheckEvidenceRecord => {
  const identity = readRepositoryIdentity(options.root);
  const timestamp = '2026-09-03T00:00:00.000Z';
  return {
    schemaVersion: 2,
    kind: 'viz-engine-check-run',
    stage: options.plan.stage,
    status: 'passed',
    startedAt: timestamp,
    finishedAt: timestamp,
    durationMs: 0,
    plan: options.plan,
    planHash: sha256(JSON.stringify(options.plan)),
    changedFiles: options.plan.changedFiles.map((path) => {
      const absolute = resolve(options.root, path);
      return {
        path,
        sha256: existsSync(absolute) ? sha256(readFileSync(absolute)) : null,
        baseBlob: null,
      };
    }),
    repository: { starting: identity, final: identity },
    operational: {
      startingLease: options.lease ?? null,
      finalLease: options.lease ?? null,
      leaseStable: true,
    },
    contracts: {
      programId: options.programId ?? 'test-program',
      programDefinitionHash: options.programDefinitionHash,
      sensoryMapHash: '1'.repeat(64),
      certificationMatrixHash: '2'.repeat(64),
      sensoryCriteria: 46,
      documentFilesChecked: 1,
    },
    environment: {
      platform: 'test',
      architecture: 'test',
      node: process.version,
      quiet: {
        CI: '1',
        PLAYWRIGHT_HTML_OPEN: 'never',
        VIZ_AUDIO_MUTED: '1',
      },
    },
    repositoryStable: true,
    results: options.plan.commands.map(({ id }) => ({
      id,
      status: 'passed',
      durationMs: 1,
      exitCode: 0,
    })),
  };
};
