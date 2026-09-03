import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  addHumanValidation,
  readHumanValidationQueue,
  resolveHumanValidation,
} from '../../tools/repo/lib/human-validation';
import { acquireLease } from '../../tools/repo/lib/lease';

const roots: string[] = [];
const createRepository = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'viz-human-'));
  roots.push(root);
  execFileSync('git', ['init', '--initial-branch=codex/test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
    cwd: root,
  });
  execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
    cwd: root,
  });
  writeFileSync(resolve(root, 'review.md'), 'review\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
  return root;
};

afterEach(() => {
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe('human validation queue', () => {
  it('validates before writing and requires exact lease plus human confirmation', () => {
    const root = createRepository();
    const path = resolve(root, 'queue.json');
    const lease = acquireLease({
      root,
      owner: '/root/test',
      programId: 'program',
      workItemId: 'A-01',
      claimId: 'claim-one',
    });
    const identity = {
      leaseId: lease.id,
      owner: lease.owner,
      workItemId: lease.workItemId,
      claimId: lease.claimId,
    };
    const validWorkItemIds = new Set(['A-01', 'ACT-01']);
    const artifact = `document:review.md#sha256=${createHash('sha256')
      .update('review\n')
      .digest('hex')}`;
    expect(() =>
      addHumanValidation({
        lease: identity,
        question: 'Is this direction correct?',
        whyAutomationIsInsufficient: 'Creative intent is human-owned.',
        artifact,
        recommendation: 'Approve.',
        alternatives: [],
        safeWhileWaiting: ['Run unit tests.'],
        prohibitedWhileWaiting: ['Activate recurrence.'],
        blockedWorkItemIds: ['ACT-01'],
        safeWorkItemIds: [],
        root,
        path,
        programId: 'program',
        validWorkItemIds,
      }),
    ).toThrow(/alternatives must contain/u);
    expect(
      readHumanValidationQueue(path, root, validWorkItemIds, 'program').items,
    ).toEqual([]);

    const item = addHumanValidation({
      lease: identity,
      question: 'Is this direction correct?',
      whyAutomationIsInsufficient: 'Creative intent is human-owned.',
      artifact,
      recommendation: 'Approve.',
      alternatives: ['Request changes.'],
      safeWhileWaiting: ['Run unit tests.'],
      prohibitedWhileWaiting: ['Activate recurrence.'],
      blockedWorkItemIds: ['ACT-01'],
      safeWorkItemIds: [],
      root,
      path,
      programId: 'program',
      validWorkItemIds,
    });
    expect(() =>
      resolveHumanValidation({
        itemId: item.id,
        outcome: 'approved',
        decision: '',
        confirmedByHuman: 'User message in the parent Codex task.',
        root,
        path,
        programId: 'program',
        validWorkItemIds,
      }),
    ).toThrow(/decision is required/u);
    expect(() =>
      resolveHumanValidation({
        itemId: item.id,
        outcome: 'approved',
        decision: 'Approved.',
        confirmedByHuman: '',
        root,
        path,
        programId: 'program',
        validWorkItemIds,
      }),
    ).toThrow(/confirmation source is required/u);
    const resolved = resolveHumanValidation({
      itemId: item.id,
      outcome: 'approved',
      decision: 'Approved.',
      confirmedByHuman: 'User message in the parent Codex task.',
      root,
      path,
      programId: 'program',
      validWorkItemIds,
    });
    expect(resolved.status).toBe('resolved');
    expect(
      readHumanValidationQueue(path, root, validWorkItemIds, 'program').items[0]
        .confirmedByHuman,
    ).toBe('User message in the parent Codex task.');
    expect(
      readHumanValidationQueue(
        undefined,
        root,
        new Set(['OTHER-01']),
        'other-program',
      ).items,
    ).toEqual([]);
    expect(() =>
      resolveHumanValidation({
        itemId: item.id,
        outcome: 'rejected',
        decision: 'Changed.',
        confirmedByHuman: 'Another message.',
        root,
        path,
        programId: 'program',
        validWorkItemIds,
      }),
    ).toThrow(/already resolved/u);
  }, 15_000);
});
