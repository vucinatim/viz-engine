import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { canonicalCheckPlan } from '../../tools/repo/lib/check-contract';
import {
  addHumanValidation,
  resolveHumanValidation,
} from '../../tools/repo/lib/human-validation';
import { readLease, readResumeMarker } from '../../tools/repo/lib/lease';
import { resolveOperationalDirectory } from '../../tools/repo/lib/paths';
import { assessAutonomousReadiness } from '../../tools/repo/lib/preflight';
import {
  ExecutionProgramDefinition,
  getReadyWorkItems,
  readExecutionProgram,
  summarizeExecutionProgram,
  validateExecutionProgramDefinition,
} from '../../tools/repo/lib/program';
import {
  blockWorkItem,
  checkpointWorkItem,
  claimWorkItem,
  completeWorkItem,
  finalizeTerminalWorkItem,
  recoverWorkItem,
  unblockWorkItem,
} from '../../tools/repo/lib/program-transitions';
import { passingCheckEvidenceFixture } from './repo-check-evidence-fixture';

const temporaryDirectories: string[] = [];
const nominalLoad = { oneMinute: 0, cpuCount: 8 };
const assessReadiness = (
  options: NonNullable<Parameters<typeof assessAutonomousReadiness>[0]>,
) =>
  assessAutonomousReadiness({
    ...options,
    load: options.load ?? nominalLoad,
  });
const claim = (options: Parameters<typeof claimWorkItem>[0]) =>
  claimWorkItem({ ...options, load: options.load ?? nominalLoad });
const unblock = (options: Parameters<typeof unblockWorkItem>[0]) =>
  unblockWorkItem({ ...options, load: options.load ?? nominalLoad });
const git = (root: string, ...arguments_: string[]) =>
  execFileSync('git', arguments_, { cwd: root, encoding: 'utf8' }).trim();

const createGitRepository = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'viz-repo-program-'));
  temporaryDirectories.push(root);
  git(root, 'init', '--initial-branch=codex/test');
  git(root, 'config', 'user.email', 'tests@viz-engine.local');
  git(root, 'config', 'user.name', 'VizEngine Tests');
  writeFileSync(resolve(root, 'goal.md'), 'goal\n');
  writeFileSync(resolve(root, 'plan.md'), 'plan\n');
  writeFileSync(resolve(root, 'evidence.md'), 'evidence\n');
  writeFileSync(
    resolve(root, 'criteria.json'),
    `${JSON.stringify({
      criteria: [
        { id: 'repository.focused-and-failure-tests' },
        { id: 'reusable.canonical-authoring-and-feedback' },
      ],
    })}\n`,
  );
  writeFileSync(resolve(root, '.gitignore'), '.artifacts/\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'seed');
  return root;
};

const createProgram = (): ExecutionProgramDefinition => ({
  schemaVersion: 2,
  id: 'test-program',
  title: 'Test program',
  targetBranch: 'codex/test',
  parentGoal: 'goal.md',
  executionPlan: 'plan.md',
  criteriaContract: 'criteria.json',
  gates: [{ id: 'gate-1', title: 'Gate one', wave: 0 }],
  workItems: [
    {
      id: 'A-01',
      gate: 'gate-1',
      lane: 'contract',
      priority: 1,
      title: 'First item',
      authority: 'autonomous',
      dependsOn: [],
      estimate: { agentHoursMin: 1, agentHoursMax: 2 },
      acceptance: ['It works.'],
      evidenceLanes: ['code-architecture'],
      affectedCriteria: ['repository.focused-and-failure-tests'],
      evidenceRequirements: [
        {
          id: 'durable-proof',
          kind: 'document',
          description: 'One content-addressed document.',
        },
      ],
    },
    {
      id: 'A-02',
      gate: 'gate-1',
      lane: 'contract',
      priority: 2,
      title: 'Second item',
      authority: 'autonomous',
      dependsOn: ['A-01'],
      estimate: { agentHoursMin: 1, agentHoursMax: 2 },
      acceptance: ['It follows the first item.'],
      evidenceLanes: ['code-architecture'],
      affectedCriteria: [],
      evidenceRequirements: [
        {
          id: 'durable-proof',
          kind: 'document',
          description: 'One content-addressed document.',
        },
      ],
    },
  ],
});

