# Goal Five Autonomous Sensory Feedback Operating System

Status: activated supporting execution contract; readiness implementation,
supervised calibration, and explicit `ACT-01` approval complete for local
VizEngine V2 development.

Proposed: 2026-09-03.

Parent goal:
[Goal Five: Flagship Autonomous Production And Creative-System Maturation](./flagship-autonomous-production-and-creative-system-maturation.md).

This document is subordinate to Goal Five. It is not a second active product
plan, a replacement roadmap, or permission to expand Goal Five into the full
future vision.

## Purpose

Establish a durable development operating system in which an agent can improve
VizEngine over many weeks by repeatedly:

1. recovering the product direction and exact current state
2. selecting one dependency-ready Goal Five checkpoint
3. determining whether it can observe and evaluate the intended result
4. strengthening a canonical observation surface when the evidence is
   insufficient
5. implementing the smallest complete end-state-compatible product slice
6. exercising the real project, runtime, editor, render, and bundle paths
7. evaluating the result through independent evidence lanes
8. reviewing the code and architecture
9. retaining evidence and updating machine execution state
10. continuing until a declared human gate or the Goal Five terminal condition

The schedule wakes the system. Repository contracts decide what the system does.

The desired result is not an agent that produces a large volume of code. It is
a repository that makes the next correct action, the available evidence, the
remaining uncertainty, and the quality of the result increasingly legible to
both the agent and the human.

## Governing Authority

Authority remains deliberately separated:

1. The [compounding vision](../../visions/viz-engine-compounding-vision.md)
   owns product direction.
2. The [Goal Five contract](./flagship-autonomous-production-and-creative-system-maturation.md)
   owns the bounded campaign, phases, human gates, and completion condition.
3. The [Goal Five certification matrix](../../parity/goal-five-certification-matrix.json)
   owns terminal proof requirements.
4. The tracked machine execution definition owns immutable work-item identity,
   dependencies, estimates, acceptance, authority, and evidence requirements.
   Branch-scoped Git-common operational state owns lifecycle status, claims,
   blockers, and admitted evidence references.
5. [Current state](../../current-state.md) owns the concise human snapshot.
6. [The work ledger](../../work-ledger.md) owns historical milestones.
7. [Suggestions](../../suggestions.md) owns durable work outside the active goal.

The execution program may derive work from Goal Five, but it may not change the
vision, add human gates, weaken certification, or invent product scope.

Chat context helps continuity. It is never the only durable owner of a decision,
checkpoint, blocker, or completion claim.

## Explicit Assumptions

This proposal assumes:

1. Goal Five remains the only implementation program.
2. One scheduled writer operates at a time.
3. Work remains on the declared VizEngine V2 development branch and reversible
   by default.
4. Local coherent commits and fast-forward pushes of their exact verified
   terminal commits to the same-named `origin` V2 branch are allowed. Force
   push, merge, PR creation or merge, tags, releases, deployment, cloud mutation,
   purchases, and other external-system changes remain forbidden.
5. Only repository-authorized music, models, animations, and media are available
   until the human explicitly expands asset authority.
6. The pinned V1 product experience remains the visible and performance floor.
7. Apple M1 Pro and the frozen Chromium environments remain the primary
   certification targets.
8. Unattended runs remain headless, muted, resource-bounded, and free of visible
   application control.
9. The human will review one consolidated packet approximately every two or
   three days and attend the declared Goal Five creative gates.
10. Subjective aesthetic approval remains human. The agent may prepare and
    critique evidence but may not manufacture approval.
11. Recurring execution targets twelve hours of night-centered capacity, with
    exact wake times calibrated only after the first three supervised runs.
12. The autonomous checkout is exclusively writer-owned while a valid lease is
    held; concurrent human edits use a separate worktree.

If concurrent human editing of the same checkout is required, a dedicated
persistent worktree and explicit integration policy become mandatory. A Git
worktree alone is not a writer lock.

## Architectural Position

The term **sensory organ** is a product-development metaphor, not a new universal
runtime abstraction.

In code and contracts, use the existing domain vocabulary:

- inspection
- events
- diagnostics
- measurements
- probes
- renders
- comparisons
- review artifacts
- evidence

