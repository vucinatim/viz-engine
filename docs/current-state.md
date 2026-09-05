# Current State

Last reconciled: 2026-09-05.

## Product Direction

The canonical product direction is the
[VizEngine Compounding Vision](./visions/viz-engine-compounding-vision.md).

VizEngine V2 is a full replacement architecture beneath the preserved
professional editor experience:

- one portable `VizProjectDocument`
- one canonical live `VizSession`
- one deterministic runtime meaning
- one shared human, agent, CLI, and host control surface
- explicit render, bake, asset, artifact, and execution identity
- local-first open-core use with future Viz Cloud and Magnify integration

V1 remains the UX, capability, and performance reference. V1's hidden store,
render-loop, browser-attachment, and compatibility architecture is not a
preservation target.

## Planning State

Goals One through Four are complete and certified.

[Goal Five: Flagship Autonomous Production And Creative-System Maturation](./plans/v2/flagship-autonomous-production-and-creative-system-maturation.md)
is active in Phase 1 after explicit `ACT-01` approval and the reviewed
active-program handoff. Gate 0 approved its assumptions, repository input audit,
provisional performance envelope, human gates, local checkpoint commits, and
external-action boundaries. Its immutable planning baseline is
`b2b23b577feda29ef7eca9dcbf35a4e8c1162781`.

Goal Five uses one 45–60 second, multi-act, multi-layer, multi-component, and
multi-graph flagship as a forcing function for reusable creative-system
maturation. It is intentionally large enough for many days of bounded
checkpoints while retaining one verifiable completion condition.

A now-approved
[Autonomous Sensory Feedback Operating System](./plans/v2/goal-five-autonomous-sensory-feedback-operating-system.md)
now defines the multi-week execution, observation, evidence, sole-writer,
scheduled-run, and human-review model under Goal Five. Its bounded readiness
implementation and three supervised exact-prompt calibration runs are complete.
The product owner approved `ACT-01` for V2 development and subsequently granted
one narrow remote-branch synchronization authority: an autonomous checkpoint
may fast-forward push its exact completed, reviewed terminal commit to the
same-named `origin` branch matching the active program's non-main target. Force
push, merge, PR, tag, deployment, package/media/release publication, purchase,
production-system access, and other external mutation remain unauthorized.

The readiness substrate now has a tracked active-program pointer, immutable
target-branch execution definitions, program/branch-scoped Git-common lifecycle
and human-validation state, one cross-worktree writer lease,
per-claim recovery markers, crash-journaled multi-file transitions,
content-addressed historical evidence, canonical staged checks, a 46-criterion
sensory map, append-only human decisions, read-only specialist role contracts,
and identity-bound review packets. `OS-01` through `OS-06` and `CAL-01` through
`CAL-03` are complete with immutable evidence, independent review, staged
validation, clean terminal commits, and released ownership. `ACT-01` is approved,
and the active pointer selects the immutable
`goal-five-phase-1-treatment` program. Host schedule state remains app-owned and
must be verified through Codex Scheduled rather than inferred from repository
files.

The exact authorized cadence is owned by the
[checkpoint runbook](./plans/v2/autonomous-checkpoint-runbook.md): four
night-centered capacity windows, at most one checkpoint per wake, planned
cleanup gaps, and exact sole-writer refusal on overrun.

The canonical machine entrypoint for that readiness work is:

```bash
pnpm run repo -- --help
pnpm --silent run repo -- run preflight --json
pnpm --silent run repo -- program status --json
pnpm --silent run repo -- program next --json
```

