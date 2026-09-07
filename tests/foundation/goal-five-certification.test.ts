import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const validator = resolve(
  repositoryRoot,
  'tools/foundation/validate-goal-five-certification.mjs',
);
const canonicalMatrix = JSON.parse(
  readFileSync(
    resolve(repositoryRoot, 'docs/parity/goal-five-certification-matrix.json'),
    'utf8',
  ),
);
const temporaryDirectories: string[] = [];

const runValidator = (matrix: unknown, arguments_: string[] = []) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'viz-goal-five-'));
  temporaryDirectories.push(directory);
  const matrixPath = resolve(directory, 'matrix.json');
  writeFileSync(matrixPath, JSON.stringify(matrix));
  const result = spawnSync(process.execPath, [validator, ...arguments_], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      VIZ_GOAL5_CERTIFICATION_MATRIX: matrixPath,
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout;
};

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    );
});

describe('Goal Five certification matrix', () => {
  it('validates the frozen planning contract', () => {
    const result = JSON.parse(runValidator(canonicalMatrix));

    expect(result).toMatchObject({
      ok: true,
      mode: 'planning',
      goalId: 'goal-five-flagship',
      criterionCount: 46,
      statusCounts: { pending: 46 },
      harnessCounts: { ready: 1, planned: 32, review: 12, human: 1 },
    });
  });

  it('rejects unresolved harnesses during final certification', () => {
    expect(() => runValidator(canonicalMatrix, ['--final'])).toThrow(
      /still has a planned harness in final mode/,
    );
  });

  it('never permits an approved exclusion for a mandatory criterion', () => {
    const matrix = structuredClone(canonicalMatrix);
    matrix.criteria[0].status = 'approved-exclusion';
    matrix.criteria[0].evidence = ['docs/current-state.md'];

    expect(() => runValidator(matrix)).toThrow(
      /cannot exclude a mandatory obligation/,
    );
  });
});

// Synthetic observation receipts exercise admission, not actual creative merit.
const createReviewFixture = (
  criterionId = 'production.final-creative-coherence',
) => {
  const parent = resolve(repositoryRoot, '.artifacts/test-review');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(resolve(parent, 'case-'));
  temporaryDirectories.push(directory);
  const artifact = (name: string, content: unknown) => {
    const path = resolve(directory, name);
    const bytes = JSON.stringify(content);
    writeFileSync(path, bytes);
    return {
      path: relative(repositoryRoot, path),
      contentIdentity: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    };
  };
  const matrix = structuredClone(canonicalMatrix);
  const criterion = matrix.criteria.find(
    (entry: { id: string }) => entry.id === criterionId,
  );
  const candidate = matrix.identity.phase0RepairCommit;
  matrix.identity.candidateCommit = candidate;
  criterion.status = 'passed';
  const architecture = criterion.evaluation.kind === 'architecture-review';
  const inspector = architecture
    ? 'independent-architect'
    : 'independent-visual';
  const projectIdentity = `sha256:${'a'.repeat(64)}`;
  const manifest = artifact('execution.json', {
    schemaVersion: 1,
    kind: 'viz.execution-manifest.v1',
    project: {
      projectId: 'fixture-project',
      schemaVersion: '2',
      contentIdentity: projectIdentity,
    },
    runtime: { packageId: '@viz-engine/runtime', version: '0.1.0' },
    capabilityPacks: [],
    components: [],
    nodePackages: [],
    renderer: {
      package: { packageId: '@viz-engine/renderer-three', version: '0.1.0' },
      backend: { id: 'three', version: '0.164.1' },
      programs: [],
    },
    bakes: [],
    assets: [],
    artifacts: [],
  });
  const observationArtifact = artifact('observation.json', {
    fixture: 'synthetic inspection receipt',
  });
  const inspection = (kind: string) => ({
    kind,
    artifact: kind === 'execution-manifest' ? manifest : observationArtifact,
    reviewerId: inspector,
    observation:
      'Inspected exact fixture coverage and documented its bounded result.',
    frames: Array.from({ length: 2880 }, (_, index) => index),
    range: [0, 2880],
  });
  const packet = {
    schemaVersion: 1,
    kind: 'goal-five-delegated-review',
    criterionId,
    gateOneDecision:
      'decision:goal-five-phase-1-treatment/human-5c26efca-6d77-443c-8e3c-bbc3ef3cca28',
    records: criterion.evaluation.reviewGates.map((gate: number) => ({
      gate,
      implementationCommit: candidate,
      environment: criterion.environment,
      projectRevision: 7,
      projectContentIdentity: projectIdentity,
      reviewedAt: '2026-09-07T02:40:00.000Z',
      builder: 'builder',
      outcome: 'passed',
      rationale:
        'The prescribed fixture observations support the criterion within their stated scope.',
      reviewers: [
        {
          id: inspector,
          role: architecture ? 'architecture' : 'visual',
          findings: 'Inspected the exact fixture observations.',
        },
        {
          id: 'independent-checker',
          role: 'acceptance',
          findings: 'Independently checked scope and rejection cases.',
        },
      ],
      defects: [] as {
        description: string;
        status: string;
        resolution: string;
      }[],
      uncertainties: [],
      inspections: (architecture
        ? ['candidate-diff', 'ownership-report']
        : [
            'execution-manifest',
            'still',
            'motion',
            'audio-analysis',
            'musical-map',
            'prior-production-comparison',
            'whole-skeleton',
            'reopened-project',
            'final-media-probe',
          ]
      ).flatMap((kind) => [
        inspection(kind),
        { ...inspection(kind), reviewerId: 'independent-checker' },
      ]),
    })),
  };
  const save = () => {
    criterion.reviewEvidence = artifact('review.json', packet);
    criterion.evidence = [criterion.reviewEvidence.path];
    return matrix;
  };
  return {
    matrix,
    criterion,
    packet,
    save,
    observationArtifact,
    manifest,
    artifact,
  };
};

