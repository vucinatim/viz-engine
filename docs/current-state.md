# Current State

Last reconciled: 2026-08-13.

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
is the active implementation goal. Gate 0 approved its assumptions, repository
input audit, provisional performance envelope, human gates, local checkpoint
commits, and external-action boundaries. Its immutable planning baseline is
`b2b23b577feda29ef7eca9dcbf35a4e8c1162781`.

Goal Five uses one 45–60 second, multi-act, multi-layer, multi-component, and
multi-graph flagship as a forcing function for reusable creative-system
maturation. It is intentionally large enough for many days of bounded
checkpoints while retaining one verifiable completion condition.

The active phase is Phase 0: capture the exact environment and clean baseline,
run the complete uncontended repository gate, and freeze the executable Goal
Five criteria matrix before implementation expands.

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

The latest complete gate reported:

- clean architecture, formatting, lint, and types
- 65 deterministic test files / 299 tests
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