Do not create a generic `Sensor` framework that erases ownership. Runtime facts
belong to runtime inspection, graph facts to graph inspection, media facts to
media probes, renderer resources to renderer lifecycle reporting, and editor
behavior to product acceptance.

One review-packet assembler may reference these outputs. It must not recompute
or privately redefine their semantics.

## The Closed Development Loop

```text
recover intent and state
        |
        v
derive the next ready checkpoint
        |
        v
ask whether the outcome is observable
        |
        +---- insufficient ----> improve the canonical observation contract
        |                                  |
        |                                  v
        +---------------------------- calibrate it against known failures
        |
        v
define acceptance before implementation
        |
        v
implement through canonical product boundaries
        |
        v
exercise the real flagship and preserved editor
        |
        v
collect semantic + visual + temporal + performance + code evidence
        |
        v
self-review, compare, simplify, and diagnose
        |
        +---- failed/uncertain ----> revise or record exact human evidence need
        |
        v
retain evidence, close checkpoint, choose the next ready work
```

The loop is allowed to improve its own observation tools. It is not allowed to
spend indefinite time on tooling that does not unlock a named Goal Five
criterion or a stable product boundary.

## Sensory Adequacy Gate

Before implementing a meaningful product slice, answer:

1. What user-visible, runtime, architectural, or production outcome should
   change?
2. Which canonical system owns that meaning?
3. Which observation proves the current behavior?
4. Which observation will prove the desired behavior?
5. Can the observation distinguish a real success from a plausible false pass?
6. Is the observation deterministic or is its environment and tolerance pinned?
7. Does it exercise the real flagship or only a substitute fixture?
8. Can a failure be localized to a useful owner?
9. Will the evidence remain associated with the exact commit, project revision,
   assets, artifacts, environment, and command?
10. Which part, if any, still requires human judgment?

If the relevant result cannot be observed reliably, the first checkpoint is the
smallest reusable observation improvement. If the missing observation is purely
subjective, prepare a human decision packet instead of inventing a metric.

## Observation And Evidence Lanes

### 1. Project and semantic state

Questions:

- Is the canonical document valid and structurally understandable?
- Which revision, actions, layers, graphs, bindings, assets, and artifacts exist?
- What changed, and did history record exactly one intended transaction?

Existing organs:

- project and bundle validation
- `VizSession` snapshots, transactions, history, and semantic diffs
- CLI project, component, node, and graph discovery

Likely maturation:

- one concise project/transaction comparison artifact
- explicit layer, graph-output, and binding usage summaries
- checkpoint identity that joins project revision and Git state

### 2. Runtime and temporal meaning

Questions:

- What does the project evaluate at an exact frame?
- Do sequential play, cold evaluation, direct seek, checkpoint replay, preview,
  still, and video agree?
- Are temporal discontinuities localized to the earliest divergent frame?

Existing organs:

- frame/debug/graph-runtime inspection
- deterministic runtime tests
- explicit temporal state and checkpoints

Likely maturation:

- a reusable multi-path frame-equivalence command
- section- and cue-aware inspection after Gate 1 fixes the musical map
- structured earliest-divergence reporting

### 3. Audio and musical intent

Questions:

- What are the section, phrase, energy, onset, frequency, and contrast features
  of the selected music window?
- Which graph output expresses which musical intention?
- Do audio stream identity, duration, silence, clipping, and A/V alignment pass?

Existing organs:

- deterministic PCM decode and audio-feature baking
- waveform, spectrum, feature timelines, Rhythm Lab, and media probes

Likely maturation:

- a durable candidate-window comparison report
- frame-exact musical-map export and runtime sampling report
- declared-intent mapping from major graph outputs to musical evidence

Automated signal analysis supports hearing; it does not replace human listening
and emotional judgment at creative gates.

### 4. Visual composition

Questions:

- Is the output blank, clipped, unreadable, repetitive, imbalanced, or missing a
  declared layer?
- Does each act have a distinct but coherent hierarchy, palette, material, and
  camera posture?
- Does every counted layer make a visible or inspectable contribution?

Existing organs:

- deterministic still rendering
- screenshots and direct image inspection
- nonblank checks and render diagnostics

Likely maturation:

- one canonical review-frame-set renderer
- whole-production contact-sheet assembly
- decoded-frame comparison with frozen SSIM and normalized-error tolerances
- per-layer isolation and contribution evidence without synchronous abuse

No scalar aesthetic score may stand in for visual judgment.

### 5. Motion and continuity

Questions:

- Does movement follow macro, phrase, and detail intent rather than jitter?
- Are camera cuts, transitions, animation phase, entrances, exits, and model
  grounding continuous?
- Are there freezes, pops, discontinuities, or implausible speed changes?

Existing organs:

- short video jobs
- frame probes, freeze detection, transport and seek tests

Likely maturation:

- transition- and peak-window proxy clip generation
- bounded decoded-frame motion statistics and discontinuity flags
- side-by-side or before/after motion review packets

### 6. Editor interaction and parity

Questions:

- Can a human understand and modify every new portable concept?
- Are controls live during gestures and committed once on release?
- Do graphs, debug values, playback, waveform, history, Jobs, Rhythm Lab,
  persistence, and dialogs remain correct and responsive?

Existing organs:

- the 42-row parity matrix
- Playwright critical journeys
- interaction latency and render/update instrumentation
- browser console and runtime issue capture

Likely maturation:

- flagship-specific editor journey generation from the approved project
- touched-workflow parity packets with exact V1 references
- focused focus/keyboard/accessibility observations where the flagship exposes
  risk

### 7. Performance and lifecycle

Questions:

- Does the full flagship meet display, runtime, graph-open, seek, gesture, and
  render-throughput budgets without hidden quality reduction?
- Do heap, renderer objects, textures, targets, programs, models, subscriptions,
  canvases, audio resources, servers, and child processes return to steady state?

Existing organs:

- Light Tunnel and editor performance suites
- runtime profiler and renderer resource counts
- six-cycle endurance workflow

Likely maturation:

- exact flagship profiles after Gate 3 freezes its workload
- per-owner timing only where the canonical producer can report it truthfully
- automated scoped-process and artifact cleanup attestation

### 8. Portability and reproducibility

Questions:

- Can the exact project validate, open, edit, save, reopen, and rerender without
  workstation paths, network access, or undeclared caches?
- Are runtime, capability, renderer, asset, artifact, and algorithm identities
  pinned?

Existing organs:

- portable directory bundles
- execution manifests and content identities
- bundle validation and built-consumer smokes

Likely maturation:

- one network-disabled clean-room Goal Five evaluator
- semantic and decoded-frame comparison against the source environment
- explicit missing-resource and identity-failure fixtures

### 9. Code and architecture

Questions:

- Did the change preserve one project, session, runtime, compositor, and history
  meaning?
- Did it introduce duplicate ownership, flagship identity in engine core, dead
  compatibility, hidden coupling, or accidental configurability?
- Are package direction, types, tests, builds, and documentation coherent?

Existing organs:

- architecture validation
- TypeScript, ESLint, Prettier, Vitest, package builds, browser tests, and smokes
- Git diff and source metrics

Likely maturation:

- explicit changed-boundary and affected-criterion reporting
- deletion/duplication review in every checkpoint packet
- dependency and public-surface diffs for cross-package changes

### 10. Creative and human judgment

Questions:

- Is the work emotionally coherent, distinctive, musically motivated, and worth
  polishing?
- Is the balance between models, procedural systems, graphics, camera, and
  effects convincing?
- Does the editor still feel like the intended product?

The agent may produce a structured self-critique and compare the result against
the approved treatment. Only the human may approve Gates 1 through 5.

## Evidence Confidence Model

Do not collapse confidence into one opaque percentage.

For every checkpoint, record the applicable lanes as:

- `not-observed`
- `passed`
- `failed`
- `human-required`
- `invalid-or-stale`
- `not-applicable` with a reason

A checkpoint is complete only when every applicable non-human lane passes for
the same implementation identity and every required human lane contains an
explicit decision.

Evidence becomes stale when its project, commit, capability, asset, artifact,
renderer, environment, or decision-rule identity changes.

## Sensor Calibration Rule

An observation tool is not trustworthy merely because it passes good output.

Where practical, calibrate it against a bounded known failure such as:

- invalid graph or unresolved binding
- missing asset or artifact
- blank or clipped frame
- frozen output
- intentional versus accidental silence
- A/V drift
- temporal discontinuity
- renderer resource leak
- pointer-rate durable revisions
- stale server or wrong project identity

