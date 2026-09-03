#!/usr/bin/env node

import { resolve } from 'node:path';

import {
  canonicalizeChangedFiles,
  checkStages,
  getChangedFiles,
  planChecks,
  runChecks,
} from './lib/checks';
import {
  addHumanValidation,
  readHumanValidationQueue,
  resolveHumanValidation,
} from './lib/human-validation';
import {
  heartbeatLease,
  leaseIsExpired,
  readLease,
  readResumeMarker,
} from './lib/lease';
import {
  readOperationalLock,
  readOperationalTransaction,
  recoverOperationalLock,
  recoverOperationalTransaction,
  withOperationalSnapshot,
} from './lib/operational-lock';
import { defaultProgramPath, repositoryRoot } from './lib/paths';
import { assessAutonomousReadiness } from './lib/preflight';
import { readExecutionProgram, summarizeExecutionProgram } from './lib/program';
import {
  blockWorkItem,
  checkpointWorkItem,
  claimWorkItem,
  completeWorkItem,
  finalizeTerminalWorkItem,
  recoverWorkItem,
  unblockWorkItem,
} from './lib/program-transitions';
import { createReviewPacket } from './lib/review-packet';
import { readAndValidateSensoryMap } from './lib/sensory-map';

const help = `VizEngine repository maintainer CLI

Usage:
  pnpm run repo -- <command> [options]

Commands:
  program status|next|inspect|validate
  program claim|checkpoint|recover|complete|finalize|block|unblock
  lease status|heartbeat
  checks plan|run <fast|focused|checkpoint|integration|certification>
  canonicalize check|apply
  senses status|validate
  human list|add|resolve
  review create
  run preflight
  state status|recover-mutex|recover-transition

Use "pnpm run repo -- <command> --help" for command contracts. Read operations
support --json. Mutating program operations require exact ownership identities.
Program-aware commands accept --program <repository-relative-path>; otherwise
they use tools/repo/programs/active-program.json.
`;

const arguments_ = process.argv
  .slice(2)
  .filter((argument) => argument !== '--');
const [command, subcommand, ...rest] = arguments_;

const hasFlag = (name: string) => rest.includes(name);
const option = (name: string, required = false) => {
  const index = rest.indexOf(name);
  const value = index >= 0 ? rest[index + 1] : undefined;
  if (required && (!value || value.startsWith('--'))) {
    throw new Error(`${name} is required.`);
  }
  return value;
};
const repeatedOption = (name: string) =>
  rest.flatMap((value, index) =>
    value === name && rest[index + 1] && !rest[index + 1].startsWith('--')
      ? [rest[index + 1]]
      : [],
  );
const parseEvidence = () =>
  repeatedOption('--evidence').map((value) => {
    const separator = value.indexOf('=');
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error(
        '--evidence must use <requirement-id>=<typed-reference>.',
      );
    }
    return {
      requirementId: value.slice(0, separator),
      reference: value.slice(separator + 1),
    };
  });
