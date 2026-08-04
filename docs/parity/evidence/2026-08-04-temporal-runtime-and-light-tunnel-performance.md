# Temporal Runtime And Light Tunnel Performance Certification

Date: 2026-08-04

Status: certified. The recursive temporal-planning regression is removed, the
exact Light Tunnel project meets the fixed-device planning, playback, graph,
interaction, and endurance budgets, and the two reopened parity rows are
verified again.

Machine-readable results live in
[`artifacts/2026-08-04-temporal-runtime-and-light-tunnel-performance.json`](./artifacts/2026-08-04-temporal-runtime-and-light-tunnel-performance.json).

## Root Cause

The Light Tunnel renderer was not the primary regression. The V2 component
reconstructed wave state by sampling as many as 118 historical frames for each
displayed frame. Every sample recursively constructed a complete frame plan
and reevaluated the project's nine graphs and 57 nodes.

On the Apple M1 Pro fixture, runtime-plan construction alone measured:

| State                 |      Mean |    Median |        p95 |    Maximum |
| --------------------- | --------: | --------: | ---------: | ---------: |
| Regressed V2 baseline | 79.173 ms | 79.061 ms | 140.807 ms | 169.680 ms |
| Final V2              |  1.775 ms |  1.724 ms |   2.609 ms |   3.098 ms |

The baseline exceeded the complete 16.67 ms frame budget before WebGL work
began. V1 advanced retained wave state once per sequential frame.

## Canonical Replacement

`VizRuntimeSession` now owns explicit temporal continuity:

- sparse, bounded graph checkpoints
- sparse, bounded component checkpoints
- bounded frame-input history
- an explicit evaluation origin when unavailable live history must reset
- component implementation identity for checkpoint reuse

The component contract exposes one deterministic `temporal.step` operation.
Render plans remain serializable projections of current project, frame,
runtime inputs, and temporal state. Components no longer call back into the
runtime to sample arbitrary historical settings.

All six former historical-settings consumers use the same contract:

- Light Tunnel wave events
- Neural Network signal events
- Instanced Supercube smoothing
- Morph Shapes rotation and morph evolution
- Heartbeat Monitor history
- Signal Cathedral shockwaves

`sampleSettings` and its recursive planning path were deleted rather than kept
as a compatibility bridge.

## Input And Seek Semantics

Baked and artifact-backed evaluation samples the canonical audio-feature
timeline for every replayed frame. Sequential live evaluation stores each
observed runtime input in the session's bounded input history.

Unrecorded live history is never synthesized. A backward seek, large live
frame gap, cold nonzero live start, project switch, or semantic session rebuild
starts a new bounded evaluation origin and emits
`temporal-input-unavailable`. Normal playback is phase-locked to the media
clock while advancing authored frames sequentially, so the exact headed run
contains no skipped temporal inputs or issue frames.

Cold, sequential, repeated, forward-seek, backward-seek, transient-edit, and
export behavior share the same graph/component evaluator. Focused fixtures
prove output equivalence when deterministic inputs are available and explicit
discontinuity when they are not.

## Presentation Architecture

The editor previously had independent transport and preview animation loops.
Their relative scheduling could publish duplicate frames, skip authored
frames, and make graph-open playback especially uneven. One canonical preview
loop now synchronizes transport and renders the same frame.

Live authoring overrides use a forced presentation frame. This frame:

- bypasses the normal 60 FPS deadline once
- does not advance media or authored time
- does not create a project revision
- renders the transient value directly through the canonical runtime
- defers secondary layer-mirror readback until the gesture ends

Release still produces exactly one history commit.

## Mirror And Compositor Isolation

Variant measurement showed that synchronous full-resolution layer-mirror
readback, not the retained Light Tunnel program, was the remaining display
cost. Fully disabling mirrors restored 60 FPS, establishing causality.

The accepted implementation preserves the feature:

- static refreshes are distributed across animation frames
- playback presents at most one round-robin mirror every three runtime frames
- transient gestures update the main scene immediately and refresh mirrors
  after commit
- hidden or absent mirrors perform no work

An asynchronous `createImageBitmap` experiment was rejected because rapid
layer switching could leave one isolated layer snapshot stale. The final path
uses the simpler, exact synchronous copy behind explicit cadence and gesture
backpressure.

Both layer thumbnails remain populated; the animated Noise layer changes in
the sampled motion window, and manual inspection confirms the Light Tunnel
thumbnail represents its isolated layer. The main composite, graph values, and
debug/runtime publications remain live.

## Fixed-Device V2 Result

Environment: Chromium 151.0.7922.34, macOS 25.5 arm64, Apple M1 Pro,
1600 x 1000 viewport, DPR 1, quality 2, two enabled layers, nine graphs, 57
nodes, two layer mirrors.