Fault injection belongs in fixtures or isolated harnesses. It may not corrupt the
flagship or create a second runtime path.

## Machine Execution Program

Goal Five should gain one small machine-readable execution program subordinate
to the existing prose plan and certification matrix.

Each tracked work-item definition contains:

- stable id, phase, lane, priority, title, and acceptance
- dependencies
- exact target branch and canonical certification-criteria contract
- authority: autonomous or human checkpoint; external actions remain separately
  prohibited unless the user explicitly authorizes them
- minimum and maximum agent-hour estimate
- affected certification criteria and parity rows
- required evidence lanes and typed evidence requirements

Its branch-scoped operational state contains status, exact active owner,
blocker and recovery identity, terminal Git identity, and admitted typed evidence
references. A tracked definition is frozen once operational state exists. A
materially changed execution program receives a new program identity; active
state is never silently migrated or reinterpreted.

`tools/repo/programs/active-program.json` is the one tracked selection point.
Every immutable definition declares its exact target branch. Human queues and
append-only decisions are program-scoped, so activating a successor Goal Five
program cannot reinterpret or collide with readiness decisions.

`ready` should be derived rather than stored. One pending autonomous item is
ready only when all dependencies are complete and no ownership or environment
conflict exists.

State changes must be atomic, validated, previewable, and ownership-safe.
Completion must fail closed without the required evidence.

### CLI boundary

Repository-program operations belong in the implemented small maintainer CLI:

```text
pnpm run repo -- program status
pnpm run repo -- program next
pnpm run repo -- program inspect <item>
pnpm run repo -- program claim <item>
pnpm run repo -- program complete <item> --evidence <reference>
pnpm run repo -- program block <item> --type <type> --reason <reason>
pnpm run repo -- program validate
pnpm run repo -- run preflight
pnpm run repo -- state status
```

This is intentionally separate from `pnpm viz`, which remains the product and
developer surface over canonical Viz projects, sessions, bundles, bakes, and
renders.

This is not a generic project-management platform. The implemented CLI is
intentionally scoped to the autonomous-readiness program and Goal Five. Its
small lifecycle, evidence, and locking primitives may support later Viz
programs only after those programs make the reuse concrete.

## Sole-Writer And Lease Contract

Before mutating scheduled runs are enabled, implement and prove one atomic
repository lease with:

- lease id and owner
- branch and exact starting commit
- acquisition time, expiry, and heartbeat
- host/process identity where available
- clean/dirty worktree state
- checkpoint/work-item identity
- explicit release
- stale-owner recovery that never discards a diff

The lease, immutable per-claim resume markers plus a latest-claim pointer,
program lifecycle state, human-decision
records, immutable evidence objects, and cross-file transition journal live in
Git-common repository operational state rather than portable project data or
product packages. A separate atomic operational mutex serializes transitions
that touch more than one of those files. Process death leaves the journal in
place; a later wake first recovers the exact proven-dead mutex and then rolls
back the exact transition. A live or remote/unprovable owner produces a clean
stop, never automatic takeover.

A run must become read-only or exit when:

- another valid writer owns the lease
- the worktree contains unowned changes
- the branch does not match the integration policy
- the resume marker and Git history disagree
- an applicable human gate is awaiting a decision
- the machine is already under material load

The first mutating scheduled run must be invoked manually, inspected completely,
and reviewed before recurrence is enabled.

New check evidence is admitted only when its full canonical command plan,
claim, lease, program definition, changed bytes, and terminal commit agree.
Admitted records are copied into a content-addressed Git-common store. Historical
validation checks the immutable recorded plan and terminal identity rather than
reinterpreting old proof through a future check planner.

## Checkpoint Run Contract

Every scheduled or resumed run follows the
[exact checkpoint runbook](./autonomous-checkpoint-runbook.md):

1. reads canonical recovery documents and Git state
2. verifies or acquires the sole-writer lease
3. reads machine program status and derives ready work
4. chooses one highest-leverage nonconflicting checkpoint
5. states the target contract, canonical owner, forbidden owners, assumptions,
   evidence lanes, and acceptance before editing
