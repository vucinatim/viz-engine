# Goal Four: Temporal Runtime And Playback Performance Certification

Status: complete

Activated: 2026-08-04

Completed: 2026-08-04

Branch: `codex/viz-engine-v2`

Pinned V1 parity reference: `e806fbc10980615588b52ff574bc923c6f00f35e`

## Goal

Restore and certify V1-parity smooth playback for temporal, graph-driven
VizEngine scenes without weakening deterministic seeking, rendering, graph
authoring, visual output, or the canonical V2 runtime architecture.

The goal will:

- remove recursive historical frame replanning from component evaluation
- replace it with explicit incremental temporal state and bounded checkpoints
- preserve identical results for sequential playback, cold evaluation, seek,
  export, and repeated evaluation
- restore the real Light Tunnel example to measured 60 FPS parity with V1
- isolate and remove remaining compositor, mirror, and Light Tunnel render-path
  overhead only after the runtime-planning regression is corrected
- make the exact representative scene part of the permanent performance gate
- correct parity evidence that was previously marked verified without measuring
  this workload against V1

This is a performance-correctness goal, not a visual simplification goal.

## Why This Goal Exists

The preserved Light Tunnel example ran smoothly at 60 FPS in V1. In V2 it
shows serious playback lag even though its scene content, graph authoring, and
visual intent remain substantially the same.

The deterministic Light Tunnel migration explicitly recorded that it did not
prove measured V1 runtime-performance parity. Later broad benchmarks did not
include Light Tunnel, but the relevant parity rows were nevertheless marked
verified.

Direct diagnosis found a planning regression large enough to explain the
observed playback failure before WebGL rendering begins.

## Confirmed Regression

### V1 behavior

V1 kept Light Tunnel wave state incrementally inside the scene:

- detect the current trigger's rising edge
- append one active wave with its start time
- step and prune the active waves once per sequential frame
- update retained ring transforms

Sequential playback did not reevaluate earlier project frames.

### V2 behavior

V2 replaced the incremental wave state with `resolveActiveWaveAges()`. On each
current frame it scans the full visible wave window:

```text
waveDuration + tunnelDepth / waveSpeed
= 0.4 + 13 / 8.5
= approximately 1.93 seconds
= as many as 118 sampled frames at 60 FPS
```

Every `sampleSettings(sampledFrame)` call currently constructs a complete
historical frame plan. Each of those plans evaluates all graphs in the project.

The bundled example contains:

- 9 graphs
- 57 nodes
- as many as 118 sampled historical frames per displayed frame

This can produce more than 1,000 graph evaluations and 6,700 node evaluations
for one displayed frame.

The intended reference-identity shortcut is ineffective for graph-driven
settings because `resolveVizComponentSettings()` always returns a new
structured clone.

### Measured planning cost

The source-mode benchmark used:

- the exact bundled `light-tunnel.vizengine.json` project
- 60 FPS
- 1280 x 720 runtime viewport
- 30 warm-up frames
- 210 measured sequential frames
- Node 22 on the Apple M1 Pro development machine

| Workload                                                                 |     Mean |   Median |       p95 |   Maximum |
| ------------------------------------------------------------------------ | -------: | -------: | --------: | --------: |
| Current Light Tunnel example                                             | 79.17 ms | 79.06 ms | 140.81 ms | 169.68 ms |
| Same project and graphs, Light Tunnel graph inputs removed for isolation |  2.16 ms |  2.17 ms |   3.20 ms |   4.00 ms |
| Graphless project                                                        | 0.025 ms | 0.022 ms |  0.036 ms |  0.143 ms |

The complete 60 FPS frame budget is 16.67 ms. The current plan construction
alone exceeds that budget by roughly five times on average and considerably
more in the tail.

This establishes recursive temporal replay as the primary known regression.

## Honest Evidence Correction

The following parity claims are reopened on activation:

- `preview.live-rendering`
- `performance.playback-smoothness`

The implementation exists and lighter workloads pass, but representative V1
scene performance is materially regressed. These rows may return to
`verified` only after controlled V1/V2 Light Tunnel comparison and the full
acceptance contract below.

Existing evidence remains useful historical evidence. It is not deleted or
rewritten to imply that it measured Light Tunnel when it did not.

## Core Thesis

Determinism does not require replaying recent project history from scratch on
every displayed frame.

The correct model is:

```text
canonical project + frame inputs
  -> current graph evaluation
  -> explicit temporal component step
  -> session-owned temporal state/checkpoint
  -> pure serializable render plan
  -> retained renderer attachment
```

