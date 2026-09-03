import { cpus, hostname, loadavg } from 'node:os';

import { readHumanValidationQueue } from './human-validation';
import {
  LeaseIdentity,
  leaseIsExpired,
  readLease,
  readResumeMarker,
} from './lease';
import {
  OperationalLockOwner,
  readOperationalLock,
  readOperationalTransaction,
  withOperationalLock,
} from './operational-lock';
import { defaultProgramPath, repositoryRoot } from './paths';
import { getReadyWorkItems, readExecutionProgram } from './program';
import { processIsAlive, readRepositoryIdentity } from './repository-state';

type RequiredAction =
  | 'claim'
  | 'continue'
  | 'recover-expired'
  | 'finalize-terminal'
  | 'resume-blocked'
  | 'human-checkpoint'
  | 'wait-writer-lease'
  | 'wait-operational-lock'
  | 'recover-operational-lock'
  | 'recover-transition'
  | 'stop';

export interface HostLoadInput {
  oneMinute: number;
  cpuCount: number;
}

const hostLoad = (input?: HostLoadInput) => {
  const oneMinute = input?.oneMinute ?? loadavg()[0];
  const cpuCount = input?.cpuCount ?? cpus().length;
  return {
    oneMinute,
    cpuCount,
    oneMinutePerCpu: oneMinute / Math.max(cpuCount, 1),
    heavyValidationAllowed: oneMinute / Math.max(cpuCount, 1) <= 0.9,
  };
};

const quietEnvironment = {
  CI: '1',
  FORCE_COLOR: '0',
  PLAYWRIGHT_HTML_OPEN: 'never',
  VIZ_AUDIO_MUTED: '1',
  visibleBrowserAllowed: false,
  audibleMediaAllowed: false,
  externalMutationAllowed: false,
};

const assertClaimCandidate = (
  readiness: {
    mutationAllowed: boolean;
    requiredAction: RequiredAction;
    reasons: string[];
    candidates: Array<{ id: string; claimable: boolean }>;
  },
  itemId: string,
) => {
  const candidate = readiness.candidates.find(({ id }) => id === itemId);
  if (
    readiness.requiredAction !== 'claim' ||
    !readiness.mutationAllowed ||
    !candidate?.claimable
  ) {
    const reason = readiness.reasons.join(' ') || 'Item is not claimable.';
    throw new Error(`Autonomous claim refused by preflight: ${reason}`);
  }
};

const lockedResult = (
  root: string,
  owner: OperationalLockOwner,
  loadInput?: HostLoadInput,
) => {
  const repository = readRepositoryIdentity(root);
  const load = hostLoad(loadInput);
  const local = owner.host === hostname();
  const alive = local && processIsAlive(owner.pid);
  const requiredAction: RequiredAction = alive
    ? 'wait-operational-lock'
    : local
      ? 'recover-operational-lock'
      : 'stop';
  return {
    schemaVersion: 1,
    programId: null,
    mutationAllowed: requiredAction === 'recover-operational-lock',
    requiredAction,
    reasons: [
      alive
        ? `Operational state is actively owned by live process ${owner.pid}; this wake must exit without mutation.`
        : local
          ? `Operational state mutex owner ${owner.pid} is proven dead and requires exact recovery.`
          : 'Operational state has a remote or unprovable owner; this wake must exit without mutation.',
    ],
    repository: {
      root: repository.root,
      branch: repository.branch,
      head: repository.head,
      clean: repository.clean,
      statusHash: repository.statusHash,
    },
    load,
    quietEnvironment,
    candidates: [],
    readyItems: [],
    lease: null,
    operationalLock: owner,
    interruptedTransition: null,
    resume: null,
    blockedResume: null,
    pendingHumanQuestions: [],
  };
};

const invalidProgramResult = (
  root: string,
  error: unknown,
  loadInput?: HostLoadInput,
) => {
  const repository = readRepositoryIdentity(root);
  return {
    schemaVersion: 1,
    programId: null,
    mutationAllowed: false,
    requiredAction: 'stop' as RequiredAction,
    reasons: [
      `Program preflight failed closed: ${error instanceof Error ? error.message : String(error)}`,
    ],
    repository: {
      root: repository.root,
      branch: repository.branch,
      head: repository.head,
      clean: repository.clean,
      statusHash: repository.statusHash,
    },
    load: hostLoad(loadInput),
    quietEnvironment,
    candidates: [],
    readyItems: [],
    lease: null,
    operationalLock: null,
    interruptedTransition: null,
    resume: null,
    blockedResume: null,
    pendingHumanQuestions: [],
  };
};