6. runs the sensory adequacy gate
7. improves a missing observation only when it unlocks the checkpoint
8. implements one primary conceptual axis
9. validates focused behavior and the real product surface
10. compares before and after evidence
11. reviews architecture, complete diff, deletion, and simplification
12. commits one coherent local checkpoint only when Tier 2 acceptance passes
13. completes the item with typed evidence, atomically updates machine state,
    and releases the lease
14. creates the review packet and verifies the released ownership state
15. stops all scoped children
16. exits; a later wake recovers afresh before selecting another checkpoint

A timer may stop new work from starting. It may not turn an incomplete change
into a completed checkpoint.

## Operational Cadence

Authorized initial cadence after the completed readiness rehearsals:

- four nominal night-centered wake windows per day, with the exact authorized
  cadence owned by the checkpoint runbook and its host-side activation state
- approximately three hours of capacity per window, targeting twelve hours of
  daily autonomous capacity rather than mandatory activity
- an explicit cleanup buffer between windows; a later wake exits harmlessly if
  an earlier run still owns the lease
- one heavy process at a time
- full repository gates only at integration milestones
- headed performance and intended-audio review only during coordinated human
  time
- one consolidated human review packet every 48–72 hours

The three exact-prompt runs before activation are supervised calibration runs.
Review their scope choice, diffs, evidence, cleanup, and machine-state
transitions before creating the recurring schedule. After activation, treat the
first unattended week as a monitored rollout rather than assuming calibration
eliminated every production-workload risk.

The desktop app and machine must remain running and awake for local scheduled
work. The schedule should be paused while the human is performing overlapping
repository work. Elapsed scheduled capacity never obligates speculative work:
the correct result at a human gate, unsafe checkout, or empty ready queue is a
clean stop.

## Quiet Execution Profile

Unattended work must:

- use headless muted Chromium
- use unique ports and never reuse an unknown server
- keep Playwright single-worker
- avoid visible Chrome, DevTools, Finder, media players, or focus theft
- never play browser or system audio
- prefer stills and contact sheets to routine video
- use short proxy clips only when motion evidence is necessary
- reserve full-duration 1080p output for declared milestones
- avoid overlapping builds, browsers, encoders, and performance suites
- clean up servers, browsers, encoders, temporary artifacts, and leases
- preserve failed evidence when it explains a real defect

## Human Review Packet

Every 48–72 hours, or at a declared creative gate, produce one concise packet:

- current phase, checkpoint, commit, project revision, and execution identity
- completed and currently ready work items
- visual before/after stills and relevant motion clips
- musical-map and graph-intent changes
- semantic, determinism, performance, lifecycle, and parity results
- code and architecture diff summary, including deletions and new public surface
- failed or stale evidence and what invalidated it
- agent self-critique: strongest result, weakest result, and next hypothesis
- exact human validations required, each with artifact, question, recommendation,
  alternatives, and consequence of delay

Do not interrupt the human with small implementation questions that can be
resolved safely inside the existing contracts. Batch subjective and product
decisions into the nearest packet or declared gate.

## Human-Validation Queue

When the agent cannot honestly close an observation, add a typed item containing:

- exact question
- why automation is insufficient
- artifact and identity to review
- recommended decision and alternatives
- what work remains safe while waiting
- what work is prohibited until the decision

Examples include:

- track and window selection
- emotional arc and visual-language approval
- whether a visible UX change is genuinely better than V1
- whether a motion passage feels intentional rather than merely valid
- final audiovisual quality
- licensing or external-asset authority

The existence of human judgment is not a tooling failure. Pretending it is
automatable would be one.

Human resolutions are append-only operational decision records. The CLI records
provenance but cannot cryptographically distinguish a human from a local
process. Therefore unattended prompts and agent rules explicitly prohibit
`human resolve` without a contemporaneous user instruction naming the decision.
This is an authority boundary like push/deploy authority, not a claim of
technical identity attestation.

## Multi-Week Program

Calendar estimates assume up to twelve hours of night-centered capacity on most
days. Gates, evidence, and dependency readiness govern progress; elapsed time
never proves completion.

### Bootstrap: two to four days

- reconcile status documentation; no push occurred during this supporting
  readiness program