Sequential live playback should step once from frame `N` to `N + 1`.

Non-sequential evaluation should restore the nearest valid checkpoint and
replay only the bounded missing interval using the correct inputs for each
replayed frame.

The output for a frame must not depend on whether it was reached sequentially,
from a cold session, after a seek, or during export.

## Canonical Ownership

### `VizProjectDocument`

Continues to own portable authored scene truth:

- component settings
- graph documents and bindings
- timeline and viewport
- assets and artifacts

Runtime temporal state is not project content.

### `VizRuntimeSession`

Owns evaluation-local continuity:

- temporal graph checkpoints
- temporal component checkpoints
- current sequential evaluation cursor
- bounded per-frame input history or deterministic input providers
- invalidation identity for project, graph, component, input, and resource
  changes

No temporal cache may be shared implicitly between independent sessions,
projects, jobs, or concurrent renders.

### Components

Components that require memory declare it explicitly through a deterministic
temporal contract conceptually equivalent to:

```ts
interface VizTemporalComponent<State> {
  createInitialState(context): State;
  step(context, previousState): State;
  project(context, state): VizRenderNode;
}
```

The final contract should use the smallest names and surface supported by the
real migrations. The important properties are:

- state is explicit and structured-cloneable
- stepping uses fixed frame time and explicit inputs
- render nodes remain serializable
- checkpoints are versioned by component implementation and scene identity
- components never recursively ask the runtime to resolve arbitrary settings

### Renderer

The renderer consumes only the current render plan. It does not become the
canonical owner of wave events, graph history, or seek semantics.

Retained renderer state remains valid for GPU resources and presentation-only
state, but not for deterministic scene truth.

## Temporal Input Policy

Checkpoint replay is correct only when each replayed frame receives the inputs
that belonged to that frame.

The goal must define and test these cases explicitly:

### Baked or artifact-backed audio

Historical frames sample the canonical artifact timeline. This is the fully
deterministic preview and render path.

### File-backed live preview

Sequential playback uses the current decoded/analyzed frame once. Seeking or
cold random access must use a deterministic frame provider or a bounded cached
input timeline. It may not reuse the current audio snapshot for every
historical frame.

### Captured live input

Unrecorded past microphone/tab-capture input cannot be reconstructed. The
runtime must use an explicit policy:

- replay from retained bounded input history when available
- otherwise reset from a declared discontinuity and report that limitation

It must not silently fabricate deterministic history.

## Scope

### In scope

- temporal component contract and runtime evaluator
- component checkpoint creation, lookup, invalidation, and bounded retention
- reuse or consolidation of existing graph checkpoint machinery
- correct per-frame runtime-input provision during replay
- removal of component-level recursive `sampleSettings`
- migration of every current `sampleSettings` consumer
- Light Tunnel wave-event parity
- Neural Network signal-event parity
- Instanced Supercube smoothing parity
- Morph Shapes temporal motion/history parity
- Heartbeat Monitor bounded-history parity
- Signal Cathedral shockwave-event parity
- exact Light Tunnel planning and browser-performance benchmarks
- controlled V1/V2 comparison
- compositor and mirror measurement and optimization
- Light Tunnel renderer hot-path optimization if still required after the
  architectural fixes
- profiler and diagnostic evidence using the existing measurement contract
- documentation, parity, work-ledger, and evidence reconciliation

### Out of scope by default

- visual quality reductions
- disabling bloom, lights, graphs, thumbnails, or the Noise Shader to obtain a
  favorable result
- reverting to DOM/CSS composition as canonical architecture
- a second graph evaluator
- a Light Tunnel-only temporal cache
- editor-owned temporal state
- broad WebGPU migration
- new rendering dependencies
- unrelated feature development

## Forbidden Shortcuts

The goal must not close by:

- memoizing `resolveActiveWaveAges()` while preserving recursive planning as
  the semantic model
- deep-comparing settings on every sampled frame
- caching only the bundled Light Tunnel project identity
- skipping graph evaluation during preview while export uses different
  semantics
- keeping both `sampleSettings` and the new temporal contract indefinitely
- reducing preview resolution or effects as the primary fix
- weakening deterministic seek or export assertions
- hiding long tasks by publishing profiler telemetry less often
- declaring success from source-mode timing without headed browser evidence

## Execution Program

### Phase 0: Preserve, Reproduce, And Pin

- Preserve the existing unrelated Stage strobe work without mixing it into
  temporal-runtime commits.
- Record the exact current worktree and commit baseline.
- Add the exact Light Tunnel planning benchmark before changing runtime code.
- Record cost by frame position to detect time-dependent or superlinear growth.
- Run the pinned V1 and current V2 example under the same device, viewport,
  DPR, quality, audio, warm-up, and observation window.
