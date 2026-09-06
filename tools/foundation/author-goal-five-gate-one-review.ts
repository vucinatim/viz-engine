import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

import {
  HumanValidationItem,
  readHumanValidationQueue,
} from '../repo/lib/human-validation';

const PACKET_PATH =
  'docs/parity/evidence/artifacts/2026-09-06-goal-five-gate-one-review-packet.json';
const REQUEST_PATH =
  'docs/parity/evidence/2026-09-06-goal-five-gate-one-decision-request.md';
const SOURCE_BASELINE_COMMIT = '6255e7b23369118427753c4c7d5d3f21d1027b70';

const EVIDENCE = [
  {
    checkpoint: 'P1-01',
    role: 'authorized-input inventory',
    artifact:
      'docs/parity/evidence/artifacts/2026-09-04-goal-five-authorized-input-inventory.json',
    artifactIdentity:
      'sha256:d16b54aafac465326d867e2931647f49c90c07b9785c8d692642d69dd22c705d',
    review:
      'docs/parity/evidence/2026-09-04-goal-five-authorized-input-audit.md',
    reviewIdentity:
      'sha256:b33ce4ae3489d688c7359179ed3b58ad615c8a21e0fa868e82a2a39e8d7a47e7',
  },
  {
    checkpoint: 'P1-02',
    role: 'capability and observation audit',
    artifact:
      'docs/parity/evidence/artifacts/2026-09-04-goal-five-capability-catalog.json',
    artifactIdentity:
      'sha256:b1fcf990b8d45f4524f4051e16a5823dd46744f87db7b9c8b0f35b31606bff1e',
    review:
      'docs/parity/evidence/2026-09-04-goal-five-capability-boundary-review.md',
    reviewIdentity:
      'sha256:d0dad181201ddf6f35017b664b19f1d0538f27c31198ef1c30fdef50e47a34b3',
  },
  {
    checkpoint: 'P1-03',
    role: 'exact source-audio analysis and candidate windows',
    artifact:
      'docs/parity/evidence/artifacts/2026-09-04-goal-five-music-window-analysis.json',
    artifactIdentity:
      'sha256:e94ef2932f0ddd28f730711111e14d6d35ff952bc3328905f1e89dd6bb6657cc',
    review:
      'docs/parity/evidence/2026-09-04-goal-five-music-window-comparison.md',
    reviewIdentity:
      'sha256:13a33d40431d8e1982dc0cb5645ccc660d69e4e4479a69cb1013cfbcb99b1e5e',
  },
  {
    checkpoint: 'P1-04',
    role: 'frame-exact proposed musical map',
    artifact:
      'docs/parity/evidence/artifacts/2026-09-05-goal-five-frame-exact-musical-map.json',
    artifactIdentity:
      'sha256:164395d23891a091d9374c48d3462c9b30ee8ac4aac4ac4c6dfe68f700568a55',
    review:
      'docs/parity/evidence/2026-09-05-goal-five-frame-exact-musical-map-review.md',
    reviewIdentity:
      'sha256:c0a624ff615b1262b641b3d99b19d318d622ca736feaad647a2d445b6799b812',
  },
  {
    checkpoint: 'P1-05',
    role: 'proposed flagship production treatment',
    artifact:
      'docs/parity/evidence/artifacts/2026-09-05-goal-five-production-treatment-manifest.json',
    artifactIdentity:
      'sha256:cf65ee4f7dab2cc36d5a502fbc3ae37cd60e08a2d72a2e73df175100e86723a2',
    review: 'docs/plans/v2/goal-five-flagship-production-treatment.md',
    reviewIdentity:
      'sha256:f5ebffe3fb683f62f497a31e3860b0efd93164fb924cae15752444adcb827c9a',
  },
] as const;

