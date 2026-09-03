import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import {
  HumanDecisionOutcome,
  HumanDecisionRecord,
  humanDecisionOutcomes,
  humanDecisionPath,
  readHumanDecision,
} from './human-decision';
import {
  readJsonFile,
  writeJsonFileAtomic,
  writeJsonFileExclusive,
} from './json-file';
import { LeaseIdentity, assertActiveLeaseId } from './lease';
import { withOperationalTransaction } from './operational-lock';
import {
  defaultProgramPath,
  repositoryRoot,
  resolveOperationalDirectory,
} from './paths';
import {
  readExecutionProgramDefinition,
  snapshotEvidenceReference,
  validateEvidenceReference,
} from './program';

export interface HumanValidationItem {
  id: string;
  status: 'pending' | 'resolved';
  question: string;
  whyAutomationIsInsufficient: string;
  artifact: string;
  recommendation: string;
  alternatives: string[];
  safeWhileWaiting: string[];
  prohibitedWhileWaiting: string[];
  blockedWorkItemIds: string[];
  safeWorkItemIds: string[];
  createdAt: string;
  resolvedAt?: string;
  decisionOutcome?: HumanDecisionOutcome;
  decision?: string;
  confirmedByHuman?: string;
}
export interface HumanValidationQueue {
  schemaVersion: 2;
  programId: string;
  items: HumanValidationItem[];
}
const queuePath = (root: string, programId: string) =>
  resolve(
    resolveOperationalDirectory(root),
    'human-validation',
    `${programId}.json`,
  );
const decisionDirectory = (root: string, programId: string) =>
  resolve(resolveOperationalDirectory(root), 'human-decisions', programId);
const emptyQueue = (programId: string): HumanValidationQueue => ({
  schemaVersion: 2,
  programId,
  items: [],
});
const defaultProgramScope = () => {
  const definition = readExecutionProgramDefinition(
    defaultProgramPath,
    repositoryRoot,
  );
  return {
    programId: definition.id,
    workItemIds: new Set(definition.workItems.map(({ id }) => id)),
  };
};
const assertStrings = (values: unknown, label: string) => {
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    values.some(
      (value) => typeof value !== 'string' || value.trim().length === 0,
    )
  ) {
    throw new Error(`${label} must contain non-empty strings.`);
  }
};
const validateQueue = (
  queue: HumanValidationQueue,
  root: string,
  validWorkItemIds: Set<string>,
  programId: string,
) => {
  if (queue.schemaVersion !== 2)
    throw new Error('Unsupported human queue schema.');
  if (queue.programId !== programId) {
    throw new Error('Human queue program identity is invalid.');
  }
  if (!Array.isArray(queue.items))
    throw new Error('Human queue items must be an array.');
  const ids = new Set<string>();
  queue.items.forEach((item) => {
    if (ids.has(item.id))
      throw new Error(`Duplicate human-validation id ${item.id}.`);
    ids.add(item.id);
    if (!['pending', 'resolved'].includes(item.status)) {
      throw new Error(`Human-validation ${item.id}.status is invalid.`);
    }
    for (const field of [
      'question',
      'whyAutomationIsInsufficient',
      'artifact',
      'recommendation',
      'createdAt',
    ] as const) {
      if (typeof item[field] !== 'string' || item[field].trim().length === 0) {
        throw new Error(`Human-validation ${item.id}.${field} is required.`);
      }
    }
    assertStrings(item.alternatives, `${item.id}.alternatives`);
    assertStrings(item.safeWhileWaiting, `${item.id}.safeWhileWaiting`);
    assertStrings(
      item.prohibitedWhileWaiting,
      `${item.id}.prohibitedWhileWaiting`,
    );
    if (
      !Array.isArray(item.blockedWorkItemIds) ||
      !Array.isArray(item.safeWorkItemIds)
    ) {
      throw new Error(
        `Human-validation ${item.id} needs explicit work-item scope.`,
      );
    }
    const scopedIds = [...item.blockedWorkItemIds, ...item.safeWorkItemIds];
    if (scopedIds.some((id) => !validWorkItemIds.has(id))) {
      throw new Error(
        `Human-validation ${item.id} references an unknown work item.`,
      );
    }
    if (
      item.safeWorkItemIds.some((id) => item.blockedWorkItemIds.includes(id))
    ) {
      throw new Error(`Human-validation ${item.id} work-item scopes overlap.`);
    }
    const kind = validateEvidenceReference(
      item.artifact,
      `Human-validation ${item.id}.artifact`,
      root,
    );
    if (kind !== 'artifact' && kind !== 'document') {
      throw new Error(
        `Human-validation ${item.id}.artifact must be content-addressed.`,
      );
    }
    if (
      item.status === 'resolved' &&
      (!item.resolvedAt ||
        !Number.isFinite(Date.parse(item.resolvedAt)) ||
        !item.decisionOutcome ||
        !humanDecisionOutcomes.includes(item.decisionOutcome) ||
        !item.decision ||
        !item.confirmedByHuman)
    ) {
      throw new Error(
        `Resolved human-validation ${item.id} needs a decision and human confirmation.`,
      );
    }
    if (
      item.status === 'pending' &&
      (item.resolvedAt ||
        item.decisionOutcome ||
        item.decision ||
        item.confirmedByHuman)
    ) {
      throw new Error(
        `Pending human-validation ${item.id} has resolution data.`,
      );
    }
    if (!Number.isFinite(Date.parse(item.createdAt))) {
      throw new Error(`Human-validation ${item.id}.createdAt is invalid.`);
    }
  });
  return queue;
};
const readDecisions = (root: string, programId: string) =>
  existsSync(decisionDirectory(root, programId))
    ? readdirSync(decisionDirectory(root, programId))
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
          const itemId = basename(file, '.json');
          return readHumanDecision(root, programId, itemId)!;
        })
    : [];

