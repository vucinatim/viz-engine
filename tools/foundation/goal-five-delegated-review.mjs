import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

// This is the approved historical input, not a new human decision store.
export const gateOneDecision =
  'decision:goal-five-phase-1-treatment/human-5c26efca-6d77-443c-8e3c-bbc3ef3cca28';
export const gateOnePacket = {
  path: 'docs/parity/evidence/artifacts/2026-09-06-goal-five-gate-one-review-packet.json',
  contentIdentity:
    'sha256:249618da53da44a6c790cd1bb572748d360c408b33b463e40761ed7673b2c400',
};
export const approvedTreatment = {
  path: 'docs/parity/evidence/artifacts/2026-09-05-goal-five-production-treatment-manifest.json',
  contentIdentity:
    'sha256:cf65ee4f7dab2cc36d5a502fbc3ae37cd60e08a2d72a2e73df175100e86723a2',
};

export const delegatedReviewCriteria = new Map([
  ['production.model-backed-authored-animation', 'creative-review'],
  ['production.procedural-spatial-3d', 'creative-review'],
  ['production.shader-particle-instancing', 'creative-review'],
  ['production.complementary-media', 'creative-review'],
  ['production.compositor-camera-hierarchy', 'creative-review'],
  ['production.macro-phrase-detail-reactivity', 'creative-review'],
  ['production.final-creative-coherence', 'creative-review'],
  ['editor.project-legibility', 'creative-review'],
  ['evidence.human-calibration-decisions', 'creative-review'],
  ['workflow.no-agent-shadow-semantics', 'architecture-review'],
  ['reusable.promotion-evidence', 'architecture-review'],
  ['reusable.cleanup-and-deletion', 'architecture-review'],
]);

const fail = (message) => {
  throw new Error(`Delegated review: ${message}`);
};
const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim())
    fail(`${label} needs inspection prose`);
};
const list = (value, label) => {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
};

export const readReviewArtifact = (root, artifact) => {
  if (
    typeof artifact?.path !== 'string' ||
    isAbsolute(artifact.path) ||
    artifact.path.split(/[\\/]/u).includes('..')
  ) {
    fail('artifact needs a safe repository-relative path');
  }
  const path = realpathSync(resolve(root, artifact.path));
  const local = relative(realpathSync(root), path);
  if (local.startsWith('..') || isAbsolute(local))
    fail('artifact escapes repository');
  const bytes = readFileSync(path);
  const identity = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (identity !== artifact.contentIdentity)
    fail(`stale artifact identity: ${artifact.path}`);
  return bytes;
};

export const reviewCoverage = (treatment, gate) => {
  const { frameStart, frameEndExclusive } = treatment.music.local;
  const frames = [
    ...new Set([
      frameStart,
      frameEndExclusive - 1,
      ...treatment.review.stillFrames.map((entry) => entry.localFrame),
      ...treatment.acts.map(({ range }) =>
        Math.floor((range.localFrameStart + range.localFrameEndExclusive) / 2),
      ),
      ...treatment.transitions.flatMap((entry) =>
        Object.values(entry.reviewFrames),
      ),
    ]),
  ].sort((a, b) => a - b);
  // Gate 2 calibrates the approved representative passage, not final quality
  // across the whole skeleton. Later gates inspect the complete production.
  const range =
    gate === 2 ? [2205, frameEndExclusive] : [frameStart, frameEndExclusive];
  return {
    frames: frames.filter((frame) => frame >= range[0] && frame < range[1]),
    motion: treatment.review.motionWindows
      .map(({ range: window }) => [
        window.localFrameStart,
        window.localFrameEndExclusive,
      ])
      .filter((window) => gate !== 2 || window[1] > range[0]),
    range,
  };
};