const VISUAL_REFERENCES = [
  {
    id: 'afterlight-human-stage-baseline',
    path: 'public/productions/afterlight-assembly/renders/afterlight-assembly-contact-sheet.jpeg',
    contentIdentity:
      'sha256:fad1dc12d81894b6b39d34c75d5b9e95f00c12a8361289255fcc80cae7a1fcce',
    dimensions: { width: 2584, height: 728 },
    priorProduction: 'afterlight-assembly',
    demonstrates:
      'Existing model-backed Stage Scene quality, human anchors, venue lighting, and cinematic camera range.',
    doesNotDemonstrate:
      'Human Signal composition, selected music, timing, graph behavior, layer interaction, performance, or final quality.',
    classification: 'prior-production-existing-capability-reference',
  },
  {
    id: 'signal-cathedral-procedural-language',
    path: 'public/productions/signal-cathedral/renders/signal-cathedral-final-contact-sheet.jpg',
    contentIdentity:
      'sha256:852419d591a4139b31f5e43071f3512d3b1dee028932b23701d389cb4c5ff372',
    dimensions: { width: 2572, height: 724 },
    priorProduction: 'signal-cathedral',
    demonstrates:
      'Existing procedural spatial, luminous material, negative-space, and palette vocabulary.',
    doesNotDemonstrate:
      'Human Signal composition, selected music, timing, graph behavior, layer interaction, performance, or final quality.',
    classification: 'prior-production-existing-capability-reference',
  },
] as const;

const HUMAN_REQUEST = {
  question:
    'Do you approve the exact Human Signal treatment and authorize its Phase 2 successor, or do you request one bounded Phase 1 treatment revision with the required changes stated exactly?',
  whyAutomationIsInsufficient:
    'Automated evidence can prove identities, ranges, capability references, derivation, and queue scope, but cannot judge musical truth, emotional coherence, visual taste, performer value, or whether the proposed reusable gaps are worth building.',
  recommendation:
    'Approve the exact Human Signal treatment and authorize Phase 2 from the content-addressed P1-01 through P1-06 evidence.',
  alternatives: [
    'Request one bounded Phase 1 treatment revision and state the exact musical, visual, scope, or gap changes required.',
    'Do not select the Stage-only, procedural-monolith, or falsely shared-Three-world directions; they fail the accepted breadth or architecture constraints.',
  ],
  safeWhileWaiting: [
    'Read-only inspection, product-owner discussion, and correction of demonstrably incorrect evidence only.',
  ],
  prohibitedWhileWaiting: [
    'Do not activate Phase 2 or begin deep aesthetic implementation.',
    'Do not add production-local components or build GAP-01 through GAP-03.',
    'Do not resolve this human decision autonomously or treat silence, discussion, or elapsed time as approval.',
  ],
  blockedWorkItemIds: ['G1-01'],
  safeWorkItemIds: [],
} as const;

type PacketInputs = {
  treatment: any;
};

export type GateOneReviewPacket = ReturnType<typeof buildGateOneReviewPacket>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sha256(contents: string | Buffer): string {
  return `sha256:${createHash('sha256').update(contents).digest('hex')}`;
}

function verifyFile(path: string, identity: string): void {
  assert(
    sha256(readFileSync(path)) === identity,
    `Content identity drifted for ${path}.`,
  );
}