describe('delegated creative review admission', () => {
  it('accepts complete typed receipts while keeping creative merit a separate judgment', () => {
    expect(
      JSON.parse(runValidator(createReviewFixture().save())).statusCounts
        .passed,
    ).toBe(1);
  });

  it('requires both independent reviewers to inspect the complete evidence', () => {
    const fixture = createReviewFixture();
    fixture.packet.records[0].inspections =
      fixture.packet.records[0].inspections.filter(
        (entry: { reviewerId: string }) =>
          entry.reviewerId !== 'independent-checker',
      );
    expect(() => runValidator(fixture.save())).toThrow(
      /coverage for acceptance reviewer/,
    );
  });

  it('rejects string frame coverage and preserves protocol frames beyond the treatment sheet', () => {
    const fixture = createReviewFixture();
    const still = fixture.packet.records[0].inspections.find(
      (entry: { kind: string }) => entry.kind === 'still',
    );
    still.frames = still.frames.join(',');
    expect(() => runValidator(fixture.save())).toThrow(
      /still frames must be an array/,
    );
    still.frames = Array.from({ length: 2880 }, (_, frame) => frame).filter(
      (frame) => frame !== 405,
    );
    expect(() => runValidator(fixture.save())).toThrow(
      /missing inspected still coverage/,
    );
  });

  it('rejects a substitute flat execution manifest and wrong review environment', () => {
    const fixture = createReviewFixture();
    const substitute = fixture.artifact('substitute.json', {
      implementationCommit: fixture.matrix.identity.candidateCommit,
      environment: fixture.criterion.environment,
      projectRevision: 7,
      projectContentIdentity: `sha256:${'a'.repeat(64)}`,
    });
    const inspections = fixture.packet.records[0].inspections.filter(
      (entry: { kind: string }) => entry.kind === 'execution-manifest',
    );
    inspections.forEach((entry: { artifact: unknown }) => {
      entry.artifact = substitute;
    });
    expect(() => runValidator(fixture.save())).toThrow(
      /canonical execution manifest does not match/,
    );
    inspections.forEach((entry: { artifact: unknown }) => {
      entry.artifact = fixture.manifest;
    });
    fixture.packet.records[0].environment = 'wrong-environment';
    expect(() => runValidator(fixture.save())).toThrow(
      /wrong review environment/,
    );
  });

  it('requires both reviewers to inspect the same execution identity', () => {
    const fixture = createReviewFixture();
    const differentRenderer = JSON.parse(
      readFileSync(resolve(repositoryRoot, fixture.manifest.path), 'utf8'),
    );
    differentRenderer.renderer.backend.id = 'different-backend';
    const alternative = fixture.artifact(
      'other-execution.json',
      differentRenderer,
    );
    fixture.packet.records[0].inspections.find(
      (entry: { kind: string; reviewerId: string }) =>
        entry.kind === 'execution-manifest' &&
        entry.reviewerId === 'independent-checker',
    ).artifact = alternative;
    expect(() => runValidator(fixture.save())).toThrow(
      /one execution-manifest identity/,
    );
  });

  it('requires typed evidence for a passed delegated criterion', () => {
    const fixture = createReviewFixture();
    expect(() => runValidator(fixture.matrix)).toThrow(
      /requires typed review evidence/,
    );
  });

  it.each(['still', 'motion', 'audio-analysis', 'reopened-project'])(
    'rejects generated but uninspected %s',
    (kind) => {
      const fixture = createReviewFixture();
      fixture.packet.records[0].inspections =
        fixture.packet.records[0].inspections.filter(
          (entry: { kind: string }) => entry.kind !== kind,
        );
      expect(() => runValidator(fixture.save())).toThrow(
        new RegExp(`missing inspected ${kind}`),
      );
    },
  );

  it('rejects a favorable frame in place of the prescribed set', () => {
    const fixture = createReviewFixture();
    fixture.packet.records[0].inspections.find(
      (entry: { kind: string }) => entry.kind === 'still',
    ).frames = [2655];
    expect(() => runValidator(fixture.save())).toThrow(
      /missing inspected still coverage/,
    );
  });

  it('rejects source presence and numeric scores as review evidence', () => {
    const fixture = createReviewFixture();
    fixture.packet.records[0].rationale = 0.99;
    expect(() => runValidator(fixture.save())).toThrow(
      /rationale needs inspection prose/,
    );
    fixture.packet.records[0].rationale = 'Source code exists.';
    fixture.packet.records[0].inspections = [];
    expect(() => runValidator(fixture.save())).toThrow(
      /missing inspected execution-manifest/,
    );
  });

  it('rejects self-only review, unresolved defects and missing temporal coverage', () => {
    const fixture = createReviewFixture();
    fixture.packet.records[0].reviewers[0].id = 'builder';
    expect(() => runValidator(fixture.save())).toThrow(/self-only review/);
    fixture.packet.records[0].reviewers[0].id = 'independent-visual';
    fixture.packet.records[0].defects.push({
      description: 'Visible popping',
      status: 'open',
      resolution: 'Pending refinement',
    });
    expect(() => runValidator(fixture.save())).toThrow(
      /unresolved review defect/,
    );
    fixture.packet.records[0].defects = [];
    fixture.packet.records[0].inspections.find(
      (entry: { kind: string }) => entry.kind === 'motion',
    ).range = [2205, 2880];
    expect(() => runValidator(fixture.save())).toThrow(
      /missing inspected motion coverage/,
    );
  });

  it('rejects stale artifacts, mismatched project identity and wrong final candidate', () => {
    const fixture = createReviewFixture();
    fixture.packet.records[0].projectContentIdentity = `sha256:${'b'.repeat(64)}`;
    expect(() => runValidator(fixture.save())).toThrow(
      /manifest does not match/,
    );
    fixture.packet.records[0].projectContentIdentity = `sha256:${'a'.repeat(64)}`;
    fixture.packet.records[0].implementationCommit =
      fixture.matrix.identity.planningBaseline;
    expect(() => runValidator(fixture.save())).toThrow(
      /final review must inspect the exact candidate/,
    );
    fixture.packet.records[0].implementationCommit =
      fixture.matrix.identity.candidateCommit;
    const matrix = fixture.save();
    writeFileSync(
      resolve(repositoryRoot, fixture.observationArtifact.path),
      'changed',
    );
    expect(() => runValidator(matrix)).toThrow(/stale artifact identity/);
  });

  it('preserves Gate 1 authority and all delegated calibration records', () => {
    const fixture = createReviewFixture('evidence.human-calibration-decisions');
    expect(() => runValidator(fixture.save())).not.toThrow();
    fixture.packet.gateOneDecision = 'inferred approval';
    expect(() => runValidator(fixture.save())).toThrow(/wrong Gate 1 decision/);
    fixture.packet.gateOneDecision =
      'decision:goal-five-phase-1-treatment/human-5c26efca-6d77-443c-8e3c-bbc3ef3cca28';
    fixture.packet.records.pop();
    expect(() => runValidator(fixture.save())).toThrow(
      /missing or duplicate calibration/,
    );
  });

  it('admits architecture review without requiring unrelated visual evidence', () => {
    expect(() =>
      runValidator(
        createReviewFixture('workflow.no-agent-shadow-semantics').save(),
      ),
    ).not.toThrow();
  });

  it('cannot relabel delegated judgment as an automated pass or new human gate', () => {
    const matrix = structuredClone(canonicalMatrix);
    const criterion = matrix.criteria.find(
      (entry: { id: string }) =>
        entry.id === 'production.final-creative-coherence',
    );
    criterion.evaluation.harness = 'human';
    expect(() => runValidator(matrix)).toThrow(
      /cannot introduce a post-treatment human gate/,
    );
    criterion.evaluation = {
      kind: 'automated',
      harness: 'planned',
      command: 'pnpm test:foundation',
      evaluator: 'automated-validator',
    };
    expect(() => runValidator(matrix)).toThrow(
      /must retain independent delegated review/,
    );
    const gateOneMatrix = structuredClone(canonicalMatrix);
    const treatment = gateOneMatrix.criteria.find(
      (entry: { id: string }) =>
        entry.id === 'evidence.treatment-and-musical-map',
    );
    treatment.evaluation.harness = 'review';
    expect(() => runValidator(gateOneMatrix)).toThrow(
      /Gate 1 must retain explicit human authority/,
    );
  });
});
