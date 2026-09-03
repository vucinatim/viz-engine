import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { readHumanValidationQueue } from './human-validation';
import {
  acquireLease,
  assertLeaseForFinalization,
  assertOwnedLease,
  readLease,
  recoverExpiredLease,
  releaseLease,
  resumeBlockedLease,
  rollbackRecoveredLease,
  writeResumeMarker,
} from './lease';
import { withOperationalTransaction } from './operational-lock';
import { defaultProgramPath, repositoryRoot } from './paths';
import {
  EvidenceReference,
  ExecutionProgram,
  ProgramWorkItem,
  getReadyWorkItems,
  readExecutionProgram,
  snapshotEvidenceReference,
  validateEvidenceReference,
  writeExecutionProgram,
} from './program';
import { readRepositoryIdentity } from './repository-state';

const updateItem = (
  program: ExecutionProgram,
  itemId: string,
  updater: (item: ProgramWorkItem) => ProgramWorkItem,
): ExecutionProgram => ({
  ...program,
  updatedAt: new Date().toISOString(),
  workItems: program.workItems.map((item) =>
    item.id === itemId ? updater(item) : item,
  ),
});

const findItem = (program: ExecutionProgram, itemId: string) => {
  const item = program.workItems.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`Unknown work item ${itemId}.`);
  return item;
};

const humanQuestionsForItem = (
  program: ExecutionProgram,
  itemId: string,
  root: string,
) =>
  readHumanValidationQueue(
    undefined,
    root,
    new Set(program.workItems.map(({ id }) => id)),
    program.id,
  ).items.filter((question) => question.blockedWorkItemIds.includes(itemId));

const assertNoPendingHumanBlocker = (
  program: ExecutionProgram,
  itemId: string,
  root: string,
) => {
  const blocker = humanQuestionsForItem(program, itemId, root).find(
    ({ status }) => status === 'pending',
  );
  if (blocker) {
    throw new Error(
      `Work item ${itemId} is blocked by pending human validation ${blocker.id}.`,
    );
  }
};

const claimWorkItemImpl = (options: {
  itemId: string;
  owner: string;
  ttlMinutes?: number;
  humanDecisionId?: string;
  path?: string;
  root?: string;
}) => {
  const path = options.path ?? defaultProgramPath;
  const root = options.root ?? repositoryRoot;
  const program = readExecutionProgram(path, root);
  const item = findItem(program, options.itemId);
  assertNoPendingHumanBlocker(program, item.id, root);
  if (!getReadyWorkItems(program).some((ready) => ready.id === item.id)) {
    throw new Error(`Work item ${item.id} is not dependency-ready.`);
  }
  if (
    item.authority === 'human_checkpoint' &&
    !options.humanDecisionId?.trim()
  ) {
    throw new Error(
      `Work item ${item.id} requires an explicit human confirmation source.`,
    );
  }
  if (item.authority === 'human_checkpoint') {
    const decision = readHumanValidationQueue(
      undefined,
      root,
      new Set(program.workItems.map(({ id }) => id)),
      program.id,
    ).items.find(({ id }) => id === options.humanDecisionId);
    if (
      decision?.status !== 'resolved' ||
      decision.decisionOutcome !== 'approved' ||
      !decision.blockedWorkItemIds.includes(item.id) ||
      !decision.confirmedByHuman
    ) {
      throw new Error(
        `Work item ${item.id} requires an approved human decision scoped to it.`,
      );
    }
  }
  const claimId = randomUUID();
  const lease = acquireLease({
    root,
    owner: options.owner,
    programId: program.id,
    workItemId: item.id,
    claimId,
    ttlMinutes: options.ttlMinutes,
  });
  let claimBase = program;
  let claimStateWritten = false;
  try {
    claimBase = readExecutionProgram(path, root);
    const currentItem = findItem(claimBase, item.id);
    if (
      claimBase.definitionHash !== program.definitionHash ||
      !getReadyWorkItems(claimBase).some(({ id }) => id === item.id) ||
      currentItem.authority !== item.authority
    ) {
      throw new Error('Program state changed before claim acquisition; retry.');
    }
    const updated = updateItem(claimBase, item.id, (current) => ({
      ...current,
      status: 'in_progress',
      owner: {
        id: options.owner,
        claimId,
        leaseId: lease.id,
        claimedAt: lease.acquiredAt,
      },
      blocker: undefined,
      completedAt: undefined,
      note:
        current.authority === 'human_checkpoint'
          ? `Human authority decision: ${options.humanDecisionId}`
          : current.note,
    }));
    writeExecutionProgram(updated, path, root);
    claimStateWritten = true;
    const resume = writeResumeMarker(
      root,
      lease,
      'claimed',
      'Work item claimed.',
    );
    return {
      program: updated,
      item: findItem(updated, item.id),
      lease,
      resume,
    };
  } catch (error) {
    if (claimStateWritten) writeExecutionProgram(claimBase, path, root);
    releaseLease(
      root,
      {
        leaseId: lease.id,
        owner: lease.owner,
        workItemId: lease.workItemId,
        claimId: lease.claimId,
      },
      'claim-rollback',
    );
    throw error;
  }
};