export function buildGateOneReviewPacket(
  { treatment }: PacketInputs,
  generatorContentIdentity = 'sha256:test-generator',
) {
  return {
    schemaVersion: 1,
    kind: 'viz-engine-goal-five-gate-one-treatment-review',
    programId: 'goal-five-phase-1-treatment',
    workItemId: 'P1-06',
    gate: 'Gate 1',
    status: 'pending-explicit-product-owner-decision',
    sourceBaselineCommit: SOURCE_BASELINE_COMMIT,
    generatedBy: {
      path: 'tools/foundation/author-goal-five-gate-one-review.ts',
      contentIdentity: generatorContentIdentity,
    },
    evidence: EVIDENCE,
    proposal: {
      title: treatment.title,
      treatmentStatus: treatment.status,
      music: treatment.music,
      acts: treatment.acts.map(({ id, title, range }: any) => ({
        id,
        title,
        range,
      })),
      composition: {
        layers: treatment.layers.map(({ id, component, role }: any) => ({
          id,
          componentId: component.id,
          role,
        })),
        graphIds: treatment.graphs.map(({ id }: any) => id),
        modelPaths: treatment.models.map(({ path }: any) => path),
      },
      gaps: treatment.gaps.map(
        ({ id, title, smallestReusableChange, canonicalOwners }: any) => ({
          id,
          title,
          smallestReusableChange,
          canonicalOwners,
        }),
      ),
      reviewPlan: treatment.review,
    },
    alternatives: treatment.alternatives,
    assumptionsRequiringHumanJudgment: [
      'The exact 48-second HipHop 808 Rap window is the right creative source, not merely the strongest automated candidate.',
      'The five-act map expresses the perceived musical and emotional structure well enough to direct production.',
      'A human-led stage plus independent compositor-space procedural worlds is coherent rather than a capability sampler.',
      'The ultraviolet, cyan, amber, and near-black palette; luminous material language; and one Stage-owned camera arc are the right taste direction.',
      'All four existing performer models add value and can be grounded, framed, and lit to the required quality.',
      'Excluding standalone raster/image/video for this treatment is creatively acceptable.',
      'GAP-01 through GAP-03 are the smallest worthwhile reusable changes before materializing the production.',
    ],
    unresolvedHumanJudgments: treatment.review.humanQuestions,
    visualReferences: VISUAL_REFERENCES,
    visualEvidenceBoundary: {
      currentHumanSignalOutputs: [],
      statement:
        'No Human Signal frame, project, or prototype exists yet. The references are prior-production capability evidence only; planned P1-05 still frames and motion windows are review targets, not observed renders.',
      falseClaimsRejected: [
        'The references do not prove the proposed nine-layer composition.',
        'The references do not prove timing, reactivity, performance, gaps, or final quality.',
        'The independent Three programs are not one shared spatial world.',
      ],
    },
    humanRequest: HUMAN_REQUEST,
    decisionContract: {
      pending:
        'G1-01 remains blocked and no Phase 2 work is authorized while this request is pending.',
      accepted:
        'Only an explicit product-owner instruction may approve the exact treatment and authorize the Phase 2 successor.',
      boundedRevision:
        'The product owner may request exact bounded changes; continuation then requires the separately governed successor mechanism in G1-01.',
      nonSelection:
        'Rejection or changes_requested is a terminal safe stop until a separately designed and reviewed authority mechanism exists.',
    },
  } as const;
}

export function validateGateOneReviewPacket(
  packet: GateOneReviewPacket,
  inputs: PacketInputs,
  expected?: GateOneReviewPacket,
): void {
  assert(packet.status.includes('pending'), 'Gate 1 must remain pending.');
  assert(
    packet.sourceBaselineCommit === SOURCE_BASELINE_COMMIT,
    'Source baseline commit drifted.',
  );
  assert(packet.evidence.length === 5, 'P1-01 through P1-05 are required.');
  for (const evidence of packet.evidence) {
    verifyFile(evidence.artifact, evidence.artifactIdentity);
    verifyFile(evidence.review, evidence.reviewIdentity);
  }
  assert(
    packet.proposal.title === inputs.treatment.title &&
      packet.proposal.music.windowId === 'hiphop-808-rap-f135-d2880',
    'Treatment identity or selected music drifted.',
  );
  assert(
    packet.proposal.acts.length === 5 &&
      packet.proposal.composition.layers.length === 9 &&
      packet.proposal.composition.graphIds.length === 7 &&
      packet.proposal.gaps.length === 3,
    'Treatment breadth or reusable gaps drifted.',
  );
  assert(
    packet.assumptionsRequiringHumanJudgment.length >= 7 &&
      packet.unresolvedHumanJudgments.length >= 7,
    'Human assumptions or unresolved judgments are incomplete.',
  );
  assert(
    packet.alternatives.length >= 2 &&
      packet.humanRequest.alternatives.length >= 2,
    'Viable treatment alternatives are required.',
  );
  assert(
    packet.humanRequest.blockedWorkItemIds.length === 1 &&
      packet.humanRequest.blockedWorkItemIds[0] === 'G1-01' &&
      packet.humanRequest.safeWorkItemIds.length === 0,
    'G1-01 must be the sole blocked item.',
  );
  assert(
    packet.humanRequest.safeWhileWaiting.length > 0 &&
      packet.humanRequest.prohibitedWhileWaiting.length >= 3,
    'Waiting boundaries are incomplete.',
  );
  assert(
    packet.visualReferences.length === 2 &&
      packet.visualReferences.every(
        ({ path, contentIdentity, classification }) => {
          verifyFile(path, contentIdentity);
          return (
            classification === 'prior-production-existing-capability-reference'
          );
        },
      ),
    'Visual reference identity or classification drifted.',
  );
  assert(
    packet.visualEvidenceBoundary.currentHumanSignalOutputs.length === 0 &&
      packet.visualEvidenceBoundary.statement.startsWith(
        'No Human Signal frame, project, or prototype exists yet.',
      ),
    'Prior work must not be presented as Human Signal output.',
  );
  assert(
    !JSON.stringify(packet.proposal.reviewPlan).includes('observed'),
    'Planned review targets must not be represented as observations.',
  );
  if (expected) {
    assert(
      JSON.stringify(packet) === JSON.stringify(expected),
      'Gate 1 packet differs from the deterministic blueprint.',
    );
  }
}

