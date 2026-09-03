import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { canonicalCheckPlan } from '../../tools/repo/lib/check-contract';
import { readRepositoryIdentity } from '../../tools/repo/lib/repository-state';
import {
  classifyCheckEvidence,
  createReviewPacket,
} from '../../tools/repo/lib/review-packet';
import { passingCheckEvidenceFixture } from './repo-check-evidence-fixture';

describe('repository review packets', () => {
  it('assembles a coherent packet from the canonical repository snapshot', () => {
    const created = createReviewPacket();
    try {
      const packet = JSON.parse(
        readFileSync(resolve(process.cwd(), created.path), 'utf8'),
      ) as {
        schemaVersion: number;
        kind: string;
        identity: { head: string; branch: string; statusHash: string };
        program: { id: string };
        checks: Array<{ classification: string }>;
      };
      const identity = readRepositoryIdentity(process.cwd());
      expect(packet.schemaVersion).toBe(2);
      expect(packet.kind).toBe('viz-engine-autonomous-review-packet');
      expect(packet.identity).toMatchObject({
        head: identity.head,
        branch: identity.branch,
        statusHash: identity.statusHash,
      });
      expect(packet.program.id).toBe('goal-five-autonomous-readiness');
      expect(
        packet.checks.every(({ classification }) =>
          ['current', 'stale', 'invalid'].includes(classification),
        ),
      ).toBe(true);
    } finally {
      rmSync(resolve(process.cwd(), created.path));
    }
  });

  it('never classifies fabricated current check JSON as passing evidence', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'viz-review-'));
    try {
      execFileSync('git', ['init', '--initial-branch=codex/test'], {
        cwd: root,
      });
      execFileSync('git', ['config', 'user.email', 'tests@viz-engine.local'], {
        cwd: root,
      });
      execFileSync('git', ['config', 'user.name', 'VizEngine Tests'], {
        cwd: root,
      });
      writeFileSync(resolve(root, '.gitignore'), '.artifacts/\n');
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['commit', '-m', 'seed'], { cwd: root });
      const identity = readRepositoryIdentity(root);
      const directory = resolve(root, '.artifacts');
      mkdirSync(directory);
      const path = resolve(directory, 'check.json');
      writeFileSync(
        path,
        `${JSON.stringify({
          schemaVersion: 2,
          kind: 'viz-engine-check-run',
          stage: 'fast',
          status: 'passed',
          repository: { final: identity },
        })}\n`,
      );
      expect(classifyCheckEvidence(path, identity, root).classification).toBe(
        'invalid',
      );

      const plan = canonicalCheckPlan('fast', []);
      const record = passingCheckEvidenceFixture({
        root,
        plan,
        programDefinitionHash: 'd'.repeat(64),
      });
      writeFileSync(path, `${JSON.stringify(record)}\n`);
      expect(classifyCheckEvidence(path, identity, root).classification).toBe(
        'current',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