const writeProgram = (root: string, program = createProgram()) => {
  const path = resolve(root, 'program.json');
  writeFileSync(path, `${JSON.stringify(program, null, 2)}\n`);
  git(root, 'add', 'program.json');
  git(root, 'commit', '-m', 'program');
  return path;
};

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    );
});

describe('repository execution program', () => {
  it('enforces autonomous admission at the atomic claim boundary', () => {
    const root = createGitRepository();
    const path = writeProgram(root);
    expect(() =>
      claimWorkItem({
        itemId: 'A-01',
        owner: '/root/test',
        root,
        path,
        load: { oneMinute: 16, cpuCount: 8 },
      }),
    ).toThrow(/Autonomous claim refused by preflight.*Host load/u);
    expect(readLease(root)).toBeNull();
    expect(readExecutionProgram(path, root).workItems[0].status).toBe(
      'pending',
    );

    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    expect(claimed.item.status).toBe('in_progress');
    expect(readLease(root)?.id).toBe(claimed.lease.id);
  }, 15_000);

  it('derives ready work and rejects dependency cycles', () => {
    const root = createGitRepository();
    const program = createProgram();
    const definition = validateExecutionProgramDefinition(program, root);
    const path = writeProgram(root, definition);
    const composed = readExecutionProgram(path, root);
    expect(getReadyWorkItems(composed).map(({ id }) => id)).toEqual(['A-01']);
    expect(summarizeExecutionProgram(composed).remainingEstimate).toEqual({
      agentHoursMin: 2,
      agentHoursMax: 4,
    });

    const cyclic = structuredClone(program);
    cyclic.workItems[0].dependsOn = ['A-02'];
    expect(() => validateExecutionProgramDefinition(cyclic, root)).toThrow(
      /dependency cycle/u,
    );

    for (const branch of ['main', 'master']) {
      const reservedTarget = structuredClone(program);
      reservedTarget.targetBranch = branch;
      expect(() =>
        validateExecutionProgramDefinition(reservedTarget, root),
      ).toThrow(`Execution programs cannot target reserved branch ${branch}.`);
    }
  });

  it('keeps lifecycle state outside the worktree and binds evidence to a requirement', () => {
    const root = createGitRepository();
    const path = writeProgram(root);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    expect(claimed.item.status).toBe('in_progress');
    expect(git(root, 'status', '--porcelain')).toBe('');
    expect(() =>
      completeWorkItem({
        itemId: 'A-01',
        owner: '/root/test',
        claimId: claimed.item.owner!.claimId,
        evidence: [],
        note: 'Missing evidence must fail.',
        root,
        path,
      }),
    ).toThrow(/missing evidence for durable-proof/u);

    writeFileSync(resolve(root, 'checkpoint.md'), 'coherent checkpoint\n');
    git(root, 'add', 'checkpoint.md');
    git(root, 'commit', '-m', 'complete first item');
    const digest = createHash('sha256').update('evidence\n').digest('hex');
    const completed = completeWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.item.owner!.claimId,
      evidence: [
        {
          requirementId: 'durable-proof',
          reference: `document:evidence.md#sha256=${digest}`,
        },
      ],
      note: 'Contract proven.',
      root,
      path,
    });
    expect(completed.item.status).toBe('complete');
    expect(git(root, 'status', '--porcelain')).toBe('');
    expect(getReadyWorkItems(readExecutionProgram(path, root))[0].id).toBe(
      'A-02',
    );

    const operational = resolveOperationalDirectory(root);
    const archiveDirectory = resolve(operational, 'lease-archive');
    const completedLease = readdirSync(archiveDirectory).find((file) =>
      file.endsWith('-completed.json'),
    )!;
    const leasePath = resolve(operational, 'lease.json');
    renameSync(resolve(archiveDirectory, completedLease), leasePath);
    const stranded = JSON.parse(readFileSync(leasePath, 'utf8')) as {
      expiresAt: string;
      pid: number;
    };
    writeFileSync(
      leasePath,
      `${JSON.stringify({
        ...stranded,
        expiresAt: '1970-01-01T00:00:00.000Z',
        pid: 99_999_999,
      })}\n`,
    );
    finalizeTerminalWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.item.owner!.claimId,
      leaseId: claimed.lease.id,
      root,
      path,
    });
    expect(readLease(root)).toBeNull();
  }, 15_000);

  it('allows clean independent work after a block and refuses unknown dirty state', () => {
    const root = createGitRepository();
    const program = createProgram();
    program.workItems.push({
      ...structuredClone(program.workItems[0]),
      id: 'B-01',
      title: 'Independent item',
      priority: 3,
    });
    const path = writeProgram(root, program);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    expect(() =>
      blockWorkItem({
        itemId: 'A-01',
        owner: '/root/test',
        claimId: claimed.lease.claimId,
        type: 'technical',
        reason: '   ',
        recovery: 'No meaningful recovery.',
        root,
        path,
      }),
    ).toThrow(/non-empty reason/u);
    blockWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.item.owner!.claimId,
      type: 'technical',
      reason: 'Bounded fixture failure.',
      recovery: 'Repair the fixture.',
      root,
      path,
    });
    expect(
      getReadyWorkItems(readExecutionProgram(path, root)).map(({ id }) => id),
    ).toEqual(['B-01']);
    const independent = claim({
      itemId: 'B-01',
      owner: '/root/test',
      root,
      path,
    });
    expect(independent.item.status).toBe('in_progress');
  }, 15_000);

  it('rediscovers a clean blocked item when no independent work is ready', () => {
    const root = createGitRepository();
    const path = writeProgram(root);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    blockWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      type: 'technical',
      reason: 'Bounded recoverable test block.',
      recovery: 'Provide exact recovery evidence.',
      root,
      path,
    });
    const readiness = assessReadiness({ root, path });
    expect(readiness.requiredAction).toBe('resume-blocked');
    expect(readiness.mutationAllowed).toBe(true);
    const stateDirectory = resolve(
      resolveOperationalDirectory(root),
      'program-state',
    );
    const statePath = resolve(stateDirectory, readdirSync(stateDirectory)[0]);
    const malformed = JSON.parse(readFileSync(statePath, 'utf8')) as {
      workItems: Array<{ id: string; blocker?: { reason: string } }>;
    };
    malformed.workItems.find(({ id }) => id === 'A-01')!.blocker!.reason = ' ';
    writeFileSync(statePath, `${JSON.stringify(malformed)}\n`);
    expect(() => readExecutionProgram(path, root)).toThrow(
      /malformed recovery state/u,
    );
  }, 15_000);

  it('binds blocked admission to the selected per-claim resume marker', () => {
    const root = createGitRepository();
    const definition = createProgram();
    definition.workItems.push({
      ...structuredClone(definition.workItems[0]),
      id: 'B-01',
      title: 'Independent item',
      priority: 3,
    });
    const path = writeProgram(root, definition);
    const first = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    blockWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: first.lease.claimId,
      type: 'technical',
      reason: 'First bounded block.',
      recovery: 'Resume with first evidence.',
      root,
      path,
    });
    const second = claim({
      itemId: 'B-01',
      owner: '/root/test',
      root,
      path,
    });
    blockWorkItem({
      itemId: 'B-01',
      owner: '/root/test',
      claimId: second.lease.claimId,
      type: 'technical',
      reason: 'Second bounded block.',
      recovery: 'Resume with second evidence.',
      root,
      path,
    });

    const readiness = assessReadiness({ root, path });
    expect(readiness.requiredAction).toBe('resume-blocked');
    expect(readiness.blockedResume?.workItemId).toBe('A-01');
    expect(readResumeMarker(root)?.workItemId).toBe('B-01');
    const artifact = `document:evidence.md#sha256=${createHash('sha256')
      .update('evidence\n')
      .digest('hex')}`;
    const resumed = unblock({
      itemId: 'A-01',
      owner: '/root/test',
      recoveryEvidence: [artifact],
      note: 'Resume the specifically admitted older item.',
      root,
      path,
    });
    expect(resumed.item.status).toBe('in_progress');
    expect(resumed.lease.recoveredFrom).toBe(first.lease.id);
  }, 20_000);

  it('keeps a high-load stop authoritative over blocked-item discovery', () => {
    const root = createGitRepository();
    const path = writeProgram(root);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    blockWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      type: 'unsafe_state',
      reason: 'Host contention requires a stop.',
      recovery: 'Resume only when load permits.',
      root,
      path,
    });
    const readiness = assessReadiness({
      root,
      path,
      load: { oneMinute: 16, cpuCount: 8 },
    });
    expect(readiness.requiredAction).toBe('stop');
    expect(readiness.mutationAllowed).toBe(false);
    expect(readiness.reasons).toContain(
      'Host load is too high for another autonomous checkpoint.',
    );
    const artifact = `document:evidence.md#sha256=${createHash('sha256')
      .update('evidence\n')
      .digest('hex')}`;
    expect(() =>
      unblockWorkItem({
        itemId: 'A-01',
        owner: '/root/test',
        recoveryEvidence: [artifact],
        note: 'Unsafe high-load resume.',
        root,
        path,
        load: { oneMinute: 16, cpuCount: 8 },
      }),
    ).toThrow(/Autonomous resume refused by preflight.*Host load/u);
    expect(readLease(root)).toBeNull();
    expect(readExecutionProgram(path, root).workItems[0].status).toBe(
      'blocked',
    );
  }, 15_000);

  it('reports a completed program as a clean terminal stop', () => {
    const root = createGitRepository();
    const definition = createProgram();
    definition.workItems = [definition.workItems[0]];
    const path = writeProgram(root, definition);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    writeFileSync(resolve(root, 'checkpoint.md'), 'terminal checkpoint\n');
    git(root, 'add', 'checkpoint.md');
    git(root, 'commit', '-m', 'complete program');
    const digest = createHash('sha256').update('evidence\n').digest('hex');
    completeWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      evidence: [
        {
          requirementId: 'durable-proof',
          reference: `document:evidence.md#sha256=${digest}`,
        },
      ],
      note: 'Program is complete.',
      root,
      path,
    });

    const readiness = assessReadiness({ root, path });
    expect(readiness.requiredAction).toBe('stop');
    expect(readiness.mutationAllowed).toBe(false);
    expect(readiness.candidates).toEqual([]);
    expect(readiness.reasons).toContain('Program is complete.');
  }, 15_000);

  it('enforces pending human stops at preflight and mutation boundaries', () => {
    const root = createGitRepository();
    const definition = createProgram();
    definition.workItems.push({
      ...structuredClone(definition.workItems[0]),
      id: 'B-01',
      title: 'Independent human-blocked item',
      priority: 3,
    });
    const path = writeProgram(root, definition);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    const artifact = `document:evidence.md#sha256=${createHash('sha256')
      .update('evidence\n')
      .digest('hex')}`;
    const question = addHumanValidation({
      lease: {
        leaseId: claimed.lease.id,
        owner: claimed.lease.owner,
        workItemId: claimed.lease.workItemId,
        claimId: claimed.lease.claimId,
      },
      question: 'Should work continue?',
      whyAutomationIsInsufficient: 'The next decision is human-owned.',
      artifact,
      recommendation: 'Review before continuing.',
      alternatives: ['Request changes.'],
      safeWhileWaiting: ['Inspect evidence.'],
      prohibitedWhileWaiting: ['Resume A-01 or claim B-01.'],
      blockedWorkItemIds: ['A-01', 'B-01'],
      safeWorkItemIds: [],
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02', 'B-01']),
    });
    const activeStop = assessReadiness({
      root,
      path,
      continuation: {
        leaseId: claimed.lease.id,
        owner: claimed.lease.owner,
        workItemId: claimed.lease.workItemId,
        claimId: claimed.lease.claimId,
      },
    });
    expect(activeStop.requiredAction).toBe('human-checkpoint');
    expect(activeStop.mutationAllowed).toBe(false);
    expect(() =>
      checkpointWorkItem({
        itemId: 'A-01',
        owner: '/root/test',
        claimId: claimed.lease.claimId,
        note: 'Must not checkpoint past the human stop.',
        root,
        path,
      }),
    ).toThrow(/blocked by pending human validation/u);
    expect(() =>
      completeWorkItem({
        itemId: 'A-01',
        owner: '/root/test',
        claimId: claimed.lease.claimId,
        evidence: [],
        note: 'Must not complete past the human stop.',
        root,
        path,
      }),
    ).toThrow(/blocked by pending human validation/u);
    writeFileSync(resolve(root, 'owned-dirty.txt'), 'preserve while waiting\n');
    blockWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      type: 'human',
      reason: 'Await the human decision.',
      recovery: 'Resume only after approval.',
      root,
      path,
    });

    const readiness = assessReadiness({ root, path });
    expect(readiness.requiredAction).toBe('human-checkpoint');
    expect(readiness.mutationAllowed).toBe(false);
    expect(readiness.reasons.join(' ')).toContain(question.id);
    expect(() =>
      claim({
        itemId: 'B-01',
        owner: '/root/test',
        root,
        path,
      }),
    ).toThrow(
      /Autonomous claim refused by preflight.*awaits human validation/u,
    );
    expect(() =>
      unblock({
        itemId: 'A-01',
        owner: '/root/test',
        recoveryEvidence: [artifact],
        note: 'Unsafe attempted resume.',
        root,
        path,
      }),
    ).toThrow(/blocked by pending human validation/u);
    resolveHumanValidation({
      itemId: question.id,
      outcome: 'rejected',
      decision: 'Do not resume this work.',
      confirmedByHuman: 'Explicit test fixture authority.',
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02', 'B-01']),
    });
    const rejected = assessReadiness({ root, path });
    expect(rejected.requiredAction).toBe('stop');
    expect(rejected.reasons.join(' ')).toMatch(/lacks an approved/u);
    expect(() =>
      unblock({
        itemId: 'A-01',
        owner: '/root/test',
        recoveryEvidence: [`decision:test-program/${question.id}`],
        note: 'Unsafe rejected resume.',
        root,
        path,
      }),
    ).toThrow(/requires approved human validation/u);
  }, 15_000);

  it('resumes a human block only with its exact approved decision evidence', () => {
    const root = createGitRepository();
    const path = writeProgram(root);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    const artifact = `document:evidence.md#sha256=${createHash('sha256')
      .update('evidence\n')
      .digest('hex')}`;
    const question = addHumanValidation({
      lease: {
        leaseId: claimed.lease.id,
        owner: claimed.lease.owner,
        workItemId: claimed.lease.workItemId,
        claimId: claimed.lease.claimId,
      },
      question: 'Approve resumption?',
      whyAutomationIsInsufficient: 'Authority is human-owned.',
      artifact,
      recommendation: 'Approve after review.',
      alternatives: ['Reject.'],
      safeWhileWaiting: ['Inspect evidence.'],
      prohibitedWhileWaiting: ['Resume the work item.'],
      blockedWorkItemIds: ['A-01'],
      safeWorkItemIds: [],
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02']),
    });
    blockWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      type: 'human',
      reason: 'Await approval.',
      recovery: 'Resume only with the exact approved decision.',
      root,
      path,
    });
    resolveHumanValidation({
      itemId: question.id,
      outcome: 'approved',
      decision: 'Approved to resume.',
      confirmedByHuman: 'Explicit test fixture authority.',
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02']),
    });
    expect(() =>
      unblock({
        itemId: 'A-01',
        owner: '/root/test',
        recoveryEvidence: [artifact],
        note: 'Missing decision binding.',
        root,
        path,
      }),
    ).toThrow(/requires recovery evidence decision:/u);
    const resumed = unblock({
      itemId: 'A-01',
      owner: '/root/test',
      recoveryEvidence: [`decision:test-program/${question.id}`],
      note: 'Resumed with exact approval.',
      root,
      path,
    });
    expect(resumed.item.status).toBe('in_progress');
    expect(resumed.item.recoveryEvidence).toContain(
      `decision:test-program/${question.id}`,
    );
  }, 15_000);

  it('rejects overlapping wakes unless they present the exact continuation identity', () => {
    const root = createGitRepository();
    const path = writeProgram(root);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    const freshWake = assessReadiness({ root, path });
    expect(freshWake.requiredAction).toBe('wait-writer-lease');
    expect(freshWake.mutationAllowed).toBe(false);

    const continuation = assessReadiness({
      root,
      path,
      continuation: {
        leaseId: claimed.lease.id,
        owner: claimed.lease.owner,
        workItemId: claimed.lease.workItemId,
        claimId: claimed.lease.claimId,
      },
    });
    expect(continuation.requiredAction).toBe('continue');
    expect(continuation.mutationAllowed).toBe(true);

    const other = `${root}-other`;
    temporaryDirectories.push(other);
    git(root, 'worktree', 'add', '-b', 'codex/other', other);
    const otherWake = assessReadiness({
      root: other,
      path: resolve(other, 'program.json'),
    });
    expect(otherWake.requiredAction).toBe('stop');
    expect(otherWake.reasons.join(' ')).toMatch(/targets branch codex\/test/u);
  }, 15_000);

  it('admits command evidence only for the exact claim and terminal commit', () => {
    const root = createGitRepository();
    const definition = createProgram();
    definition.workItems[0].evidenceRequirements = [
      {
        id: 'check-proof',
        kind: 'command',
        checkStage: 'fast',
        description: 'Exact claim-bound check record.',
      },
    ];
    const path = writeProgram(root, definition);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    writeFileSync(
      resolve(root, 'checkpoint.md'),
      `checked checkpoint\n${'x'.repeat(1_100_000)}`,
    );
    const plan = canonicalCheckPlan('fast', ['checkpoint.md']);
    const leaseIdentity = {
      id: claimed.lease.id,
      owner: claimed.lease.owner,
      workItemId: claimed.lease.workItemId,
      claimId: claimed.lease.claimId,
    };
    const record = passingCheckEvidenceFixture({
      root,
      plan,
      programDefinitionHash: claimed.program.definitionHash,
      programId: claimed.program.id,
      lease: leaseIdentity,
    });
    const artifacts = resolve(root, '.artifacts');
    mkdirSync(artifacts);
    const recordText = `${JSON.stringify(record)}\n`;
    writeFileSync(resolve(artifacts, 'check.json'), recordText);
    git(root, 'add', 'checkpoint.md');
    git(root, 'commit', '-m', 'checked checkpoint');
    const reference = `command:.artifacts/check.json#sha256=${createHash(
      'sha256',
    )
      .update(recordText)
      .digest('hex')}`;

    const completed = completeWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      evidence: [{ requirementId: 'check-proof', reference }],
      note: 'Exact command evidence admitted.',
      root,
      path,
    });
    expect(completed.item.status).toBe('complete');
    expect(completed.item.evidence[0].reference).toMatch(
      /^command:sha256:[0-9a-f]{64}$/u,
    );
  }, 15_000);

  it('recovers an exact committed checkpoint only with its precommit check evidence', () => {
    const root = createGitRepository();
    const definition = createProgram();
    definition.workItems[0].evidenceRequirements = [
      {
        id: 'check-proof',
        kind: 'command',
        checkStage: 'checkpoint',
        description: 'Exact precommit checkpoint record.',
      },
    ];
    const path = writeProgram(root, definition);
    const claimed = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    writeFileSync(resolve(root, 'checkpoint.md'), 'recoverable checkpoint\n');
    const plan = canonicalCheckPlan('checkpoint', ['checkpoint.md']);
    const record = passingCheckEvidenceFixture({
      root,
      plan,
      programDefinitionHash: claimed.program.definitionHash,
      programId: claimed.program.id,
      lease: {
        id: claimed.lease.id,
        owner: claimed.lease.owner,
        workItemId: claimed.lease.workItemId,
        claimId: claimed.lease.claimId,
      },
    });
    const artifacts = resolve(root, '.artifacts');
    mkdirSync(artifacts);
    const recordText = `${JSON.stringify(record)}\n`;
    writeFileSync(resolve(artifacts, 'checkpoint-check.json'), recordText);
    const evidence = `command:.artifacts/checkpoint-check.json#sha256=${createHash(
      'sha256',
    )
      .update(recordText)
      .digest('hex')}`;
    git(root, 'add', 'checkpoint.md');
    git(root, 'commit', '-m', 'recoverable checkpoint');

    const leasePath = resolve(resolveOperationalDirectory(root), 'lease.json');
    writeFileSync(
      leasePath,
      `${JSON.stringify({
        ...readLease(root)!,
        expiresAt: '1970-01-01T00:00:00.000Z',
        pid: 99_999_999,
      })}\n`,
    );
    const recovery = {
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      expectedLeaseId: claimed.lease.id,
      root,
      path,
    };
    expect(() => recoverWorkItem(recovery)).toThrow(
      /Resume marker and current Git state disagree/u,
    );
    const recovered = recoverWorkItem({
      ...recovery,
      checkEvidence: evidence,
    });
    expect(recovered.lease.id).toBe(claimed.lease.id);
    expect(recovered.lease.recoveredFrom).toBe(claimed.lease.id);

    const completed = completeWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: claimed.lease.claimId,
      evidence: [{ requirementId: 'check-proof', reference: evidence }],
      note: 'Recovered checkpoint completed with exact evidence.',
      root,
      path,
    });
    expect(completed.item.status).toBe('complete');
  }, 15_000);

  it('requires a resolved human decision scoped to a human checkpoint', () => {
    const root = createGitRepository();
    const definition = createProgram();
    definition.workItems.push({
      ...structuredClone(definition.workItems[0]),
      id: 'H-01',
      title: 'Human gate',
      authority: 'human_checkpoint',
      dependsOn: [],
      externalApproval: 'Explicit product-owner decision.',
      evidenceRequirements: [
        {
          id: 'decision-proof',
          kind: 'decision',
          description: 'Resolved human decision.',
        },
      ],
    });
    const path = writeProgram(root, definition);
    expect(() =>
      claim({
        itemId: 'H-01',
        owner: '/root/test',
        root,
        path,
      }),
    ).toThrow(/explicit human confirmation/u);

    const builder = claim({
      itemId: 'A-01',
      owner: '/root/test',
      root,
      path,
    });
    const artifact = `document:evidence.md#sha256=${createHash('sha256')
      .update('evidence\n')
      .digest('hex')}`;
    const decisionRequest = addHumanValidation({
      lease: {
        leaseId: builder.lease.id,
        owner: builder.lease.owner,
        workItemId: builder.lease.workItemId,
        claimId: builder.lease.claimId,
      },
      question: 'Approve the gate?',
      whyAutomationIsInsufficient: 'Authority is human-owned.',
      artifact,
      recommendation: 'Approve.',
      alternatives: ['Reject.'],
      safeWhileWaiting: ['Inspect evidence.'],
      prohibitedWhileWaiting: ['Claim the gate.'],
      blockedWorkItemIds: ['H-01'],
      safeWorkItemIds: [],
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02', 'H-01']),
    });
    resolveHumanValidation({
      itemId: decisionRequest.id,
      outcome: 'rejected',
      decision: 'Rejected for the negative-path proof.',
      confirmedByHuman: 'Explicit test fixture authority.',
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02', 'H-01']),
    });
    expect(() =>
      claim({
        itemId: 'H-01',
        owner: '/root/test',
        humanDecisionId: decisionRequest.id,
        root,
        path,
      }),
    ).toThrow(/approved human decision/u);
    const approval = addHumanValidation({
      lease: {
        leaseId: builder.lease.id,
        owner: builder.lease.owner,
        workItemId: builder.lease.workItemId,
        claimId: builder.lease.claimId,
      },
      question: 'Approve the gate after review?',
      whyAutomationIsInsufficient: 'Authority is human-owned.',
      artifact,
      recommendation: 'Approve.',
      alternatives: ['Reject.'],
      safeWhileWaiting: ['Inspect evidence.'],
      prohibitedWhileWaiting: ['Claim the gate.'],
      blockedWorkItemIds: ['H-01'],
      safeWorkItemIds: [],
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02', 'H-01']),
    });
    resolveHumanValidation({
      itemId: approval.id,
      outcome: 'approved',
      decision: 'Approved.',
      confirmedByHuman: 'Explicit test fixture authority.',
      root,
      programId: 'test-program',
      validWorkItemIds: new Set(['A-01', 'A-02', 'H-01']),
    });
    blockWorkItem({
      itemId: 'A-01',
      owner: '/root/test',
      claimId: builder.lease.claimId,
      type: 'technical',
      reason: 'Release the fixture writer.',
      recovery: 'Not required by this test.',
      root,
      path,
    });
    const claimedGate = claim({
      itemId: 'H-01',
      owner: '/root/test',
      humanDecisionId: approval.id,
      root,
      path,
    });
    expect(claimedGate.item.status).toBe('in_progress');
    expect(claimedGate.item.note).toContain(approval.id);
  }, 15_000);
});