export function renderGateOneDecisionRequest(
  packet: GateOneReviewPacket,
  packetIdentity: string,
): string {
  const evidence = packet.evidence
    .map(
      ({ checkpoint, role, artifactIdentity, reviewIdentity }) =>
        `- **${checkpoint} ${role}:** artifact \`${artifactIdentity}\`; review \`${reviewIdentity}\`.`,
    )
    .join('\n');
  const references = packet.visualReferences
    .map(
      (reference) =>
        `### ${reference.id}\n\n![${reference.demonstrates}](../../../${reference.path})\n\n- Identity: \`${reference.contentIdentity}\`; ${reference.dimensions.width}×${reference.dimensions.height}.\n- Demonstrates: ${reference.demonstrates}\n- Does not demonstrate: ${reference.doesNotDemonstrate}`,
    )
    .join('\n\n');
  const bullets = (items: readonly string[]) =>
    items.map((item) => `- ${item}`).join('\n');

  return `# Gate 1: Human Signal treatment decision request\n\nStatus: **pending explicit product-owner decision**\n\nMachine packet: [Gate 1 review packet](./artifacts/2026-09-06-goal-five-gate-one-review-packet.json)\n\nPacket content identity: \`${packetIdentity}\`\n\n## Exact decision requested\n\n${packet.humanRequest.question}\n\nRecommendation: ${packet.humanRequest.recommendation}\n\nWhy this remains human-owned: ${packet.humanRequest.whyAutomationIsInsufficient}\n\n## What is proposed\n\n**Human Signal** uses the exact 48-second \`hiphop-808-rap-f135-d2880\` window at 60 fps, five acts, nine responsibility-scoped layers, seven graphs, all four existing Stage performers, three reusable engine gaps, and one Stage-owned camera narrative. Full settings, ranges, graph consumers, risks, review targets, and performance targets remain in the content-addressed P1-05 treatment.\n\n## Bound evidence\n\nSource baseline: \`${packet.sourceBaselineCommit}\`.\n\n${evidence}\n\n## Existing-capability visual references\n\n${packet.visualEvidenceBoundary.statement}\n\n${references}\n\n## Assumptions to judge\n\n${bullets(packet.assumptionsRequiringHumanJudgment)}\n\n## Unresolved creative judgments\n\n${bullets(packet.unresolvedHumanJudgments)}\n\n## Alternatives\n\n${bullets(packet.humanRequest.alternatives)}\n\nThe P1-05 treatment also records the rejected Stage-only, procedural-monolith, and false shared-world directions with their exact reasons.\n\n## Waiting boundary\n\nSafe while pending:\n\n${bullets(packet.humanRequest.safeWhileWaiting)}\n\nProhibited while pending:\n\n${bullets(packet.humanRequest.prohibitedWhileWaiting)}\n\n\`G1-01\` is the sole blocked work item. No other program work is declared safe. Discussion, silence, or elapsed time is not approval, and this document does not record a decision.\n`;
}