export const readHumanValidationQueue = (
  path?: string,
  root = repositoryRoot,
  validWorkItemIds?: Set<string>,
  programId?: string,
): HumanValidationQueue => {
  const defaults = validWorkItemIds && programId ? null : defaultProgramScope();
  const scopedProgramId = programId ?? defaults!.programId;
  const scopedWorkItemIds = validWorkItemIds ?? defaults!.workItemIds;
  const queue =
    path && existsSync(path)
      ? readJsonFile<HumanValidationQueue>(path)
      : path
        ? emptyQueue(scopedProgramId)
        : existsSync(queuePath(root, scopedProgramId))
          ? readJsonFile<HumanValidationQueue>(queuePath(root, scopedProgramId))
          : emptyQueue(scopedProgramId);
  const decisions = new Map(
    readDecisions(root, scopedProgramId).map((decision) => [
      decision.itemId,
      decision,
    ]),
  );
  return validateQueue(
    {
      ...queue,
      items: queue.items.map((item) => {
        const decision = decisions.get(item.id);
        return decision
          ? {
              ...item,
              status: 'resolved' as const,
              decisionOutcome: decision.outcome,
              decision: decision.decision,
              confirmedByHuman: decision.confirmedByHuman,
              resolvedAt: decision.resolvedAt,
            }
          : item;
      }),
    },
    root,
    scopedWorkItemIds,
    scopedProgramId,
  );
};