- Capture current profiler, frame-pacing, canvas, visual, and console evidence.
- Mark the affected parity rows honestly.

### Phase 1: Specify The Minimal Temporal Contract

- Inventory every component and node that depends on historical evaluation.
- Define explicit component state, initialization, stepping, projection, and
  checkpoint identity.
- Define sequential, forward seek, backward seek, cold-frame, edit, and export
  semantics.
- Define historical input-provider behavior for artifacts, files, and captured
  live input.
- Define checkpoint invalidation for project revision, graph edits, transient
  overlays, component implementation version, asset/resource changes, mode,
  FPS, and input provenance.
- Prove the contract with small runtime tests before migrating large scenes.

The phase is complete only when the contract is simpler than the current
recursive callback and has a clear deletion path for it.

### Phase 2: Implement Session-Owned Temporal Evaluation

- Add session-local component state and checkpoints.
- Preserve the fast sequential cursor across live frames.
- Restore the nearest valid checkpoint for random access.
- Replay only the missing interval with correct frame inputs.
- Reuse the existing graph checkpoint mechanism rather than building a
  parallel temporal engine.
- Make checkpoint storage bounded and inspectable.
- Keep cache hits and misses semantically invisible to render-plan output.
- Add timing/inspection boundaries without publishing false GPU or per-graph
  measurements.

### Phase 3: Migrate All Historical Components And Delete The Old API

Migrate, in the smallest safe order:

1. Light Tunnel wave events
2. Neural Network signal events
3. Instanced Supercube smoothing
4. Morph Shapes accumulated rotation and morph history
5. Heartbeat Monitor bounded history
6. Signal Cathedral shockwave events

For each component:

- compare sequential output with cold/random evaluation
- test overlapping events and boundary frames
- test forward and backward seeks
- test graph edits and transient authoring overlays
- confirm preview and export produce the same frame semantics
- remove the historical scan after its replacement passes

After the final migration:

- remove `sampleSettings` from the public component execution contract
- remove recursive frame-plan calls made only for component history
- remove superseded helpers and tests that bless the old shape

No compatibility layer remains by default.

### Phase 4: Certify Light Tunnel Planning And Behavior

- Run the exact project benchmark in sequential, seek, cold-frame, and export
  modes.
- Verify graph outputs and wave events remain visibly correct.
- Verify multiple simultaneous waves, ring travel, wrap identity, palette
  determinism, and axial/light rotation.
- Verify project and graph editing remain live and editable.
- Verify output equality across fresh and warmed sessions.
- Capture deterministic frame hashes or structural render-plan fixtures at
  representative frames.

### Phase 5: Isolate The Remaining Browser Rendering Cost

Only after planning meets budget, measure these independently:

- Light Tunnel layer rendering
- Noise Shader layer rendering
- bloom and disabled depth-of-field pass overhead
- layer-target composition
- `hue` blend composition
- main-canvas presentation
- composite mirrors
- per-layer thumbnail mirrors
- graph overlay open and closed
- quality 1 and device-DPR quality 2

Use fixed variants to attribute cost; do not commit visual degradations as the
measurement mechanism.

### Phase 6: Optimize The Compositor And Mirrors

Apply only measured changes. Likely candidates include:

- avoid redundant full-frame clears, copies, and presentations
- specialize the first opaque normal layer instead of blending it against an
  empty full-frame target
- present the final composite without an unnecessary additional copy when the
  required output contract permits it
- decouple small thumbnail refresh work from the main 60 FPS presentation path
- skip hidden or unregistered mirrors
- preserve correct alpha and all 17 blend modes
- disable `preserveDrawingBuffer` only if capture and mirror paths no longer
  require it and all capture tests pass

Thumbnail behavior must remain useful and visually live. Throttling is allowed
only if controlled V1 comparison shows it does not make the editor feel worse.

### Phase 7: Optimize Light Tunnel Renderer Only If Still Necessary

Do not prematurely replace the retained batching design.

If measurement still identifies Light Tunnel attachment cost, consider:

- separate structural, palette, material, lighting, and motion dirty domains
- avoid rewriting colors when palette identity has not changed
- avoid rewriting static edge topology
- update only transforms or attributes whose values changed
- move uniform ring travel/rotation into GPU transforms where this reduces
  work without complicating authoring or seeking
- retain one batched edge path and one solid instanced path unless evidence
  supports a cleaner alternative

The result must look equivalent to V1/V2 approved reference frames.