export function validatePendingHumanRequest(
  packet: GateOneReviewPacket,
  requestIdentity: string,
  items: HumanValidationItem[],
): HumanValidationItem {
  const expectedArtifact = `document:${requestIdentity}`;
  const matches = items.filter(
    (item) =>
      item.question === packet.humanRequest.question &&
      item.artifact === expectedArtifact,
  );
  assert(
    matches.length === 1,
    'Exactly one matching Gate 1 request is required.',
  );
  const item = matches[0]!;
  assert(item.status === 'pending', 'Gate 1 request must remain pending.');
  const expected = {
    whyAutomationIsInsufficient:
      packet.humanRequest.whyAutomationIsInsufficient,
    recommendation: packet.humanRequest.recommendation,
    alternatives: [...packet.humanRequest.alternatives],
    safeWhileWaiting: [...packet.humanRequest.safeWhileWaiting],
    prohibitedWhileWaiting: [...packet.humanRequest.prohibitedWhileWaiting],
    blockedWorkItemIds: [...packet.humanRequest.blockedWorkItemIds],
    safeWorkItemIds: [...packet.humanRequest.safeWorkItemIds],
  };
  for (const [key, value] of Object.entries(expected)) {
    assert(
      JSON.stringify(item[key as keyof HumanValidationItem]) ===
        JSON.stringify(value),
      `Human request ${key} drifted.`,
    );
  }
  return item;
}

function loadInputs(): PacketInputs {
  for (const evidence of EVIDENCE) {
    verifyFile(evidence.artifact, evidence.artifactIdentity);
    verifyFile(evidence.review, evidence.reviewIdentity);
  }
  for (const reference of VISUAL_REFERENCES) {
    verifyFile(reference.path, reference.contentIdentity);
  }
  return {
    treatment: JSON.parse(readFileSync(EVIDENCE[4].artifact, 'utf8')),
  };
}

async function run(): Promise<void> {
  const inputs = loadInputs();
  const generatorIdentity = sha256(
    readFileSync(fileURLToPath(import.meta.url)),
  );
  const expected = buildGateOneReviewPacket(inputs, generatorIdentity);
  validateGateOneReviewPacket(expected, inputs);
  const packetContents = await format(
    `${JSON.stringify(expected, null, 2)}\n`,
    {
      parser: 'json',
    },
  );
  const packetIdentity = sha256(packetContents);
  const requestContents = await format(
    renderGateOneDecisionRequest(expected, packetIdentity),
    { parser: 'markdown' },
  );
  const requestIdentity = sha256(requestContents);

  if (process.argv.includes('--write')) {
    writeFileSync(PACKET_PATH, packetContents);
    writeFileSync(REQUEST_PATH, requestContents);
    console.log(
      `Wrote ${PACKET_PATH} (${packetIdentity}) and ${REQUEST_PATH} (${requestIdentity}).`,
    );
    return;
  }

  const recorded = JSON.parse(
    readFileSync(PACKET_PATH, 'utf8'),
  ) as GateOneReviewPacket;
  validateGateOneReviewPacket(recorded, inputs, expected);
  assert(
    readFileSync(REQUEST_PATH, 'utf8') === requestContents,
    'Gate 1 request differs from the deterministic packet rendering.',
  );
  if (process.argv.includes('--queue')) {
    const item = validatePendingHumanRequest(
      expected,
      requestIdentity,
      readHumanValidationQueue().items,
    );
    console.log(
      `Validated Gate 1 packet ${packetIdentity}, request ${requestIdentity}, and pending queue item ${item.id}.`,
    );
    return;
  }
  console.log(
    `Validated portable Gate 1 packet ${packetIdentity} and request ${requestIdentity}.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
