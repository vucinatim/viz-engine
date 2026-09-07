# Goal Five Delegated Review Contract

Status: active under the product owner's 2026-09-06 Human Signal delegation.

## Authority and ownership

The [certification matrix](./goal-five-certification-matrix.json) owns the 46
criteria, frozen observation protocols, environments, tolerances and evaluator
assignments. The [review validator](../../tools/foundation/goal-five-delegated-review.mjs)
admits typed evidence through `pnpm goal5:criteria:validate`. The sensory map
reports these assignments; it does not decide creative quality or own a second
review ledger. Product inspection remains with the existing project, session,
audio, runtime, renderer, editor, asset, bundle and export owners.

Gate 1 remains the product owner's explicit decision:

- Program: `goal-five-phase-1-treatment`.
- Decision: `human-5c26efca-6d77-443c-8e3c-bbc3ef3cca28`.
- Outcome: approved, `2026-09-06T14:09:05.252Z`, recorded from the Codex task message
  on 2026-09-06.
- Exact [packet](./evidence/artifacts/2026-09-06-goal-five-gate-one-review-packet.json):
  `sha256:249618da53da44a6c790cd1bb572748d360c408b33b463e40761ed7673b2c400`.
- Exact [treatment manifest](./evidence/artifacts/2026-09-05-goal-five-production-treatment-manifest.json):
  `sha256:cf65ee4f7dab2cc36d5a502fbc3ae37cd60e08a2d72a2e73df175100e86723a2`.

The proposal, generated treatment and decision request retain their historical
pending wording and immutable bytes. Approval lives in the append-only human
record, inspectable with:

```bash
pnpm --silent run repo -- human list --program tools/repo/programs/goal-five-phase-1.json --json
```

Never regenerate approved inputs to pretend that they contained the later
decision. Never invoke `human resolve` without a contemporaneous user instruction
naming the decision. The stable criterion `evidence.human-calibration-decisions`
and lane `creative-human` identify continuing evidence obligations used by
immutable execution definitions; they do not make delegated reviews human gates.

## Mandatory calibration

Gates 2–5 are independent agent judgments. A failed or uncertain judgment requires
refinement and renewed observation, not routine human approval.

| Gate | Required judgment and scope                                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | Assess the complete low-detail skeleton and the approved Act 5 representative passage [2205,2880), including the full transition-4 context [2160,2250), peak and release. Scope quality claims to this passage.                                     |
| 3    | Inspect the full rough cut, every act and transition, macro camera trajectory, musical arc and reopened project. Establish the full content workload without treating one favorable act as approval.                                                |
| 4    | Inspect full motion and prescribed stills for grounding, animation, continuity, camera, exposure, hierarchy, density and three-timescale musical response.                                                                                          |
| 5    | Inspect the exact candidate's full final media [0,2880), intended-audio evidence, prescribed stills and transition/peak/release motion, and the cleanly reopened editable project. Record professional creative coherence and legibility judgments. |

The builder writes the rationale and responds to critique. A separate read-only
visual reviewer and acceptance checker inspect the evidence independently. The
architecture lane uses separate read-only architecture and acceptance reviewers.
Reviewer identity, role, inspection observations and findings are recorded;
self-review alone cannot pass. Reviewer identities are audit attestations, not a
cryptographic proof of separate people or processes.

## Observation and rejection rules

Use all 15 approved treatment stills **and** the matrix protocol's endpoints,
act midpoints and transition pre/mid/post frames. The validator derives their
union from the unchanged treatment. Gate 2 filters stills to its representative
passage; later gates use the complete union. A contact sheet may represent
multiple exact frames, but every required frame must be identified and inspected.

Inspect actual temporal output over each prescribed motion window and the full
claimed passage. Generated files, source code, still sequences without temporal
inspection, one attractive frame and an image score cannot establish motion or
coherence. A full-motion inspection may cover several required windows only when
its observation explicitly addresses those windows and their defects.

Unattended review remains headless and muted. Inspect intended-audio identity,
decoded synchronization, features, envelopes, onsets and their frame-exact musical
map alongside motion. This is delegated musical judgment supported by silent
analysis; never claim an audible listening session occurred. Numeric scores are
supporting diagnostics, not an aesthetic decision. The frozen semantic, image,
audio, performance, lifecycle and parity thresholds remain separate mandatory
proof lanes and are unchanged by this contract.