### Phase 8: Broad Regression And Product Certification

- Re-run all temporal component tests.
- Re-run graph, preview, interaction, node-editor, waveform, audio, export,
  Stage, Signal Cathedral, and Afterlight Assembly journeys.
- Run the fixed-device Light Tunnel benchmark with the node editor both closed
  and open.
- Run the endurance scenario with Light Tunnel added as a named workload.
- Run `pnpm check:foundation` without weakening gates.
- Run `git diff --check` and review source/dependency metrics.
- Record machine-readable and human-readable evidence.
- Update current state, parity, suggestions, and work ledger.
- Return affected parity rows to `verified` only when their complete acceptance
  criteria pass.

## Performance Acceptance

Final thresholds must include controlled V1-relative comparison. The following
are provisional absolute ceilings for the current Apple M1 Pro development
machine and may be tightened after the pinned baseline is recorded.

### Runtime planning

Exact Light Tunnel fixture, 60 FPS, 1280 x 720, 30 warm-up plus at least 210
measured sequential frames:

- mean frame-plan time: at most 3 ms
- p95 frame-plan time: at most 5 ms
- maximum after warm-up: at most 8 ms
- no growth with playhead position beyond 25% measurement noise once temporal
  checkpoints are warm
- cold-frame and seek results deeply equal sequential results

### Headed editor playback

Fixed device, browser, viewport, DPR, quality, project, audio, warm-up, and
five-second-or-longer observation window:

- canonical runtime cadence: at least 59 FPS
- p95 total runtime CPU time: at most 12 ms
- p95 foreground frame interval: at most 20 ms
- no post-warm-up interval above 33.33 ms in the acceptance sample
- no Long Task API entry caused by steady-state playback
- no blank, frozen, stale, or skipped graph/debug presentation
- V2 must not be more than 10% worse than the controlled V1 p95 without an
  explicit product decision

### Interaction under load

With Light Tunnel playing and its graph editor open:

- continuous controls remain visibly live during drag
- pointer-to-visible p95 remains within the established interaction budget
- pointer-rate changes create zero project revisions
- release creates exactly one intended history commit
- graph pan, zoom, selection, and live-output display remain smooth

### Visual and functional parity

- default Light Tunnel and Noise Shader composition matches the approved V1
  reference in structure, color, bloom, fog, lighting, motion, and blending
- wave trigger timing and overlapping-wave behavior remain correct
- seeking, pause/resume, audio switching, and export remain correct
- thumbnails, debug values, and node live values remain useful and current

## Correctness Test Matrix

The goal must cover at least:

- sequential frame `N -> N + 1`
- repeated evaluation of the same frame
- cold evaluation at an arbitrary frame
- forward seek across multiple checkpoint intervals
- backward seek
- loop boundary
- project revision with unchanged temporal semantics
- component setting edit
- graph value edit
- graph topology edit
- transient live overlay during a continuous gesture
- commit after transient overlay
- component enable/disable and layer deletion
- FPS and duration changes
- audio source/provenance changes
- resolved artifact/resource revision changes
- independent concurrent sessions
- overlapping trigger events
- missing historical live-capture input
- deterministic preview/export equality

## Benchmark And Harness Changes

The generic runtime-preview benchmark remains useful, but it is insufficient
because its default components have no graph-driven historical inputs.

Add:

- a named exact-project Light Tunnel planning benchmark
- a temporal cold/sequential/seek equivalence benchmark
- frame-position scaling measurements
- headed Light Tunnel playback performance coverage
- Light Tunnel in the endurance workload inventory
- V1/V2 report comparison through the existing performance comparison tools

Machine-readable reports should record:

- commit and project identity
- device, OS, browser, viewport, DPR, and quality
- warm-up and measurement windows
- plan, attachment, total runtime, display interval, and long-task metrics
- active layers, graphs, nodes, mirrors, and post-processing settings
- visible-pixel and changing-frame proof
- console and page diagnostics

## Architecture Guardrails

- `VizSession` remains the live session and history truth.
- `VizProjectDocument` remains the portable authored truth.
- Runtime temporal state never moves into React or Zustand editor stores.
- Preview and export use the same component and graph semantics.
- Checkpoint caches are per-session optimizations, not hidden project content.
- Graph and component state remain explicit and replayable.
- Historical input provenance is explicit.
- Render plans remain deterministic and serializable.
- The renderer does not become the owner of temporal scene meaning.
- No V1 compatibility layer survives after the replacement is proven.
- Simplicity is preferred over a generic event framework unless more than one
  real consumer proves that framework removes code.