const addHumanValidationImpl = (options: {
  lease: LeaseIdentity;
  question: string;
  whyAutomationIsInsufficient: string;
  artifact: string;
  recommendation: string;
  alternatives: string[];
  safeWhileWaiting: string[];
  prohibitedWhileWaiting: string[];
  blockedWorkItemIds: string[];
  safeWorkItemIds: string[];
  path?: string;
  root?: string;
  validWorkItemIds?: Set<string>;
  programId?: string;
}) => {
  const root = options.root ?? repositoryRoot;
  const defaults =
    options.validWorkItemIds && options.programId
      ? null
      : defaultProgramScope();
  const programId = options.programId ?? defaults!.programId;
  const activeLease = assertActiveLeaseId(root, options.lease);
  if (activeLease.programId !== programId) {
    throw new Error(
      'Human-validation program does not match the active lease.',
    );
  }
  const path = options.path ?? queuePath(root, programId);
  const validWorkItemIds = options.validWorkItemIds ?? defaults!.workItemIds;
  const queue = readHumanValidationQueue(
    path,
    root,
    validWorkItemIds,
    programId,
  );
  const item: HumanValidationItem = {
    id: `human-${randomUUID()}`,
    status: 'pending',
    question: options.question,
    whyAutomationIsInsufficient: options.whyAutomationIsInsufficient,
    artifact: snapshotEvidenceReference(options.artifact, root),
    recommendation: options.recommendation,
    alternatives: options.alternatives,
    safeWhileWaiting: options.safeWhileWaiting,
    prohibitedWhileWaiting: options.prohibitedWhileWaiting,
    blockedWorkItemIds: options.blockedWorkItemIds,
    safeWorkItemIds: options.safeWorkItemIds,
    createdAt: new Date().toISOString(),
  };
  const updated = validateQueue(
    { ...queue, items: [...queue.items, item] },
    root,
    validWorkItemIds,
    programId,
  );
  writeJsonFileAtomic(path, updated);
  return item;
};

const resolveHumanValidationImpl = (options: {
  itemId: string;
  outcome: HumanDecisionOutcome;
  decision: string;
  confirmedByHuman: string;
  path?: string;
  root?: string;
  validWorkItemIds?: Set<string>;
  programId?: string;
}) => {
  const root = options.root ?? repositoryRoot;
  const defaults =
    options.validWorkItemIds && options.programId
      ? null
      : defaultProgramScope();
  const programId = options.programId ?? defaults!.programId;
  const path = options.path ?? queuePath(root, programId);
  const queue = readHumanValidationQueue(
    path,
    root,
    options.validWorkItemIds ?? defaults!.workItemIds,
    programId,
  );
  const current = queue.items.find((item) => item.id === options.itemId);
  if (!current)
    throw new Error(`Unknown human-validation item ${options.itemId}.`);
  if (current.status !== 'pending') {
    throw new Error(
      `Human-validation item ${options.itemId} is already resolved.`,
    );
  }
  if (!options.confirmedByHuman.trim()) {
    throw new Error('Human confirmation source is required.');
  }
  if (!options.decision.trim()) {
    throw new Error('Human decision is required.');
  }
  if (!humanDecisionOutcomes.includes(options.outcome)) {
    throw new Error('Human decision outcome is invalid.');
  }
  const resolvedAt = new Date().toISOString();
  writeJsonFileExclusive(humanDecisionPath(root, programId, options.itemId), {
    schemaVersion: 1,
    programId,
    itemId: options.itemId,
    outcome: options.outcome,
    decision: options.decision,
    confirmedByHuman: options.confirmedByHuman,
    resolvedAt,
  } satisfies HumanDecisionRecord);
  return {
    ...current,
    status: 'resolved' as const,
    decisionOutcome: options.outcome,
    decision: options.decision,
    confirmedByHuman: options.confirmedByHuman,
    resolvedAt,
  };
};

export const addHumanValidation = (
  options: Parameters<typeof addHumanValidationImpl>[0],
) =>
  withOperationalTransaction(
    options.root ?? repositoryRoot,
    'add-human-validation',
    () => addHumanValidationImpl(options),
  );

export const resolveHumanValidation = (
  options: Parameters<typeof resolveHumanValidationImpl>[0],
) =>
  withOperationalTransaction(
    options.root ?? repositoryRoot,
    'resolve-human-validation',
    () => resolveHumanValidationImpl(options),
  );