Phase 0 is complete at behavioral checkpoint
`043f8dbae5f15828c5cba6c0b74f32cadb359946`: the exact environment and
activation metrics are captured, the 46-criterion terminal-proof contract is
executable, and the uncontended complete repository gate is green. Its
[certification evidence](./parity/evidence/2026-08-14-goal-five-phase-0-certification-freeze.md)
keeps the original non-green activation run and repaired audio observation
explicit. The active implementation phase is the bounded capability, authorized
asset, and music-window audit ending at Gate 1 treatment approval. `P1-01` has
pinned and classified all 82 relevant or plausibly confusable repository inputs
at `9fdc0712c0e1e67ef7ebbaf5ed4e1c192e005a9c`: 14 source-music candidates,
four source Stage models, ten shader capability sources, prior production
derivatives, and explicit non-input/reference groups. The audit found no valid
new standalone image/video/texture source and no repository evidence of source
audio/model redistribution rights. `P1-02` has also pinned the complete
implementation-owned capability surface: 18 packages, 21 Studio components (15
authorable core, five runtime-only core, one production-local), 34 graph nodes,
26 node-network presets, nine Three programs, 14 contract schema surfaces, 22
durable actions, 24 wire operations, four CLI scopes, 17 existing inspection,
comparison, performance, and agent-feedback commands, five exercised projects,
and all 42 verified editor-parity rows. It
distinguishes Afterlight's composition-only proof from Signal Cathedral's
production-local pack. The existing browser-bundle harness already supplies
full-fidelity autonomous Studio-path proof; canonical standalone product-CLI
host composition, treatment-defined macro direction, and compositor modulation
are the leading real gaps, recorded without speculative implementation. `P1-03`
has now deterministically decoded and content-addressed the PCM for all 14
authorized source tracks, analyzed each complete source once, evaluated 45–60
second production windows across the full tracks, and retained three diverse
exact candidates per source. Its provisional recommendation is the 48-second
`HipHop — 808 Rap` window at 2.25–50.25 seconds, with exact sample and 60 fps
frame coordinates, transparent score components, and explicit
section/phrase/beat uncertainty. Intended audio, emotional fit, musical
correction, and treatment approval remain human-owned at Gate 1. `P1-04` has
now transformed that exact recommended interval into one content-addressed,
deterministic proposed timing map: five gapless acts, four bounded transitions,
all five section hypotheses including the explicit near-edge exclusion, all 82
beats, ten phrases, 69 transients, inherited energy observations, deterministic
peak and lower-energy opportunities, and linked macro/phrase/detail production
intent. It preserves detector observation samples separately from nearest 60
fps scheduling frames, labels clipped edge bins, and makes no false silence or
musicological claims. `P1-05` has now converted those exact inputs into the
evidence-bound [Human Signal production treatment](./plans/v2/goal-five-flagship-production-treatment.md):
five acts, nine meaningfully distinct layers, seven responsibility-scoped
graphs, all four authorized Stage performers, an explicit compositor/camera
contract, 15 still targets, six motion-review windows, exact performance
budgets, and three smallest reusable gaps. The treatment deliberately uses
independent Three programs as compositor inputs, includes Curve Spectrum as
complementary 2D language, and excludes only unsupported raster/image/video
inputs. It remains a proposal—not approved direction—until the product owner
reviews the music, emotional arc, creative coherence, exclusions, and gap value
at Gate 1. No aesthetic implementation begins before that decision.

## Canonical Architecture

`VizProjectDocument` is durable portable scene truth.

`VizSession` is the mutable live authority over the working document and owns:

- working project and revision
- typed project and graph transactions
- history and continuous gestures
- preview transport and audio-session state
- resolved assets and artifacts
- runtime inputs, checkpoints, and inspection

The React editor owns presentation and browser attachments. It subscribes to
the session and does not define scene or runtime meaning.

Frame evaluation is deterministic and shared by live preview, inspection,
still jobs, video jobs, and render adapters. Remotion remains an adapter.

## Implemented Product And Runtime

- strict project, component, node, asset, artifact, job, execution, and control
  contracts
- capability-pack, component, node, and retained Three-program registries
- direct canonical graph authoring and deterministic temporal evaluation
- revision-safe transactions, dry runs, history, and continuous gestures
- browser and Node audio decode/bake paths
- versioned compact audio-feature artifacts and runtime sampling
- portable local and external asset references
- SVG and retained Three.js rendering with explicit compositor ownership
- explicit renderer object, texture, target, model, program, and preview
  lifecycles
- generic model assets, deterministic animation sampling, real Stage
  performers, and scalable animated crowds
- observable bake and render jobs with progress, cancellation, output identity,
  media probing, and feedback
- local portable bundles with content and execution identity
- preserved Vite/React Studio with playback, graphs, history, persistence,
  import/export, diagnostics, profiler, Jobs, and Rhythm Lab
- live HTTP/SSE control over the same session as the editor
- source-mode and built-package CLI paths

## Realtime Interaction And Performance

React is not the pointer-rate project bus or frame-rate signal bus.

Continuous controls publish revision-bound transient values directly to the
runtime and visible control, then commit one canonical history transaction at
gesture end. Graph animation, runtime debug values, audio meters, waveform
presentation, and preview work use focused imperative or external-store paths.

The exact Light Tunnel workload is the current strongest runtime performance
proof on the fixed Apple M1 Pro / Chromium environment:

- planning reduced from 79.173 ms mean / 140.807 ms p95 to 1.775 / 2.609 ms
- quality-2 playback measured 60.20 FPS graph-closed and 60.33 FPS graph-open
- display p95 measured 9.20 / 9.00 ms
- graph-open continuous edits measured 0.40 ms pointer-to-transient and
  21.60 ms pointer-to-visible at p95