## Worktree And Commit Discipline

The goal begins with pre-existing uncommitted Stage strobe changes in:

- `packages/viz-renderer-three/src/programs/stage-scene.ts`
- `tests/foundation/three-renderer.test.ts`

They must be preserved and kept out of temporal-runtime commits unless they are
first stabilized as their own coherent milestone.

The goal authorizes local implementation, tests, documentation, benchmarks,
browser verification, and coherent local commits under the autonomous
operating contract. It does not independently authorize publishing,
deployment, package release, or unrelated external changes.

## Stop Rules

Stop and request direction if:

- meeting 60 FPS would require visible quality or feature loss
- deterministic seek and V1 live behavior cannot both be preserved under one
  clean contract
- captured-live-input policy requires a product choice beyond an honest reset
  or bounded-history behavior
- a new dependency or browser API becomes architecturally necessary
- a public contract change would materially alter external package consumers
  rather than cleanly replace an internal V2 alpha contract
- unrelated user work cannot be separated safely

Ordinary implementation, test, benchmark, or browser failures are not stop
conditions.

## Completion Contract

This goal is complete only when:

- recursive component historical frame planning is removed
- `sampleSettings` is deleted from the component execution contract
- all current temporal component consumers use explicit state/checkpoints
- sequential, cold, seek, and export outputs agree
- historical replay uses correct per-frame inputs
- the exact Light Tunnel planning benchmark meets budget
- the exact headed Light Tunnel example sustains approved 60 FPS V1 parity
- visual output and authoring behavior remain equivalent or better
- compositor and mirror overhead is measured and any material regression fixed
- no performance result is achieved by disabling features or lowering default
  quality
- Light Tunnel is permanently included in performance and endurance coverage
- all affected parity rows are truthfully recertified
- `pnpm check:foundation` and goal-specific validation pass
- docs, evidence, current state, suggestions, parity, and work ledger agree
- the final diff contains no obsolete bridge, duplicate temporal truth, or
  unrelated changes

## Completion Result

Goal Four completed at implementation revision
`e22bb574ed89d0fbf9e485df50de2c15d9292e80`.

- `sampleSettings` and recursive component historical planning are deleted.
- All six historical components use the explicit temporal-step contract.
- Runtime sessions own sparse graph/component checkpoints, bounded input
  history, and explicit live-input discontinuity origins.
- One preview loop owns transport synchronization and frame publication.
- Normal media playback advances authored frames sequentially and reports zero
  missing-input frames in the exact headed fixture.
- Live authoring overrides receive edit-only forced presentation frames without
  advancing time or writing pointer-rate history.
- Mirror readback is paced during playback, distributed while paused, and
  deferred during live gestures.
- The exact planning benchmark measures 1.775 ms mean, 2.609 ms p95, and 3.098
  ms maximum after 30 warm-up frames.
- The warmed scaling run finishes slightly faster than it begins, proving
  bounded playhead cost.
- Headed quality-2 playback measures 60.20 FPS closed and 60.33 FPS graph-open,
  with 9.20 / 9.00 ms display p95, 1.50 / 2.00 ms total runtime CPU p95, zero
  long tasks, zero intervals above 33 ms, and zero issue frames.
- Graph-open continuous editing measures 21.60 ms pointer-to-visible p95, zero
  revisions during pointer movement, and one revision on release.
- Six-cycle endurance includes Light Tunnel and finishes with 5.86 MB heap
  growth, stable before/after frame pacing, bounded resources, and no
  diagnostics.
- The pinned V1 production comparison is recorded with its observed diagnostic
  caveats; final V2 is materially faster and independently meets the absolute
  60 FPS contract.
- Manual quality-2 review confirms the approved neon tunnel, composition,
  bloom/fog, graph overlay, waveform, and layer-thumbnail experience remains
  intact and visibly moving.
- `preview.live-rendering` and `performance.playback-smoothness` are verified
  again, and the complete foundation gate passes.

Full evidence:
[Temporal Runtime And Light Tunnel Performance Certification](../../parity/evidence/2026-08-04-temporal-runtime-and-light-tunnel-performance.md).

## Likely Direction After Completion

After temporal and playback performance are certified, VizEngine can resume
feature expansion from a trustworthy real-time base. The likely next choices
are:

1. generic `Model3D` authoring and preparation
2. masks, passes, and effect-graph composition
3. broader reusable component/node libraries
4. character/facial/speech performance systems
5. hosted rendering and Viz Cloud work when product needs justify them

Those directions should not begin on top of a runtime that cannot play its
preserved flagship examples smoothly.
