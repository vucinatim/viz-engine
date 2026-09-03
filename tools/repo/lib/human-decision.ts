import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { readJsonFile } from './json-file';
import { resolveOperationalDirectory } from './paths';

export const humanDecisionOutcomes = [
  'approved',
  'rejected',
  'changes_requested',
] as const;
export type HumanDecisionOutcome = (typeof humanDecisionOutcomes)[number];

export interface HumanDecisionRecord {
  schemaVersion: 1;
  programId: string;
  itemId: string;
  outcome: HumanDecisionOutcome;
  decision: string;
  confirmedByHuman: string;
  resolvedAt: string;
}

export const humanDecisionPath = (
  root: string,
  programId: string,
  itemId: string,
) =>
  resolve(
    resolveOperationalDirectory(root),
    'human-decisions',
    programId,
    `${itemId}.json`,
  );

export const validateHumanDecisionRecord = (
  record: HumanDecisionRecord,
  label: string,
  expectedProgramId?: string,
  expectedItemId?: string,
) => {
  if (
    !record ||
    record.schemaVersion !== 1 ||
    typeof record.programId !== 'string' ||
    record.programId.trim().length === 0 ||
    (expectedProgramId !== undefined &&
      record.programId !== expectedProgramId) ||
    typeof record.itemId !== 'string' ||
    record.itemId.trim().length === 0 ||
    (expectedItemId !== undefined && record.itemId !== expectedItemId) ||
    !humanDecisionOutcomes.includes(record.outcome) ||
    typeof record.decision !== 'string' ||
    record.decision.trim().length === 0 ||
    typeof record.confirmedByHuman !== 'string' ||
    record.confirmedByHuman.trim().length === 0 ||
    !Number.isFinite(Date.parse(record.resolvedAt))
  ) {
    throw new Error(`${label} is malformed.`);
  }
  return record;
};

export const readHumanDecision = (
  root: string,
  programId: string,
  itemId: string,
): HumanDecisionRecord | null => {
  const path = humanDecisionPath(root, programId, itemId);
  return existsSync(path)
    ? validateHumanDecisionRecord(
        readJsonFile<HumanDecisionRecord>(path),
        `Human decision ${programId}/${itemId}`,
        programId,
        itemId,
      )
    : null;
};