const assessLockedSnapshot = (
  root: string,
  path: string,
  continuation?: LeaseIdentity,
  loadInput?: HostLoadInput,
  ignoreActiveTransition = false,
) => {
  const repository = readRepositoryIdentity(root);
  const load = hostLoad(loadInput);
  const interruptedTransition = ignoreActiveTransition
    ? null
    : readOperationalTransaction(root);
  if (interruptedTransition) {
    return {
      schemaVersion: 1,
      programId: null,
      mutationAllowed: true,
      requiredAction: 'recover-transition' as RequiredAction,
      reasons: [
        `Interrupted transition ${interruptedTransition.id} requires explicit rollback before operational state may be read.`,
      ],
      repository: {
        root: repository.root,
        branch: repository.branch,
        head: repository.head,
        clean: repository.clean,
        statusHash: repository.statusHash,
      },
      load,
      quietEnvironment,
      candidates: [],
      readyItems: [],
      lease: null,
      operationalLock: null,
      interruptedTransition,
      resume: null,
      blockedResume: null,
      pendingHumanQuestions: [],
    };
  }

  const program = readExecutionProgram(path, root);
  const lease = readLease(root);
  const resume = readResumeMarker(root);
  const human = readHumanValidationQueue(
    undefined,
    root,
    new Set(program.workItems.map(({ id }) => id)),
    program.id,
  );
  const pendingHuman = human.items.filter((item) => item.status === 'pending');
  const structuralReady = getReadyWorkItems(program);
  const reasons: string[] = [];
  let requiredAction: RequiredAction = 'claim';
  let blockedResume: ReturnType<typeof readResumeMarker> = null;

  if (program.status !== 'active') {
    reasons.push('Program is complete.');
    requiredAction = 'stop';
  }
  if (!repository.branch) {
    reasons.push('A named branch is required.');
    requiredAction = 'stop';
  }
  if (load.oneMinutePerCpu > 1.5) {
    reasons.push('Host load is too high for another autonomous checkpoint.');
    requiredAction = 'stop';
  }

  if (lease) {
    const item = program.workItems.find(({ id }) => id === lease.workItemId);
    if (
      lease.worktreeRoot !== repository.root ||
      lease.branch !== repository.branch
    ) {
      reasons.push('Active lease belongs to another branch or worktree.');
      requiredAction = 'stop';
    } else if (!item) {
      reasons.push('Active lease references an unknown program item.');
      requiredAction = 'stop';
    } else if (item.status === 'complete' || item.status === 'blocked') {
      reasons.push(`Terminal item ${item.id} still owns the writer lease.`);
      requiredAction = 'finalize-terminal';
    } else if (
      item.status !== 'in_progress' ||
      item.owner?.leaseId !== lease.id
    ) {
      reasons.push('Lease and operational program state disagree.');
      requiredAction = 'stop';
    } else if (leaseIsExpired(lease)) {
      reasons.push(`Lease ${lease.id} expired and requires exact recovery.`);
      requiredAction = 'recover-expired';
    } else if (
      pendingHuman.some((question) =>
        question.blockedWorkItemIds.includes(item.id),
      )
    ) {
      reasons.push(`Work item ${item.id} awaits pending human validation.`);
      requiredAction = 'human-checkpoint';
    } else {
      const exactContinuation =
        continuation?.leaseId === lease.id &&
        continuation.owner === lease.owner &&
        continuation.workItemId === lease.workItemId &&
        continuation.claimId === lease.claimId;
      if (exactContinuation) {
        reasons.push(
          `Exact continuation identity accepted for work item ${item.id}.`,
        );
        requiredAction = 'continue';
      } else {
        reasons.push(
          `Work item ${item.id} has an active writer; a fresh wake must exit without mutation.`,
        );
        requiredAction = 'wait-writer-lease';
      }
    }
  } else {
    const inProgress = program.workItems.filter(
      (item) => item.status === 'in_progress',
    );
    if (inProgress.length > 0) {
      reasons.push('Operational state has in-progress work without a lease.');
      requiredAction = 'stop';
    } else {
      const blockedCandidate = program.workItems
        .map((item) => {
          const marker = item.blocker?.previousClaimId
            ? readResumeMarker(root, item.blocker.previousClaimId)
            : null;
          return { item, marker };
        })
        .find(({ item, marker }) => {
          return (
            item.status === 'blocked' &&
            marker?.lastAction === 'blocked' &&
            marker.workItemId === item.id &&
            marker.branch === repository.branch &&
            marker.worktreeRoot === repository.root &&
            marker.currentHead === repository.head &&
            marker.statusHash === repository.statusHash
          );
        });
      const blocked = blockedCandidate?.item;
      if (blockedCandidate) blockedResume = blockedCandidate.marker;
      if (
        requiredAction !== 'stop' &&
        blocked &&
        (!repository.clean || structuralReady.length === 0)
      ) {
        const scopedQuestions = human.items.filter((question) =>
          question.blockedWorkItemIds.includes(blocked.id),
        );
        const pendingBlocker = scopedQuestions.find(
          ({ status }) => status === 'pending',
        );
        const nonApproved = blocked.blocker?.humanValidationIds
          .map((id) => scopedQuestions.find((question) => question.id === id))
          .find(
            (question) =>
              question?.status !== 'resolved' ||
              question.decisionOutcome !== 'approved',
          );
        if (pendingBlocker) {
          reasons.push(
            `Blocked item ${blocked.id} awaits human validation ${pendingBlocker.id}.`,
          );
          requiredAction = 'human-checkpoint';
        } else if (nonApproved) {
          reasons.push(
            `Blocked item ${blocked.id} lacks an approved human recovery decision.`,
          );
          requiredAction = 'stop';
        } else {
          reasons.push(
            `${repository.clean ? 'Clean' : 'Dirty'} state exactly matches blocked item ${blocked.id}.`,
          );
          requiredAction = 'resume-blocked';
        }
      } else if (requiredAction !== 'stop' && !repository.clean) {
        reasons.push(
          'Dirty worktree is not owned by an exact blocked resume marker.',
        );
        requiredAction = 'stop';
      }
    }
  }

  const candidates = structuralReady.map((item) => {
    const blockingQuestions = pendingHuman.filter((question) =>
      question.blockedWorkItemIds.includes(item.id),
    );
    const explicitlySafe = pendingHuman.every(
      (question) =>
        !question.blockedWorkItemIds.includes(item.id) ||
        question.safeWorkItemIds.includes(item.id),
    );
    return {
      id: item.id,
      authority: item.authority,
      blockingHumanQuestions: blockingQuestions.map(({ id }) => id),
      claimable:
        requiredAction === 'claim' &&
        item.authority === 'autonomous' &&
        blockingQuestions.length === 0 &&
        explicitlySafe,
    };
  });
  if (
    requiredAction === 'claim' &&
    candidates.length > 0 &&
    candidates.every(({ authority }) => authority === 'human_checkpoint')
  ) {
    reasons.push(
      'The next dependency-ready item requires explicit human authority.',
    );
    requiredAction = 'human-checkpoint';
  }
  if (
    requiredAction === 'claim' &&
    candidates.length > 0 &&
    !candidates.some(({ claimable }) => claimable)
  ) {
    reasons.push(
      'Every ready autonomous item is blocked by a pending human decision.',
    );
    requiredAction = 'stop';
  }
  if (requiredAction === 'claim' && candidates.length === 0) {
    reasons.push('No dependency-ready work exists.');
    requiredAction = 'stop';
  }

  return {
    schemaVersion: 1,
    programId: program.id,
    mutationAllowed:
      candidates.some(({ claimable }) => claimable) ||
      [
        'continue',
        'recover-expired',
        'finalize-terminal',
        'resume-blocked',
      ].includes(requiredAction),
    requiredAction,
    reasons,
    repository: {
      root: repository.root,
      branch: repository.branch,
      head: repository.head,
      clean: repository.clean,
      statusHash: repository.statusHash,
    },
    load,
    quietEnvironment,
    candidates,
    readyItems: structuralReady,
    lease,
    operationalLock: null,
    interruptedTransition: null,
    resume,
    blockedResume,
    pendingHumanQuestions: pendingHuman.map(({ id }) => id),
  };
};