const checkpointWorkItemImpl = (options: {
  itemId: string;
  owner: string;
  claimId: string;
  note: string;
  path?: string;
  root?: string;
}) => {
  const path = options.path ?? defaultProgramPath;
  const root = options.root ?? repositoryRoot;
  const program = readExecutionProgram(path, root);
  const item = findItem(program, options.itemId);
  assertNoPendingHumanBlocker(program, item.id, root);
  if (item.status !== 'in_progress' || !item.owner) {
    throw new Error(`Work item ${item.id} is not in progress.`);
  }
  if (
    item.owner.id !== options.owner ||
    item.owner.claimId !== options.claimId
  ) {
    throw new Error(`Work item ${item.id} claim ownership does not match.`);
  }
  const lease = assertOwnedLease(root, {
    leaseId: item.owner.leaseId,
    owner: options.owner,
    workItemId: item.id,
    claimId: options.claimId,
  });
  const updated = updateItem(program, item.id, (current) => ({
    ...current,
    note: options.note,
  }));
  writeExecutionProgram(updated, path, root);
  const resume = writeResumeMarker(root, lease, 'checkpointed', options.note);
  return { program: updated, item: findItem(updated, item.id), lease, resume };
};

const recoverWorkItemImpl = (options: {
  itemId: string;
  owner: string;
  claimId: string;
  expectedLeaseId: string;
  ttlMinutes?: number;
  checkEvidence?: string;
  path?: string;
  root?: string;
}) => {
  const path = options.path ?? defaultProgramPath;
  const root = options.root ?? repositoryRoot;
  const program = readExecutionProgram(path, root);
  const item = findItem(program, options.itemId);
  if (item.status !== 'in_progress' || !item.owner) {
    throw new Error(`Work item ${item.id} is not recoverable.`);
  }
  if (
    item.owner.id !== options.owner ||
    item.owner.claimId !== options.claimId ||
    item.owner.leaseId !== options.expectedLeaseId
  ) {
    throw new Error(`Work item ${item.id} recovery identity does not match.`);
  }
  const existingLease = readLease(root);
  if (options.checkEvidence) {
    if (!existingLease) {
      throw new Error(
        'Committed-checkpoint recovery requires an expired lease.',
      );
    }
    const kind = validateEvidenceReference(
      options.checkEvidence,
      `work item ${item.id}.recoveryCheckEvidence`,
      root,
      {
        checkStage: 'checkpoint',
        programId: program.id,
        programDefinitionHash: program.definitionHash,
        claimId: options.claimId,
        leaseId: options.expectedLeaseId,
        startingHead: existingLease.startingHead,
        terminalHead: readRepositoryIdentity(root).head,
        enforceCanonicalPlan: true,
      },
    );
    if (kind !== 'command') {
      throw new Error(
        'Committed-checkpoint recovery requires command evidence.',
      );
    }
  }
  const recovery = recoverExpiredLease({
    root,
    expectedLeaseId: options.expectedLeaseId,
    owner: options.owner,
    programId: program.id,
    workItemId: item.id,
    claimId: options.claimId,
    ttlMinutes: options.ttlMinutes,
    allowCommittedCheckpointRecovery: Boolean(options.checkEvidence),
  });
  const { lease } = recovery;
  let recoveryStateWritten = false;
  try {
    const updated = updateItem(program, item.id, (current) => ({
      ...current,
      owner: { ...current.owner!, leaseId: lease.id },
      note: `Recovered expired lease ${options.expectedLeaseId}.`,
    }));
    writeExecutionProgram(updated, path, root);
    recoveryStateWritten = true;
    const resume = writeResumeMarker(
      root,
      lease,
      'recovered',
      `Recovered expired lease ${options.expectedLeaseId}.`,
    );
    return {
      program: updated,
      item: findItem(updated, item.id),
      lease,
      resume,
    };
  } catch (error) {
    if (recoveryStateWritten) writeExecutionProgram(program, path, root);
    rollbackRecoveredLease(
      root,
      {
        leaseId: lease.id,
        owner: lease.owner,
        workItemId: lease.workItemId,
        claimId: lease.claimId,
      },
      recovery.archivedPath,
    );
    throw error;
  }
};

