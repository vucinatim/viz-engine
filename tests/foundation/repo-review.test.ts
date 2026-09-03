import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import { resolveOperationalDirectory } from '../../tools/repo/lib/paths';
import { readRepositoryIdentity } from '../../tools/repo/lib/repository-state';
import {
  classifyAdmittedCheckEvidence,
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
      expect(packet.schemaVersion).toBe(3);
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

  it('distinguishes terminally admitted checks from stale raw runs', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'viz-review-admitted-'));
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
      const startingHead = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim();
      writeFileSync(resolve(root, 'checkpoint.md'), 'accepted checkpoint\n');
      const lease = {
        id: 'lease-1',
        owner: 'test-owner',
        workItemId: 'A-01',
        claimId: 'claim-1',
      };
      const record = passingCheckEvidenceFixture({
        root,
        plan: canonicalCheckPlan('checkpoint', ['checkpoint.md']),
        programDefinitionHash: 'd'.repeat(64),
        lease,
      });
      execFileSync('git', ['add', 'checkpoint.md'], { cwd: root });
      execFileSync('git', ['commit', '-m', 'checkpoint'], { cwd: root });
      const terminalHead = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim();
      const bytes = `${JSON.stringify(record)}\n`;
      const hash = createHash('sha256').update(bytes).digest('hex');
      const evidenceDirectory = resolve(
        resolveOperationalDirectory(root),
        'evidence',
      );
      mkdirSync(evidenceDirectory, { recursive: true });
      writeFileSync(resolve(evidenceDirectory, hash), bytes);

      expect(
        classifyAdmittedCheckEvidence({
          reference: `command:sha256:${hash}`,
          workItemId: 'A-01',
          requirementId: 'checkpoint',
          checkStage: 'checkpoint',
          programDefinitionHash: 'd'.repeat(64),
          terminalIdentity: {
            head: terminalHead,
            statusHash: readRepositoryIdentity(root).statusHash,
            claimId: lease.claimId,
            leaseId: lease.id,
            startingHead,
          },
          root,
        }),
      ).toMatchObject({
        classification: 'admitted',
        status: 'passed',
        terminalHead,
      });
      expect(
        classifyCheckEvidence(
          resolve(evidenceDirectory, hash),
          readRepositoryIdentity(root),
          root,
        ).classification,
      ).toBe('stale');
    } finally {
      rmSync(root, { recursive: true, force: true });
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
