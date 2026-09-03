import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { canonicalCheckPlan } from '../../tools/repo/lib/check-contract';
import { validateEvidenceReference } from '../../tools/repo/lib/program';
import { passingCheckEvidenceFixture } from './repo-check-evidence-fixture';

const roots: string[] = [];
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const createRepository = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'viz-evidence-'));
  roots.push(root);
  execFileSync('git', ['init', '--initial-branch=codex/test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
    cwd: root,
  });
  execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
    cwd: root,
  });
  writeFileSync(resolve(root, 'evidence.md'), 'evidence\n');
  writeFileSync(resolve(root, '.gitignore'), '.artifacts/\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
  return root;
};

afterEach(() => {
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe('repository evidence', () => {
  it('requires existing content-addressed document and artifact evidence', () => {
    const root = createRepository();
    expect(
      validateEvidenceReference(
        `document:evidence.md#sha256=${sha256('evidence\n')}`,
        'evidence',
        root,
      ),
    ).toBe('document');
    expect(() =>
      validateEvidenceReference(
        `artifact:.artifacts/missing.json#sha256=${sha256('missing')}`,
        'evidence',
        root,
      ),
    ).toThrow(/existing repository-relative file/u);
    expect(() =>
      validateEvidenceReference(
        `document:evidence.md#sha256=${sha256('other')}`,
        'evidence',
        root,
      ),
    ).toThrow(/content hash does not match/u);
  });

  it('rejects hand-written or stale command evidence', () => {
    const root = createRepository();
    const plan = canonicalCheckPlan('fast', []);
    const definitionHash = 'd'.repeat(64);
    const record = passingCheckEvidenceFixture({
      root,
      plan,
      programDefinitionHash: definitionHash,
    });
    const directory = resolve(root, '.artifacts');
    mkdirSync(directory);
    const path = resolve(directory, 'check.json');
    const writeRecord = (value: unknown) => {
      const text = `${JSON.stringify(value)}\n`;
      writeFileSync(path, text);
      return `command:.artifacts/check.json#sha256=${sha256(text)}`;
    };
    const validReference = writeRecord(record);
    expect(
      validateEvidenceReference(validReference, 'evidence', root, {
        checkStage: 'fast',
        programDefinitionHash: definitionHash,
        enforceCanonicalPlan: true,
      }),
    ).toBe('command');

    const emptyResultsReference = writeRecord({ ...record, results: [] });
    expect(() =>
      validateEvidenceReference(emptyResultsReference, 'evidence', root, {
        checkStage: 'fast',
        programDefinitionHash: definitionHash,
        enforceCanonicalPlan: true,
      }),
    ).toThrow(/passing check record/u);

    const fakePlan = {
      stage: 'fast',
      changedFiles: [],
      commands: plan.commands.map(({ id }) => ({ id })),
    };
    const fakePlanReference = writeRecord({
      ...record,
      plan: fakePlan,
      planHash: sha256(JSON.stringify(fakePlan)),
    });
    expect(() =>
      validateEvidenceReference(fakePlanReference, 'evidence', root, {
        checkStage: 'fast',
        programDefinitionHash: definitionHash,
        enforceCanonicalPlan: true,
      }),
    ).toThrow(/malformed check plan/u);

    const historicalPlan = {
      stage: 'fast' as const,
      changedFiles: [],
      commands: [
        ...plan.commands,
        {
          id: 'retired-check',
          command: 'pnpm',
          arguments: ['retired:check'],
          reason:
            'A once-canonical check retired after this evidence was admitted.',
        },
      ],
    };
    const historicalReference = writeRecord({
      ...record,
      plan: historicalPlan,
      planHash: sha256(JSON.stringify(historicalPlan)),
      results: historicalPlan.commands.map(({ id }) => ({
        id,
        status: 'passed',
        durationMs: 1,
        exitCode: 0,
      })),
    });
    expect(
      validateEvidenceReference(
        historicalReference,
        'historical evidence',
        root,
        {
          checkStage: 'fast',
          programDefinitionHash: definitionHash,
        },
      ),
    ).toBe('command');
    expect(() =>
      validateEvidenceReference(historicalReference, 'new evidence', root, {
        checkStage: 'fast',
        programDefinitionHash: definitionHash,
        enforceCanonicalPlan: true,
      }),
    ).toThrow(/canonical check plan/u);

    const currentReference = writeRecord(record);
    writeFileSync(resolve(root, 'later.txt'), 'unreviewed\n');
    expect(() =>
      validateEvidenceReference(currentReference, 'evidence', root, {
        checkStage: 'fast',
        programDefinitionHash: definitionHash,
        enforceCanonicalPlan: true,
      }),
    ).toThrow(/stale for the current worktree/u);
  });
});