- define the machine execution schema and initial Goal Five dependency graph
- implement the minimal repo-program status/next/inspect/transition commands
- implement and fault-test the sole-writer lease
- inventory existing observation contracts against all 46 criteria
- implement the smallest review-packet assembler
- run one complete manual scheduled-prompt rehearsal
- obtain operating-system activation approval

### Week 1: Goal Five Phase 1 and Gate 1

- audit authorized music, assets, components, nodes, renderers, examples, and
  previous productions
- compare candidate music windows through deterministic audio evidence
- write the production treatment, frame-exact musical map, ownership map,
  review-frame set, and motion windows
- identify only the reusable gaps demonstrated by the treatment
- prepare one Gate 1 packet and obtain treatment approval

### Week 2: whole-production skeleton, representative prototype, and Gate 2

- materialize the complete low-detail 45–60 second act structure first
- build one representative 8–12 second quality slice
- prove headless creation, same-session editor visibility, stills, proxy clip,
  bundle reopen, and deterministic seeking
- mature visual, motion, and comparison observations exposed by the slice
- obtain provisional visual-language approval

### Weeks 3–4: reusable direction, compositor, model, and capability work

- implement only treatment-proven macro direction and compositor modulation
- add only the visual/model/shader/particle capability slices the production
  genuinely needs
- carry schemas, validation, actions, history, runtime, inspection, editor,
  agent tooling, and tests together
- calibrate every new observation against relevant known failures
- integrate the complete capability palette into a low-detail full production

### Week 5: multi-graph system, agent feedback, full rough cut, and Gate 3

- organize responsibility-separated graphs and named musical outputs
- close usage, issue, cost, and review-packet gaps revealed by the real project
- complete all acts, transitions, entrances, exits, camera direction, palette
  progression, and density arc
- generate the full rough-cut proxy and contact sheet
- obtain full-structure approval

### Week 6: motion and visual refinement and Gate 4

- refine grounding, authored animation, phase continuity, camera, lighting,
  exposure, hierarchy, particles, transitions, and graph response
- inspect every transition and peak in motion
- resolve media-sanity and continuity defects
- obtain motion and visual lock

### Week 7: exact performance, lifecycle, determinism, and portability

- freeze the exact flagship performance workload
- profile before optimizing and repair canonical owners only
- certify graph-open playback, continuous editing, seeking, rendering, and six
  lifecycle cycles without reducing composition quality
- prove clean-room bundle reopen and multi-path deterministic equivalence
- rerun affected V1 parity and previous production evidence

### Week 8: consolidation, candidate `C`, final media, Gate 5, and evidence `E`

- remove temporary scaffolding, duplicate paths, unused configuration, and
  debug artifacts
- complete the uninterrupted full repository and Goal Five gate
- freeze exact clean candidate commit `C`
- generate final stills, contact sheet, transition clips, probes, and 1080p
  H.264/AAC video from `C`
- obtain final human approval of both video and editable project
- create documentation-only evidence commit `E`
- complete Goal Five only when all 46 criteria pass for the immutable identities

### Contingency: Weeks 9–10 when evidence requires it

Use only for real findings such as:

- a canonical architecture redesign exposed by production scale
- visual quality changes requested at a human gate
- full-flagship performance or lifecycle failures
- nondeterminism or portability faults
- invalidated candidate evidence

Do not consume contingency with speculative framework work.

## Initial Machine Work Items

The first execution manifest should contain only reviewed, end-state-compatible
items:

1. `OS-01` — freeze authority map, execution schema, evidence-reference types,
   and state-transition invariants
2. `OS-02` — implement repository program validation and read-only
   status/next/inspect commands
3. `OS-03` — implement atomic claim/complete/block transitions and the shared
   sole-writer lease with failure-path tests
4. `OS-04` — inventory all 46 Goal Five criteria against existing observations
   and identify real gaps without implementing speculative sensors
5. `OS-05` — assemble one identity-pinned checkpoint/review packet from canonical
   outputs
6. `OS-06` — manually rehearse the exact scheduled prompt, dirty-worktree
   refusal, stale-lease recovery, quiet browser profile, validation, commit, and
   cleanup behavior
7. `CAL-01` — supervised rehearsal of the exact future scheduled prompt
8. `CAL-02` — second fresh-wake supervised rehearsal, including recovery and
   cleanup review