export const validateDelegatedReview = ({
  root,
  criterion,
  candidateCommit,
  isAncestor,
}) => {
  const evidence = criterion.reviewEvidence;
  if (!evidence) fail(`${criterion.id} requires typed review evidence`);
  if (!criterion.evidence.includes(evidence.path))
    fail('review evidence must be linked by the criterion');
  const packet = JSON.parse(readReviewArtifact(root, evidence));
  readReviewArtifact(root, gateOnePacket);
  const treatment = JSON.parse(readReviewArtifact(root, approvedTreatment));
  if (
    packet.schemaVersion !== 1 ||
    packet.kind !== 'goal-five-delegated-review' ||
    packet.criterionId !== criterion.id
  ) {
    fail('wrong review schema or criterion identity');
  }
  if (packet.gateOneDecision !== gateOneDecision)
    fail('wrong Gate 1 decision identity');
  const records = list(packet.records, 'records');
  const gates = criterion.evaluation.reviewGates;
  if (
    records.length !== gates.length ||
    gates.some(
      (gate) => records.filter((record) => record.gate === gate).length !== 1,
    )
  ) {
    fail('missing or duplicate calibration gates');
  }
  for (const record of records) {
    if (
      !/^[0-9a-f]{40}$/u.test(record.implementationCommit) ||
      !isAncestor(record.implementationCommit, candidateCommit)
    ) {
      fail('review implementation must belong to the candidate history');
    }
    if (record.gate === 5 && record.implementationCommit !== candidateCommit)
      fail('final review must inspect the exact candidate');
    if (record.environment !== criterion.environment)
      fail('wrong review environment');
    if (record.outcome !== 'passed') fail('review requires refinement');
    if (!Number.isFinite(Date.parse(record.reviewedAt)))
      fail('review date is missing');
    text(record.builder, 'builder');
    text(record.rationale, 'criterion rationale');
    const reviewers = list(record.reviewers, 'reviewers');
    const roles =
      criterion.evaluation.kind === 'architecture-review'
        ? ['architecture', 'acceptance']
        : ['visual', 'acceptance'];
    if (
      reviewers.length !== roles.length ||
      new Set(reviewers.map((reviewer) => reviewer.id)).size !==
        reviewers.length
    )
      fail('reviewers must be independent');
    for (const role of roles) {
      const reviewer = reviewers.find((entry) => entry.role === role);
      text(reviewer?.id, `${role} reviewer`);
      if (reviewer.id === record.builder)
        fail('self-only review is not independent');
      text(reviewer.findings, `${role} findings`);
    }
    for (const defect of list(record.defects, 'defects')) {
      text(defect.description, 'defect');
      text(defect.resolution, 'defect resolution');
      if (defect.status !== 'resolved') fail('unresolved review defect');
    }
    for (const uncertainty of list(record.uncertainties, 'uncertainties')) {
      text(uncertainty.description, 'uncertainty');
      text(uncertainty.disposition, 'uncertainty disposition');
      if (uncertainty.blocksAcceptance !== false)
        fail('unresolved acceptance uncertainty');
    }
    const inspections = list(record.inspections, 'inspections');
    for (const inspection of inspections) {
      text(inspection.observation, 'artifact inspection');
      const frameEnd = treatment.music.local.frameEndExclusive;
      if (
        inspection.kind === 'still' &&
        (!Array.isArray(inspection.frames) ||
          !inspection.frames.length ||
          inspection.frames.some(
            (frame) =>
              !Number.isSafeInteger(frame) || frame < 0 || frame >= frameEnd,
          ))
      ) {
        fail('still frames must be an array of in-range integers');
      }
      if (
        ['motion', 'audio-analysis'].includes(inspection.kind) &&
        (!Array.isArray(inspection.range) ||
          inspection.range.length !== 2 ||
          !inspection.range.every(Number.isSafeInteger) ||
          inspection.range[0] < 0 ||
          inspection.range[1] > frameEnd ||
          inspection.range[0] >= inspection.range[1])
      ) {
        fail(
          'motion and audio ranges must be valid in-range integer intervals',
        );
      }
      readReviewArtifact(root, inspection.artifact);
      if (!reviewers.some((reviewer) => reviewer.id === inspection.reviewerId))
        fail('inspection needs a named independent reviewer');
    }
    const manifestIdentities = new Set(
      inspections
        .filter((entry) => entry.kind === 'execution-manifest')
        .map((entry) => entry.artifact.contentIdentity),
    );
    if (manifestIdentities.size > 1)
      fail('reviewers must inspect one execution-manifest identity');
    for (const reviewer of reviewers) {
      const requireInspection = (kind, predicate = () => true) => {
        const found = inspections.find(
          (entry) =>
            entry.reviewerId === reviewer.id &&
            entry.kind === kind &&
            predicate(entry),
        );
        if (!found)
          fail(
            `missing inspected ${kind} coverage for ${reviewer.role} reviewer`,
          );
        return found;
      };
      if (criterion.evaluation.kind === 'architecture-review') {
        requireInspection('candidate-diff');
        requireInspection('ownership-report');
        continue;
      }
      const manifestInspection = requireInspection('execution-manifest');
      const manifest = JSON.parse(
        readReviewArtifact(root, manifestInspection.artifact),
      );
      if (
        manifest.kind !== 'viz.execution-manifest.v1' ||
        manifest.schemaVersion !== 1 ||
        manifest.project?.contentIdentity !== record.projectContentIdentity
      ) {
        fail('canonical execution manifest does not match reviewed project');
      }
      if (
        !Number.isSafeInteger(record.projectRevision) ||
        record.projectRevision < 0 ||
        !/^sha256:[0-9a-f]{64}$/u.test(record.projectContentIdentity)
      ) {
        fail('review needs exact project revision and content identity');
      }
      // The canonical production manifest owns execution inputs; this review only
      // binds its bytes and project identity rather than defining another manifest.
      const coverage = reviewCoverage(treatment, record.gate);
      for (const frame of coverage.frames) {
        requireInspection('still', (entry) => entry.frames?.includes(frame));
      }
      const covers = (entry, range) =>
        Array.isArray(entry.range) &&
        entry.range.length === 2 &&
        entry.range.every(Number.isSafeInteger) &&
        entry.range[0] <= range[0] &&
        entry.range[1] >= range[1];
      for (const range of coverage.motion)
        requireInspection('motion', (entry) => covers(entry, range));
      requireInspection('motion', (entry) => covers(entry, coverage.range));
      requireInspection('audio-analysis', (entry) =>
        covers(entry, coverage.range),
      );
      requireInspection('musical-map');
      requireInspection('prior-production-comparison');
      if (record.gate === 2) requireInspection('whole-skeleton');
      if (record.gate >= 3) requireInspection('reopened-project');
      if (record.gate === 5) requireInspection('final-media-probe');
    }
  }
};