const assertCompletionEvidence = (
  item: ProgramWorkItem,
  evidence: EvidenceReference[],
) => {
  const byRequirement = new Map<string, EvidenceReference>();
  evidence.forEach((reference) => {
    const existing = byRequirement.get(reference.requirementId);
    if (existing && existing.reference !== reference.reference) {
      throw new Error(
        `Work item ${item.id} has conflicting evidence for ${reference.requirementId}.`,
      );
    }
    byRequirement.set(reference.requirementId, reference);
  });
  const missing = item.evidenceRequirements.filter(
    ({ id }) => !byRequirement.has(id),
  );
  if (missing.length > 0) {
    throw new Error(
      `Work item ${item.id} is missing evidence for ${missing.map(({ id }) => id).join(', ')}.`,
    );
  }
  return [...byRequirement.values()];
};

const completeWorkItemImpl = (options: {
  itemId: string;
  owner: string;
  claimId: string;
  evidence: EvidenceReference[];
  note: string;
  path?: string;
  root?: string;
}) => {
  const path = options.path ?? defaultProgramPath;
  const root = options.root ?? repositoryRoot;
  const program = readExecutionProgram(path, root);
  const item = findItem(program, options.itemId);
  assertNoPendingHumanBlocker(program, item.id, root);
  if (item.status !== 'in_progress' || !item.owner) {
    throw new Error(`Work item ${item.id} is not in progress.`);
  }
  if (
    item.owner.id !== options.owner ||
    item.owner.claimId !== options.claimId
  ) {
    throw new Error(`Work item ${item.id} claim ownership does not match.`);
  }
  const lease = assertOwnedLease(root, {
    leaseId: item.owner.leaseId,
    owner: options.owner,
    workItemId: item.id,
    claimId: options.claimId,
  });
  const suppliedEvidence = assertCompletionEvidence(item, [
    ...item.evidence,
    ...options.evidence,
  ]);
  const repository = readRepositoryIdentity(root);
  if (!repository.clean) {
    throw new Error('Completion requires a clean committed worktree.');
  }
  if (repository.head === lease.startingHead) {
    throw new Error('Completion requires a new coherent checkpoint commit.');
  }
  const parentHead = execFileSync('git', ['rev-parse', 'HEAD^'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  if (parentHead !== lease.startingHead) {
    throw new Error(
      'Completion requires exactly one checkpoint commit per claim.',
    );
  }
  suppliedEvidence.forEach((entry, index) => {
    const requirement = item.evidenceRequirements.find(
      ({ id }) => id === entry.requirementId,
    )!;
    const kind = validateEvidenceReference(
      entry.reference,
      `work item ${item.id}.completionEvidence[${index}]`,
      root,
      {
        checkStage: requirement.checkStage,
        programId: program.id,
        programDefinitionHash: program.definitionHash,
        claimId: options.claimId,
        leaseId: lease.id,
        startingHead: lease.startingHead,
        terminalHead: repository.head,
        enforceCanonicalPlan: requirement.kind === 'command',
      },
    );
    if (kind !== requirement.kind) {
      throw new Error(
        `Work item ${item.id} evidence ${entry.requirementId} must use ${requirement.kind}:.`,
      );
    }
  });
  const evidence = suppliedEvidence.map((entry) => ({
    ...entry,
    reference: snapshotEvidenceReference(entry.reference, root),
  }));
  const completedAt = new Date().toISOString();
  const updated = updateItem(program, item.id, (current) => ({
    ...current,
    status: 'complete',
    owner: undefined,
    blocker: undefined,
    completedAt,
    evidence,
    note: options.note,
    terminalIdentity: {
      head: repository.head,
      statusHash: repository.statusHash,
      claimId: options.claimId,
      leaseId: lease.id,
      startingHead: lease.startingHead,
    },
  }));
  writeExecutionProgram(updated, path, root);
  const resume = writeResumeMarker(root, lease, 'completed', options.note);
  releaseLease(
    root,
    {
      leaseId: lease.id,
      owner: lease.owner,
      workItemId: lease.workItemId,
      claimId: lease.claimId,
    },
    'completed',
  );
  return { program: updated, item: findItem(updated, item.id), resume };
};

const finalizeTerminalWorkItemImpl = (options: {
  itemId: string;
  owner: string;
  claimId: string;
  leaseId: string;
  path?: string;
  root?: string;
}) => {
  const path = options.path ?? defaultProgramPath;
  const root = options.root ?? repositoryRoot;
  const program = readExecutionProgram(path, root);
  const item = findItem(program, options.itemId);
  if (item.status !== 'complete' && item.status !== 'blocked') {
    throw new Error(
      `Work item ${item.id} is not awaiting terminal finalization.`,
    );
  }
  const lease = assertLeaseForFinalization(root, {
    leaseId: options.leaseId,
    owner: options.owner,
    workItemId: item.id,
    claimId: options.claimId,
  });
  const repository = readRepositoryIdentity(root);
  if (
    item.terminalIdentity?.head !== repository.head ||
    item.terminalIdentity.statusHash !== repository.statusHash
  ) {
    throw new Error('Terminal item and current Git identity disagree.');
  }
  const lastAction = item.status === 'complete' ? 'completed' : 'blocked';
  const resume = writeResumeMarker(
    root,
    lease,
    lastAction,
    item.note ?? `Finalized ${item.status} work item ${item.id}.`,
  );
  const released = releaseLease(
    root,
    {
      leaseId: lease.id,
      owner: lease.owner,
      workItemId: lease.workItemId,
      claimId: lease.claimId,
    },
    lastAction,
  );
  return { program, item, resume, released };
};

const blockWorkItemImpl = (options: {
  itemId: string;
  owner: string;
  claimId: string;
  type: 'technical' | 'human' | 'external' | 'unsafe_state';
  reason: string;
  recovery: string;
  note?: string;
  path?: string;
  root?: string;
}) => {
  const path = options.path ?? defaultProgramPath;
  const root = options.root ?? repositoryRoot;
  const program = readExecutionProgram(path, root);
  const item = findItem(program, options.itemId);
  if (!options.reason.trim() || !options.recovery.trim()) {
    throw new Error(
      'Blocking requires a non-empty reason and recovery condition.',
    );
  }
  if (item.status !== 'in_progress' || !item.owner) {
    throw new Error(`Work item ${item.id} is not in progress.`);
  }
  if (
    item.owner.id !== options.owner ||
    item.owner.claimId !== options.claimId
  ) {
    throw new Error(`Work item ${item.id} claim ownership does not match.`);
  }
  const lease = assertOwnedLease(root, {
    leaseId: item.owner.leaseId,
    owner: options.owner,
    workItemId: item.id,
    claimId: options.claimId,
  });
  const note = options.note ?? options.reason;
  if (!note.trim()) throw new Error('Blocking requires a non-empty note.');
  const humanValidationIds = humanQuestionsForItem(program, item.id, root)
    .filter(({ status }) => status === 'pending')
    .map(({ id }) => id);
  if (options.type === 'human' && humanValidationIds.length === 0) {
    throw new Error(
      'A human block requires a pending human-validation item scoped to the work item.',
    );
  }
  const repository = readRepositoryIdentity(root);
  const updated = updateItem(program, item.id, (current) => ({
    ...current,
    status: 'blocked',
    owner: undefined,
    blocker: {
      type: options.type,
      reason: options.reason,
      recovery: options.recovery,
      recordedAt: new Date().toISOString(),
      previousClaimId: options.claimId,
      previousLeaseId: lease.id,
      humanValidationIds,
    },
    note,
    terminalIdentity: {
      head: repository.head,
      statusHash: repository.statusHash,
      claimId: options.claimId,
      leaseId: lease.id,
      startingHead: lease.startingHead,
    },
  }));
  writeExecutionProgram(updated, path, root);
  const resume = writeResumeMarker(root, lease, 'blocked', note);
  releaseLease(
    root,
    {
      leaseId: lease.id,
      owner: lease.owner,
      workItemId: lease.workItemId,
      claimId: lease.claimId,
    },
    'blocked',
  );
  return { program: updated, item: findItem(updated, item.id), resume };
};

const unblockWorkItemImpl = (options: {
  itemId: string;
  owner: string;
  recoveryEvidence: string[];
  note: string;
  ttlMinutes?: number;
  path?: string;
  root?: string;
}) => {
  const path = options.path ?? defaultProgramPath;
  const root = options.root ?? repositoryRoot;
  const program = readExecutionProgram(path, root);
  const item = findItem(program, options.itemId);
  if (item.status !== 'blocked' || !item.blocker) {
    throw new Error(`Work item ${item.id} is not blocked.`);
  }
  assertNoPendingHumanBlocker(program, item.id, root);
  if (options.recoveryEvidence.length === 0) {
    throw new Error('Unblocking requires typed recovery evidence.');
  }
  if (!options.note.trim()) {
    throw new Error('Unblocking requires a non-empty note.');
  }
  const humanQuestions = new Map(
    humanQuestionsForItem(program, item.id, root).map((question) => [
      question.id,
      question,
    ]),
  );
  for (const validationId of item.blocker.humanValidationIds) {
    const decision = humanQuestions.get(validationId);
    if (
      decision?.status !== 'resolved' ||
      decision.decisionOutcome !== 'approved'
    ) {
      throw new Error(
        `Work item ${item.id} requires approved human validation ${validationId}.`,
      );
    }
    const requiredReference = `decision:${program.id}/${validationId}`;
    if (!options.recoveryEvidence.includes(requiredReference)) {
      throw new Error(
        `Unblocking ${item.id} requires recovery evidence ${requiredReference}.`,
      );
    }
  }
  const recoveryEvidence = options.recoveryEvidence.map((reference) =>
    snapshotEvidenceReference(reference, root),
  );
  const claimId = randomUUID();
  const lease = resumeBlockedLease({
    root,
    owner: options.owner,
    programId: program.id,
    workItemId: item.id,
    claimId,
    previousClaimId: item.blocker.previousClaimId,
    ttlMinutes: options.ttlMinutes,
  });
  let unblockBase = program;
  let unblockStateWritten = false;
  try {
    unblockBase = readExecutionProgram(path, root);
    const currentItem = findItem(unblockBase, item.id);
    if (
      unblockBase.definitionHash !== program.definitionHash ||
      currentItem.status !== 'blocked' ||
      currentItem.blocker?.previousClaimId !== item.blocker.previousClaimId
    ) {
      throw new Error(
        'Program state changed before unblock acquisition; retry.',
      );
    }
    const updated = updateItem(unblockBase, item.id, (current) => ({
      ...current,
      status: 'in_progress',
      blocker: undefined,
      terminalIdentity: undefined,
      owner: {
        id: options.owner,
        claimId,
        leaseId: lease.id,
        claimedAt: lease.acquiredAt,
      },
      recoveryEvidence: [
        ...new Set([...(current.recoveryEvidence ?? []), ...recoveryEvidence]),
      ],
      note: options.note,
    }));
    writeExecutionProgram(updated, path, root);
    unblockStateWritten = true;
    const resume = writeResumeMarker(root, lease, 'checkpointed', options.note);
    return {
      program: updated,
      item: findItem(updated, item.id),
      lease,
      resume,
    };
  } catch (error) {
    if (unblockStateWritten) writeExecutionProgram(unblockBase, path, root);
    releaseLease(
      root,
      {
        leaseId: lease.id,
        owner: lease.owner,
        workItemId: lease.workItemId,
        claimId: lease.claimId,
      },
      'unblock-rollback',
    );
    throw error;
  }
};

const withTransitionLock =
  <Options extends { root?: string }, Result>(
    operation: (options: Options) => Result,
  ) =>
  (options: Options): Result =>
    withOperationalTransaction(
      options.root ?? repositoryRoot,
      operation.name,
      () => operation(options),
    );

export const claimWorkItem = withTransitionLock(claimWorkItemImpl);
export const checkpointWorkItem = withTransitionLock(checkpointWorkItemImpl);
export const recoverWorkItem = withTransitionLock(recoverWorkItemImpl);
export const completeWorkItem = withTransitionLock(completeWorkItemImpl);
export const finalizeTerminalWorkItem = withTransitionLock(
  finalizeTerminalWorkItemImpl,
);
export const blockWorkItem = withTransitionLock(blockWorkItemImpl);
export const unblockWorkItem = withTransitionLock(unblockWorkItemImpl);