Compare against the approved treatment and prior productions; record where
Human Signal succeeds or fails in identity, hierarchy, grounding, continuity,
reactive clarity, pacing and editable-project comprehension. Record resolved
defects with their resolution and remaining uncertainty with an explicit
nonblocking disposition. Any unresolved defect or acceptance-blocking uncertainty
requires refinement. No aesthetic uncertainty automatically becomes a human gate.

## Typed evidence

A `review` harness means independent inspection; it is distinct from an automated
`ready` command and a `planned` observation. Pending criteria remain pending.
A passed delegated criterion must link `reviewEvidence: {path, contentIdentity}`
and include that path in its ordinary `evidence` list. The content identity is
SHA-256 of exact file bytes. Evidence paths must stay inside the repository,
including when resolved through symlinks. Reproducible media may live in ignored
artifact directories but must remain available at admission and final validation.

The referenced JSON has:

- `schemaVersion: 1`, `kind: "goal-five-delegated-review"`, `criterionId`.
- `gateOneDecision` equal to
  `decision:goal-five-phase-1-treatment/human-5c26efca-6d77-443c-8e3c-bbc3ef3cca28`.
- `records`: exactly the criterion's `evaluation.reviewGates`. The calibration
  history criterion requires Gates 2, 3, 4 and 5; other delegated criteria require
  final Gate 5 proof of their particular requirement.

Each record contains:

- `gate`, full `implementationCommit`, `environment`, ISO `reviewedAt`, `builder`,
  `outcome: "passed"`, and a criterion-specific prose `rationale`.
- `reviewers`: distinct `{id, role, findings}` entries for `visual` and
  `acceptance`, or `architecture` and `acceptance` for architecture criteria.
  Both reviewer IDs differ from the builder; each reviewer records the complete
  prescribed inspection coverage independently.
- `defects`: `{description, status: "resolved", resolution}` records, or `[]`.
- `uncertainties`: `{description, blocksAcceptance: false, disposition}` records,
  or `[]`; a disposition explains the practical limitation rather than hiding it.
- `inspections`: records with `kind`, hashed `artifact`, `reviewerId` and actual
  inspection prose in `observation`. Each artifact has `path` and
  `contentIdentity`. Still observations add integer `frames`; motion and audio
  analysis add a half-open integer `range`.

Creative records bind `projectContentIdentity` to the existing canonical
`VizExecutionManifest` (`kind: "viz.execution-manifest.v1"`, `schemaVersion: 1`,
`project.contentIdentity`). Commit, review environment and live `projectRevision`
belong to review context; they are not added to the portable manifest. The
existing bundle validator and runtime, renderer, capability, asset and artifact
owners retain all execution semantics. Both reviewers must inspect the same
execution-manifest content identity for each gate. Reviewers inspect canonical bundle
validation and manifest contents, not a four-field substitute manifest.

Creative inspection kinds required at every gate are `execution-manifest`,
`still`, `motion`, `audio-analysis`, `musical-map`, and
`prior-production-comparison`. Gate 2 adds `whole-skeleton`; Gates 3–5 add
`reopened-project`; Gate 5 adds `final-media-probe`. Architecture records require
`candidate-diff` and `ownership-report` without irrelevant visual requirements.
All artifacts have verified byte identities and named independent inspectors.

Earlier calibration commits must be ancestors of candidate `C`. Gate 5 must
inspect exactly `C`. Any candidate change invalidates the final reviews. The
validator rejects stale bytes, wrong project/environment/candidate, missing gates
or coverage, absent prose, self-only review and unresolved defects. It cannot
prove that prose is truthful, infer artifact semantics from a filename, or judge
artistic merit: independent acceptance review must reject fabricated, irrelevant,
score-only or uninspected evidence even if its JSON is structurally valid.

## Human stop boundary

Request one concrete human decision only before:

- the hosted platform, cloud/collaboration service or production Magnify horizon;
- pricing, monetization, licensing policy, commercial packaging or paid-service
  commitments;
- an external action without separate authority, including deployment,
  publication, purchase, production mutation, merge, PR, tag or release;
- a material north-star change or intentional capability, parity, quality or
  performance regression;
- unsafe overlap with ambiguous user work that cannot be isolated.

All reversible local creative, architecture, dependency, language, renderer,
editor, tooling, validation, file, asset and export decisions inside the engine
horizon remain delegated. Unavailable observations call for the smallest reusable
observation improvement at the owning boundary. The completed-engine handoff
precedes any next-horizon decision. A boundary encountered earlier is recorded
immediately; no prohibited action begins while waiting.
