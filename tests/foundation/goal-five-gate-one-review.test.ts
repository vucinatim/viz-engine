import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildGateOneReviewPacket,
  renderGateOneDecisionRequest,
  validateGateOneReviewPacket,
  validatePendingHumanRequest,
} from '../../tools/foundation/author-goal-five-gate-one-review';

const inputs = {
  treatment: JSON.parse(
    readFileSync(
      'docs/parity/evidence/artifacts/2026-09-05-goal-five-production-treatment-manifest.json',
      'utf8',
    ),
  ),
};

function build() {
  return buildGateOneReviewPacket(inputs, 'sha256:test-generator');
}

function queueItem(packet = build(), overrides: Record<string, unknown> = {}) {
  return {
    id: 'human-test',
    status: 'pending' as const,
    question: packet.humanRequest.question,
    whyAutomationIsInsufficient:
      packet.humanRequest.whyAutomationIsInsufficient,
    artifact: 'document:sha256:test-request',
    recommendation: packet.humanRequest.recommendation,
    alternatives: [...packet.humanRequest.alternatives],
    safeWhileWaiting: [...packet.humanRequest.safeWhileWaiting],
    prohibitedWhileWaiting: [...packet.humanRequest.prohibitedWhileWaiting],
    blockedWorkItemIds: [...packet.humanRequest.blockedWorkItemIds],
    safeWorkItemIds: [...packet.humanRequest.safeWorkItemIds],
    createdAt: '2026-09-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('Goal Five Gate 1 review', () => {
  it('binds all Phase 1 evidence, exact treatment breadth, and the pending human boundary', () => {
    const packet = build();
    expect(() => validateGateOneReviewPacket(packet, inputs)).not.toThrow();
    expect(packet.evidence.map(({ checkpoint }) => checkpoint)).toEqual([
      'P1-01',
      'P1-02',
      'P1-03',
      'P1-04',
      'P1-05',
    ]);
    expect(packet.proposal.composition.layers).toHaveLength(9);
    expect(packet.proposal.composition.graphIds).toHaveLength(7);
    expect(packet.proposal.gaps).toHaveLength(3);
    expect(packet.humanRequest.blockedWorkItemIds).toEqual(['G1-01']);
    expect(packet.humanRequest.safeWorkItemIds).toEqual([]);
  });

  it('rejects stale identities and deterministic packet substitutions', () => {
    const expected = build();
    const stale = structuredClone(expected);
    stale.evidence[0]!.artifactIdentity = 'sha256:stale';
    expect(() => validateGateOneReviewPacket(stale, inputs)).toThrow(
      'Content identity drifted',
    );

    const substituted = structuredClone(expected);
    substituted.assumptionsRequiringHumanJudgment[0] = 'different';
    expect(() =>
      validateGateOneReviewPacket(substituted, inputs, expected),
    ).toThrow('deterministic blueprint');
  });

  it('rejects missing human judgments, alternatives, gaps, and waiting boundaries', () => {
    const cases = [
      (packet: ReturnType<typeof build>) =>
        (packet.assumptionsRequiringHumanJudgment = []),
      (packet: ReturnType<typeof build>) =>
        (packet.humanRequest.alternatives = []),
      (packet: ReturnType<typeof build>) => (packet.proposal.gaps = []),
      (packet: ReturnType<typeof build>) =>
        (packet.humanRequest.prohibitedWhileWaiting = []),
    ];
    for (const mutate of cases) {
      const packet: any = structuredClone(build());
      mutate(packet);
      expect(() => validateGateOneReviewPacket(packet, inputs)).toThrow();
    }
  });

  it('rejects current-output claims and planned-review observations', () => {
    const currentOutput: any = structuredClone(build());
    currentOutput.visualReferences[0].classification =
      'current-human-signal-output';
    expect(() => validateGateOneReviewPacket(currentOutput, inputs)).toThrow(
      'classification',
    );

    const fakeFrame: any = structuredClone(build());
    fakeFrame.visualEvidenceBoundary.currentHumanSignalOutputs.push(
      'frame-60.png',
    );
    expect(() => validateGateOneReviewPacket(fakeFrame, inputs)).toThrow(
      'Prior work',
    );

    const observedPlan: any = structuredClone(build());
    observedPlan.proposal.reviewPlan.phaseTwoStrategy =
      'observed render proves quality';
    expect(() => validateGateOneReviewPacket(observedPlan, inputs)).toThrow(
      'must not be represented',
    );
  });

  it('derives the exact request from the packet without recording approval', () => {
    const packet = build();
    const request = renderGateOneDecisionRequest(packet, 'sha256:test-packet');
    expect(request).toContain('pending explicit product-owner decision');
    expect(request).toContain('No Human Signal frame, project, or prototype');
    expect(request).toContain('`G1-01` is the sole blocked work item');
    expect(request).toContain('this document does not record a decision');
  });

  it('requires exactly one pending, identity-bound, correctly scoped queue item', () => {
    const packet = build();
    const item = queueItem(packet);
    expect(() =>
      validatePendingHumanRequest(packet, 'sha256:test-request', [item]),
    ).not.toThrow();
    expect(() =>
      validatePendingHumanRequest(packet, 'sha256:test-request', []),
    ).toThrow('Exactly one');
    expect(() =>
      validatePendingHumanRequest(packet, 'sha256:test-request', [item, item]),
    ).toThrow('Exactly one');
    expect(() =>
      validatePendingHumanRequest(packet, 'sha256:test-request', [
        queueItem(packet, { status: 'resolved' }),
      ]),
    ).toThrow('must remain pending');
    expect(() =>
      validatePendingHumanRequest(packet, 'sha256:test-request', [
        queueItem(packet, { blockedWorkItemIds: ['P1-06'] }),
      ]),
    ).toThrow('blockedWorkItemIds drifted');
    expect(() =>
      validatePendingHumanRequest(packet, 'sha256:other', [item]),
    ).toThrow('Exactly one');
  });
});