- movement created zero project revisions and release created exactly one
- six-cycle endurance ended with 5.86 MB forced-GC heap growth and stable
  display p95

See
[Temporal Runtime And Light Tunnel Performance](./parity/evidence/2026-08-04-temporal-runtime-and-light-tunnel-performance.md).

## Certified Productions

### Signal Cathedral

[Signal Cathedral](./plans/v2/first-agent-authored-production-signal-cathedral.md)
proved the first complete agent-authored production loop:

- project-local trusted capability and retained Three program
- one editable 18-node graph with five outputs
- portable audio and baked analysis
- live editor control and history
- deterministic preview, stills, contact sheet, and H.264/AAC clip
- portable reopen with pinned execution identity

See its
[production certification](./parity/evidence/2026-07-30-signal-cathedral-production-certification.md).

### Afterlight Assembly

[Afterlight Assembly](./parity/evidence/2026-08-04-afterlight-assembly-motion-and-rig-polish.md)
proved a distinct model-backed Stage path:

- four bundled FBX performers and a 420-character animated crowd
- cinematic camera and model-backed visual quality
- one editable 26-node graph with eight smoothed outputs
- canonical live inspection, mutation, rendering, and output retrieval
- grounded rig transforms and deterministic amplitude/rate/phase semantics
- a validated 12-second 1280 × 720 H.264/AAC final video

Both productions are real proofs, but both are 12 seconds, one visual layer,
and one graph. They do not yet prove a full-spectrum, multi-act, multi-layer,
multi-graph flagship production.

## Completed Programs

- [Core Consolidation And Quality Hardening](./parity/evidence/2026-07-30-core-consolidation-and-quality-hardening.md)
  consolidated package direction, session ownership, graph authoring, assets,
  renderer lifecycle, execution identity, CLI structure, and checked browser
  acceptance.
- [Behavior-Preserving Minimization](./parity/evidence/2026-07-31-behavior-preserving-minimization-and-final-polish.md)
  removed 7,879 production lines and 22 files from its immutable baseline while
  increasing the proof surface and stopping at the honest simplification
  frontier.
- [Product Parity, Performance, And Agentic Creative Calibration](./plans/v2/product-parity-performance-and-agentic-creative-calibration.md)
  repaired real manual-calibration gaps, certified the complete matrix, built
  the live agent loop, and produced Afterlight Assembly.
- [Temporal Runtime And Playback Performance](./plans/v2/temporal-runtime-and-playback-performance-certification.md)
  replaced recursive historical replanning with explicit temporal state and
  certified the exact Light Tunnel workload.

Detailed chronology belongs in [the work ledger](./work-ledger.md) and
[parity evidence](./parity/evidence/), not in this current-state document.

## Certified Product Floor

The immutable V1 reference is
`e806fbc10980615588b52ff574bc923c6f00f35e`.

The parity matrix currently contains 42 verified capabilities with zero gap,
partial, or unaudited rows.

The latest complete gate at Goal Five Phase 0 reported:

- clean architecture, formatting, lint, and types
- 67 deterministic test files / 304 tests
- 16 active headed Chromium journeys with 3 intentional opt-in skips
- all 18 package builds and the Studio production build
- both built-consumer smoke scenarios

This certifies the declared matrix and fixed-device Chromium evidence. It does
not imply equivalent Firefox, WebKit, accessibility, heterogeneous-device,
dependency-security, or deployed-scale certification.

## Known Boundaries And Deliberate Deferrals

- no single full-spectrum flagship production yet
- no equivalent cross-browser or broad device performance matrix
- browser-backed video execution rather than a native browser-free executor
- directory-backed bundles rather than a mature archive and large-media policy
- trusted capability packs rather than arbitrary untrusted plugin loading
- no generic `Model3D` product authoring or prepared derivative pipeline yet
- no generalized masks, compositor passes, or effect graphs yet
- no root-motion, retargeting, facial, speech, or singing product semantics yet
- no GPU or per-graph execution timing; unavailable metrics are not fabricated
- layer mirrors retain paced synchronous capture until an exact safe GPU-native
  replacement is proven
- no hosted Viz Cloud, collaboration, auth, billing, or Magnify production
  integration yet

These are future product opportunities, not permission to create parallel
architecture during unrelated work.

## Recovery Pointers

1. [Compounding Vision](./visions/viz-engine-compounding-vision.md)
2. [Autonomous Development Compass](./autonomous-development-compass.md)
3. [Working Agreements](./working-agreements.md)
4. [Documentation Map](./docs-index.md)
5. [Parity Program](./parity/README.md)
6. [Suggestions](./suggestions.md)
7. [Work Ledger](./work-ledger.md)

The active goal, when one exists, must be named in this document.