const positiveNumberOption = (name: string, fallback?: number) => {
  const value = option(name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return parsed;
};
const programPath = () => {
  const value = option('--program');
  if (!value) return defaultProgramPath;
  const path = resolve(repositoryRoot, value);
  if (!path.startsWith(`${repositoryRoot}/`)) {
    throw new Error('--program must remain inside the repository.');
  }
  return path;
};
const print = (value: unknown, json = hasFlag('--json')) => {
  if (json || typeof value !== 'string') {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  } else {
    process.stdout.write(`${value}\n`);
  }
};

const programHelp = `Program commands:
  All commands accept [--program <repository-relative-path>].
  program status [--json]
  program next [--authority autonomous|human_checkpoint|all] [--json]
  program inspect <id> [--json]
  program validate [--json]
  program claim <id> --owner <owner> [--ttl-minutes <minutes>]
    [--human-decision-id <resolved-id>] [--json]
  program checkpoint <id> --owner <owner> --claim-id <id> --note <text>
  program recover <id> --owner <owner> --claim-id <id> --lease-id <id>
    [--check-evidence <content-addressed-check-record>]
  program complete <id> --owner <owner> --claim-id <id> --note <text>
    --evidence <requirement-id=typed-reference>...
  program finalize <id> --owner <owner> --claim-id <id> --lease-id <id>
  program block <id> --owner <owner> --claim-id <id> --type <type>
    --reason <reason> --recovery <condition>
  program unblock <id> --owner <owner> --evidence <ref> --note <text>
`;
const leaseHelp = `Lease commands:
  lease status [--json]
  lease heartbeat --lease-id <id> --owner <owner> --work-item-id <id>
    --claim-id <id> [--ttl-minutes <minutes>] [--json]
`;
const humanHelp = `Human-validation commands:
  human list [--program <path>] [--json]
  human add --lease-id <id> --owner <owner> --work-item-id <id>
    --claim-id <id> --question <text> --why-human <text>
    --artifact <content-addressed-ref> --recommendation <text>
    --alternative <text>... --safe-work <text>... --prohibited-work <text>...
    [--blocked-item <id>...] [--safe-item <id>...] [--json]
  human resolve --human-id <id> --outcome approved|rejected|changes_requested
    --decision <text>
    --confirmed-by-human <source> [--json]
`;
const stateHelp = `Operational-state commands:
  state status [--json]
  state recover-mutex --expected-host <host> --expected-pid <pid> [--json]
  state recover-transition --transition-id <id> [--json]
`;
const runHelp = `Run commands:
  run preflight [--lease-id <id> --owner <owner> --work-item-id <id>
    --claim-id <id>] [--program <path>] [--json]
`;

const readProgramSnapshot = (path: string) =>
  withOperationalSnapshot(repositoryRoot, () => readExecutionProgram(path));

const runProgramCommand = () => {
  if (!subcommand || subcommand === '--help') return print(programHelp, false);
  if (rest.includes('--help')) return print(programHelp, false);
  const path = programPath();
  if (subcommand === 'validate') {
    const program = readProgramSnapshot(path);
    return print({ ok: true, ...summarizeExecutionProgram(program) });
  }
  if (subcommand === 'status') {
    return print(summarizeExecutionProgram(readProgramSnapshot(path)));
  }
  if (subcommand === 'next') {
    const authority = option('--authority') ?? 'autonomous';
    if (!['autonomous', 'human_checkpoint', 'all'].includes(authority)) {
      throw new Error(
        '--authority must be autonomous, human_checkpoint, or all.',
      );
    }
    const readiness = assessAutonomousReadiness({ path });
    const items = readiness.readyItems.filter(
      (item) => authority === 'all' || item.authority === authority,
    );
    return print({
      programId: readiness.programId,
      requiredAction: readiness.requiredAction,
      mutationAllowed: readiness.mutationAllowed,
      items: items.map((item) => ({
        ...item,
        availability: readiness.candidates.find(({ id }) => id === item.id),
      })),
    });
  }
  const itemId = rest[0];
  if (!itemId || itemId.startsWith('--'))
    throw new Error('Work item id is required.');
  if (subcommand === 'inspect') {
    const program = readProgramSnapshot(path);
    const item = program.workItems.find((candidate) => candidate.id === itemId);
    if (!item) throw new Error(`Unknown work item ${itemId}.`);
    const dependencies = item.dependsOn.map((id) => ({
      id,
      status: program.workItems.find((candidate) => candidate.id === id)
        ?.status,
    }));
    return print({ programId: program.id, item, dependencies });
  }
  const owner = option('--owner', true)!;
  const ttlMinutes = positiveNumberOption('--ttl-minutes');
  if (subcommand === 'claim') {
    return print(
      claimWorkItem({
        itemId,
        owner,
        ttlMinutes,
        humanDecisionId: option('--human-decision-id'),
        path,
      }),
    );
  }
  if (subcommand === 'recover') {
    return print(
      recoverWorkItem({
        itemId,
        owner,
        claimId: option('--claim-id', true)!,
        expectedLeaseId: option('--lease-id', true)!,
        checkEvidence: option('--check-evidence'),
        ttlMinutes,
        path,
      }),
    );
  }
  if (subcommand === 'checkpoint') {
    return print(
      checkpointWorkItem({
        itemId,
        owner,
        claimId: option('--claim-id', true)!,
        note: option('--note', true)!,
        path,
      }),
    );
  }
  if (subcommand === 'complete') {
    return print(
      completeWorkItem({
        itemId,
        owner,
        claimId: option('--claim-id', true)!,
        evidence: parseEvidence(),
        note: option('--note', true)!,
        path,
      }),
    );
  }
  if (subcommand === 'finalize') {
    return print(
      finalizeTerminalWorkItem({
        itemId,
        owner,
        claimId: option('--claim-id', true)!,
        leaseId: option('--lease-id', true)!,
        path,
      }),
    );
  }
  if (subcommand === 'block') {
    const type = option('--type', true)!;
    if (!['technical', 'human', 'external', 'unsafe_state'].includes(type)) {
      throw new Error('--type is invalid.');
    }
    return print(
      blockWorkItem({
        itemId,
        owner,
        claimId: option('--claim-id', true)!,
        type: type as 'technical' | 'human' | 'external' | 'unsafe_state',
        reason: option('--reason', true)!,
        recovery: option('--recovery', true)!,
        note: option('--note'),
        path,
      }),
    );
  }
  if (subcommand === 'unblock') {
    return print(
      unblockWorkItem({
        itemId,
        owner,
        recoveryEvidence: repeatedOption('--evidence'),
        note: option('--note', true)!,
        ttlMinutes,
        path,
      }),
    );
  }
  throw new Error(`Unknown program command ${subcommand}.`);
};

const runLeaseCommand = () => {
  if (!subcommand || subcommand === '--help' || rest.includes('--help')) {
    return print(leaseHelp, false);
  }
  if (subcommand === 'status') {
    return withOperationalSnapshot(repositoryRoot, () => {
      const lease = readLease(repositoryRoot);
      return print({
        lease,
        resume: readResumeMarker(repositoryRoot),
        state: !lease
          ? 'unowned'
          : leaseIsExpired(lease)
            ? 'expired'
            : 'active',
      });
    });
  }
  const leaseId = option('--lease-id', true)!;
  if (subcommand === 'heartbeat') {
    return print(
      heartbeatLease(
        repositoryRoot,
        {
          leaseId,
          owner: option('--owner', true)!,
          workItemId: option('--work-item-id', true)!,
          claimId: option('--claim-id', true)!,
        },
        positiveNumberOption('--ttl-minutes', 210),
      ),
    );
  }
  throw new Error(`Unknown lease command ${subcommand}.`);
};

const runChecksCommand = () => {
  if (!subcommand || subcommand === '--help' || rest.includes('--help')) {
    return print(
      `checks plan|run <${checkStages.join('|')}> [--base <git-ref>] [--program <path>] [--json]`,
      false,
    );
  }
  const stage = rest[0];
  if (!checkStages.includes(stage as (typeof checkStages)[number])) {
    throw new Error(`Check stage must be one of ${checkStages.join(', ')}.`);
  }
  const changedFiles = getChangedFiles(option('--base') ?? 'HEAD');
  if (subcommand === 'plan')
    return print(planChecks(stage as never, changedFiles));
  if (subcommand === 'run') {
    const result = runChecks({
      stage: stage as never,
      changedFiles,
      record: !hasFlag('--no-record'),
      programPath: programPath(),
    });
    print(result);
    if (result.status !== 'passed') process.exitCode = 1;
    return;
  }
  throw new Error(`Unknown checks command ${subcommand}.`);
};

const runHumanCommand = () => {
  if (!subcommand || subcommand === '--help' || rest.includes('--help')) {
    return print(humanHelp, false);
  }
  const path = programPath();
  const program = readProgramSnapshot(path);
  const scope = {
    programId: program.id,
    validWorkItemIds: new Set(program.workItems.map(({ id }) => id)),
  };
  if (subcommand === 'list') {
    return withOperationalSnapshot(repositoryRoot, () =>
      print(
        readHumanValidationQueue(
          undefined,
          repositoryRoot,
          scope.validWorkItemIds,
          scope.programId,
        ),
      ),
    );
  }
  if (subcommand === 'add') {
    return print(
      addHumanValidation({
        lease: {
          leaseId: option('--lease-id', true)!,
          owner: option('--owner', true)!,
          workItemId: option('--work-item-id', true)!,
          claimId: option('--claim-id', true)!,
        },
        question: option('--question', true)!,
        whyAutomationIsInsufficient: option('--why-human', true)!,
        artifact: option('--artifact', true)!,
        recommendation: option('--recommendation', true)!,
        alternatives: repeatedOption('--alternative'),
        safeWhileWaiting: repeatedOption('--safe-work'),
        prohibitedWhileWaiting: repeatedOption('--prohibited-work'),
        blockedWorkItemIds: repeatedOption('--blocked-item'),
        safeWorkItemIds: repeatedOption('--safe-item'),
        ...scope,
      }),
    );
  }
  if (subcommand === 'resolve') {
    return print(
      resolveHumanValidation({
        itemId: option('--human-id', true)!,
        outcome: option('--outcome', true)! as
          'approved' | 'rejected' | 'changes_requested',
        decision: option('--decision', true)!,
        confirmedByHuman: option('--confirmed-by-human', true)!,
        ...scope,
      }),
    );
  }
  throw new Error(`Unknown human command ${subcommand}.`);
};

const runStateCommand = () => {
  if (!subcommand || subcommand === '--help' || rest.includes('--help')) {
    return print(stateHelp, false);
  }
  if (subcommand === 'status') {
    return print({
      mutex: readOperationalLock(repositoryRoot),
      transition: readOperationalTransaction(repositoryRoot),
    });
  }
  if (subcommand === 'recover-mutex') {
    return print(
      recoverOperationalLock({
        root: repositoryRoot,
        expectedHost: option('--expected-host', true)!,
        expectedPid: positiveNumberOption('--expected-pid')!,
      }),
    );
  }
  if (subcommand === 'recover-transition') {
    return print(
      recoverOperationalTransaction({
        root: repositoryRoot,
        expectedId: option('--transition-id', true)!,
      }),
    );
  }
  throw new Error(`Unknown state command ${subcommand}.`);
};

try {
  if (!command || command === '--help' || command === 'help')
    print(help, false);
  else if (command === 'program') runProgramCommand();
  else if (command === 'lease') runLeaseCommand();
  else if (command === 'checks') runChecksCommand();
  else if (command === 'canonicalize') {
    if (!subcommand || subcommand === '--help' || rest.includes('--help')) {
      print('canonicalize check|apply [--json]', false);
    } else if (subcommand === 'check' || subcommand === 'apply') {
      print(canonicalizeChangedFiles(subcommand));
    } else throw new Error(`Unknown canonicalize command ${subcommand}.`);
  } else if (command === 'senses') {
    if (!subcommand || subcommand === '--help' || rest.includes('--help')) {
      print('senses status|validate [--json]', false);
    } else if (subcommand === 'status' || subcommand === 'validate') {
      const result = readAndValidateSensoryMap();
      print(
        subcommand === 'validate'
          ? { ok: true, ...result.counts }
          : { ...result.counts, criteria: result.criteria },
      );
    } else throw new Error(`Unknown senses command ${subcommand}.`);
  } else if (command === 'human') runHumanCommand();
  else if (command === 'state') runStateCommand();
  else if (
    command === 'review' &&
    (!subcommand || subcommand === '--help' || rest.includes('--help'))
  ) {
    print('review create [--program <path>] [--json]', false);
  } else if (command === 'review' && subcommand === 'create') {
    print(createReviewPacket(programPath()));
  } else if (
    command === 'run' &&
    (!subcommand || subcommand === '--help' || rest.includes('--help'))
  ) {
    print(runHelp, false);
  } else if (command === 'run' && subcommand === 'preflight') {
    const continuationValues = {
      leaseId: option('--lease-id'),
      owner: option('--owner'),
      workItemId: option('--work-item-id'),
      claimId: option('--claim-id'),
    };
    const provided = Object.values(continuationValues).filter(Boolean).length;
    if (provided !== 0 && provided !== 4) {
      throw new Error(
        'Continuation requires --lease-id, --owner, --work-item-id, and --claim-id together.',
      );
    }
    print(
      assessAutonomousReadiness({
        path: programPath(),
        ...(provided === 4
          ? {
              continuation: {
                leaseId: continuationValues.leaseId!,
                owner: continuationValues.owner!,
                workItemId: continuationValues.workItemId!,
                claimId: continuationValues.claimId!,
              },
            }
          : {}),
      }),
    );
  } else {
    throw new Error(`Unknown command ${command}. Run pnpm run repo -- --help.`);
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