| Measurement                      | Graph closed | Graph open |    Budget |
| -------------------------------- | -----------: | ---------: | --------: |
| Runtime cadence                  |    60.20 FPS |  60.33 FPS | >= 59 FPS |
| Display interval p95             |      9.20 ms |    9.00 ms |  <= 20 ms |
| Planning p95                     |      1.00 ms |    1.60 ms |   <= 5 ms |
| Total runtime CPU p95            |      1.50 ms |    2.00 ms |  <= 12 ms |
| Display intervals above 33.33 ms |            0 |          0 |         0 |
| Long tasks                       |            0 |          0 |         0 |
| Temporal issue frames            |            0 |          0 |         0 |

The five-second closed sample rendered 301 unique frames across a 301-frame
span. The graph-open sample rendered 181 unique frames across a 181-frame span.
Graph state changed 192 and 181 times respectively. The main canvas was
nonblank and changed; all layer mirrors were nonblank; diagnostics and final
runtime issues were empty.

The graph-open live opacity gesture measured across 12 sustained samples:

| Boundary                           |      p95 |
| ---------------------------------- | -------: |
| Pointer to transient session state |  0.40 ms |
| Pointer to runtime publication     | 18.90 ms |
| Pointer to visible frame           | 21.60 ms |

Pointer updates created zero project revisions. Release created exactly one.
Maximum pointer-to-visible latency was 27.00 ms.

## Planning Stability

The required 30-warm-up / 210-frame source benchmark meets every absolute
budget. A separate 300-warm-up / 300-frame run measured 2.419 ms mean, 3.069 ms
p95, and 3.681 ms maximum. Its first 30-frame bucket averaged 2.449 ms and its
last averaged 2.344 ms, proving that cost does not grow with playhead position
after temporal windows are warm.

## Pinned V1 Comparison

The immutable V1 reference is
`e806fbc10980615588b52ff574bc923c6f00f35e`. It was built and served in
production mode under the same Chromium, 1600 x 1000 viewport, DPR 1, quality
2, three-second warm-up, and five-second sample.

The V1 canvas was nonblank and changing, but the pinned build emitted its
persisted-node-store fallback, three missing-resource responses, and bundled
audio decode failure. Its display sample measured 11.9 ms median, 41.7 ms p95,
275 ms maximum, and 28 intervals above 33 ms. This is retained as a
conservative immutable comparison, not misrepresented as a pristine V1
ceiling.

Final V2 is materially faster than that pinned run and also satisfies the
absolute 60 FPS contract independently. This agrees with the product intent
behind the user's remembered smooth V1 experience without depending on the
imperfect pinned build to define success.

## Endurance

The six-cycle headed endurance scenario now includes:

- simple-example
- Stage with bundled models
- Signal Cathedral with its graph open
- Light Tunnel with its graph open

Forced-GC heap growth was 5.86 MB. Display p95 was 9.7 ms before the workload
and 9.8 ms after it, with zero intervals above 25 ms in either sample. Final
resource, subscriber, audio, canvas, and project counts returned to the
expected baseline shape, and diagnostics were empty.

## Manual Visual Review

The final exact project was reopened at quality 2 in the real editor. The
scene retained its neon cube tunnel, fog, bloom, axial depth, red/blue palette,
Noise composition, waveform, editable graph overlay, and both layer
thumbnails. Two screenshots taken 1.2 seconds apart during audio playback were
byte-different. Playback was paused before handoff.

No effect, layer, graph, mirror, or quality setting was disabled to obtain the
result.

## Assumptions And Boundaries

- The pinned V1 comparison is intentionally reported with its observed
  diagnostics rather than cleaned or cherry-picked after the fact.
- Unbaked live audio outside retained input history has an explicit reset
  boundary. Artifact-backed preview/export remains the deterministic random
  access path.
- A layer whose isolated image is visually stationary during a short sample is
  not required to produce changing hashes; all mirrors must remain populated
  and represent the current isolated layer.
- Higher thumbnail refresh rates would require a trustworthy GPU-native or
  asynchronously fenced capture path. The rejected stale-bitmap experiment is
  not retained.

## Complete Gate

`pnpm check:foundation` passed from one final run:

- parity: 42 verified, zero partial, gap, or unaudited capabilities
- architecture: 18 packages with no upward dependencies, cycles, undeclared
  workspace imports, or Node entrypoint leaks
- formatting, ESLint, and all package, app, and tool type checks
- deterministic tests: 65 files, 299 tests
- headed Chromium: 16 passed, 3 intentional opt-in skips
- all 18 package builds and the Studio production build
- built consumer and creative-loop smoke scenarios