9. `CAL-03` — final supervised rehearsal and activation recommendation
10. `ACT-01` — human-only approval to authorize recurring autonomous execution;
    rejection or requested changes leave the item pending and recurrence
    disabled

Goal Five production work (`P1-*` onward) belongs to a new frozen program
definition created only after `ACT-01` approval and selected through the tracked
active-program pointer. Its work items are materialized when the preceding gate
and real production evidence make acceptance precise.

The pointer cutover and `ACT-01` completion form one explicit handoff. The
activation claim, its pre-commit checks, and atomic post-commit completion and
lease release continue to name the readiness program with `--program`. The same
commit creates the immutable successor definition and changes the tracked
pointer. Create and verify the old-program post-commit review after completion.
A default preflight may select the successor only after that review confirms the
readiness lease was released; any crash recovery during the handoff uses the
exact recorded readiness-program identity rather than the new default pointer.

## Anti-Rabbit-Hole Rules

- One run and one work item have one primary conceptual axis.
- Observation work must name the criterion or stable product boundary it unlocks.
- After 30–40 minutes without narrowing an investigation, record competing
  hypotheses and choose another ready item or prepare a focused follow-up.
- After two failed implementation strategies, return to the ownership model.
- Do not create a new abstraction from a single awkward production encoding
  unless the domain boundary is independently stable.
- Do not build all planned Goal Five harnesses before the production makes them
  executable and meaningful.
- Every four to six checkpoints, run an integration, deletion, documentation,
  and evidence-staleness review.
- Reserve the final quarter of a scheduled window for validation, evidence,
  cleanup, and lease release.

## Activation Acceptance

Mutating recurrence may be enabled only when:

1. this operating model and its assumptions are approved
2. the exact local/worktree ownership policy is selected
3. the completed Phase 0 commits are durably available
4. status documentation agrees
5. the machine execution schema and initial items validate
6. atomic ownership and stale recovery are tested
7. all 46 criteria map to an existing observation, a justified planned
   observation, or an explicit human decision
8. one manual scheduled-prompt rehearsal leaves a coherent result, reviewable
   evidence, a clean worktree, no child processes, and no external mutation
9. three pre-activation exact-prompt runs are explicitly treated as supervised
   calibration
10. a pause mechanism and human-review cadence are agreed

## Decisions Required Before Activation

Approved defaults are:

1. **Checkout ownership:** reserve this checkout for the autonomous loop during
   scheduled windows; use a separate human worktree for concurrent edits.
2. **Cadence:** four night-centered windows targeting twelve hours of available
   capacity; calibrate exact times after three supervised runs and pause
   automatically at human gates.
3. **Days:** begin on weekdays for the first three calibration runs, then allow
   weekends only after cleanup and resource behavior are proven.
4. **External authority:** local files, tests, browser checks, renders, local
   commits, and a post-completion fast-forward push of the exact reviewed
   terminal commit to the same-named `origin` V2 target branch. No force push,
   merge, PR, tag, release, deployment, production access, purchase, or other
   external mutation.
5. **Asset authority:** repository-authorized inputs only until Gate 1 requests a
   specific expansion.
6. **Notifications:** report completed checkpoints, failures that invalidate the
   baseline, and human decisions; suppress routine no-op noise.

Implement and manually run `OS-01` through `OS-06`, then complete the three
supervised calibration runs, before creating the recurring schedule. The exact
prompt and recovery action table live in the
[checkpoint runbook](./autonomous-checkpoint-runbook.md). This contract
authorizes only the runbook's exact post-completion fast-forward push to the
same-named `origin` V2 target branch. It does not authorize a force push, merge,
PR, tag, release, deployment, production access, purchase, package/media/release
publication, or any other external mutation.

## Completion Of This Supporting Program

This operating-system proposal is complete when:

- its activation acceptance passes
- the operating behavior is absorbed into stable repository contracts and the
  machine execution program
- scheduled runs can recover and advance Goal Five without chat-only state
- every meaningful product change exercises the sensory adequacy gate
- human-only uncertainty is retained honestly
- the supporting plan can be archived without removing the operating surfaces

Goal Five itself remains complete only at candidate `C` plus documentation-only
evidence commit `E` with explicit final human approval.