export const assertAutonomousWorkAdmission = (options: {
  action: 'claim' | 'resume-blocked';
  itemId: string;
  root: string;
  path: string;
  load?: HostLoadInput;
}) => {
  const readiness = assessLockedSnapshot(
    options.root,
    options.path,
    undefined,
    options.load,
    true,
  );
  if (options.action === 'claim') {
    assertClaimCandidate(readiness, options.itemId);
    return;
  }
  if (
    readiness.requiredAction !== 'resume-blocked' ||
    !readiness.mutationAllowed ||
    readiness.blockedResume?.workItemId !== options.itemId ||
    readiness.blockedResume.lastAction !== 'blocked'
  ) {
    const reason = readiness.reasons.join(' ') || 'Item is not resumable.';
    throw new Error(`Autonomous resume refused by preflight: ${reason}`);
  }
};

export const assessAutonomousReadiness = (options?: {
  root?: string;
  path?: string;
  continuation?: LeaseIdentity;
  load?: HostLoadInput;
}) => {
  const root = options?.root ?? repositoryRoot;
  const path = options?.path ?? defaultProgramPath;
  const existingOwner = readOperationalLock(root);
  if (existingOwner) return lockedResult(root, existingOwner, options?.load);
  try {
    return withOperationalLock(root, () =>
      assessLockedSnapshot(root, path, options?.continuation, options?.load),
    );
  } catch (error) {
    const racedOwner = readOperationalLock(root);
    if (racedOwner) return lockedResult(root, racedOwner, options?.load);
    return invalidProgramResult(root, error, options?.load);
  }
};
