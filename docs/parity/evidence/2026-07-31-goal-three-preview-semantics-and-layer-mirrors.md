# Goal Three Preview Semantics And Layer Mirrors

Date: 2026-07-31

Status: multi-layer and focused-mirror parity verified; broader playback and
long-session performance certification remains open.

## Outcome

The editor preview still has one canonical scene evaluation, one retained
Three controller, one WebGL context, and one visible runtime canvas. Layer-card
previews are read-only presentations of retained layer targets. They do not
own clocks, runtime sessions, scene state, or render loops.

This checkpoint closes the remaining semantic and lifecycle gaps around those
presentations:

- focused mirrors now size their backing buffers from their actual displayed
  dimensions and the editor quality multiplier instead of retaining the
  browser's distorted `300 × 150` canvas default
- a backing-buffer resize explicitly invalidates the canonical preview so the
  next presentation cannot remain blank
- layer visibility is an accessible button interaction with visible keyboard
  focus, accurate pressed state, and the preserved hover language
- hiding a layer removes it from the canonical render plan and unmounts its
  registered mirror; restoring visibility registers one mirror again without
  creating another runtime canvas
- mirror pixels receive layer opacity once from the compositor presentation
  path; CSS does not attenuate them a second time

## Hidden, Frozen, And Export Semantics

Visibility remains a canonical layer property. Disabled layers are omitted by
the runtime frame plan, so preview and export consume the same ordered visible
layer set.

`surface.freezeWhenPaused` has deliberately narrow semantics:

- while live playback runs, the preview records the latest layer audio input
- while live playback is paused, opted-in layers retain that last playing
  snapshot
- layers that explicitly opt out continue consuming the current live input
- render/export mode never uses the editor's paused-live snapshot and always
  consumes the requested canonical frame input

A deterministic two-layer Curve Spectrum proof exercises all four cases.
This avoids conflating “freeze while the editor is paused” with freezing
timeline time, project values, or deterministic export.

## Live Interaction Contract

Continuous authoring gestures retain the established two-phase contract:

1. pointer-rate changes publish through the transient live-value channel and
   invalidate presentation without mutating the project or history
2. pointer release creates one canonical mutation and one useful history unit

The fixed-device Curve Spectrum rerun measured 20 physical slider gestures:

| Measure | Mean | P95 | Maximum |
| --- | ---: | ---: | ---: |
| Pointer to transient publication | 0.25 ms | 0.30 ms | 0.40 ms |
| Pointer to runtime publication | 2.08 ms | 2.20 ms | 3.50 ms |
| Pointer to visible frame | 7.73 ms | 8.60 ms | 10.00 ms |
| Release to canonical mutation | 0.32 ms | 0.40 ms | 0.70 ms |

This is the intended architecture for sliders and other high-frequency
controls: React may own the durable control shell, but the project tree and
history do not rerender or mutate on every pointer sample.

## Headed Acceptance

The permanent compositor journey now proves, in real headed Chromium:

- exactly one runtime preview canvas with two simultaneously registered layer
  mirrors
- mirror backing dimensions equal displayed dimensions multiplied by editor
  quality
- each focused mirror contains the correct retained layer pixels at canonical
  time
- a `0.65` layer is presented with alpha near `166`, once
- hiding the source removes its mirror and render-plan entry and leaves the
  expected backdrop pixels in the final canvas
- restoring the source restores the mirror and render-plan entry while the
  runtime-canvas count remains one
- all 17 canonical blend modes and nested alpha still match Canvas2D
- bounded duplicate/delete/playback churn returns canvas and project resource
  counts to the original state
- profiler collection does not prevent canonical runtime progress
- browser console, page, and WebGL diagnostics remain clean

The same implementation was manually inspected in the in-app browser. Before
the repair, each `114 × 64` layer preview used a `300 × 150` backing bitmap;
after the repair it uses `228 × 128` at quality `2`, preserving the displayed
aspect ratio.

## Fixed-Device Evidence

The machine-readable rerun is
[2026-07-31-goal-three-preview-semantics-performance.json](./artifacts/2026-07-31-goal-three-preview-semantics-performance.json).

Environment and fixture:

- Apple M1 Pro, arm64
- headed Chromium 151.0.7922.34
- `1600 × 1000`, DPR 1
- four layers including Curve Spectrum and three active graphs
- bundled media-element audio
- 3-second warm-up and 5-second playback observation
- 20 physical parameter and graph gestures

The final isolated rerun recorded runtime interval median `19.00 ms`, p95
`24.20 ms`, maximum `39.30 ms`, and 12 of 271 intervals above the declared
25 ms long-frame threshold. It produced no diagnostics. The interaction path
improved relative to the earlier single-compositor capture, but the playback
tail is currently more variable.

## Honest Boundary

This checkpoint verifies `preview.multi-layer-compositing` and
`preview.layer-mirror`. It does not mark `preview.live-rendering` or any broad
performance row complete.

The canonical runtime continuously advances and representative interaction
latency is excellent, but the latest fixed-device playback capture is not
strong enough to call the full product smoothness question settled. The prior
single-compositor capture was better; the current variance must be explained
or bounded through the dedicated playback and soak work rather than hidden by
selecting only the favorable run.

## Validation

- `pnpm exec vitest run tests/foundation/editor-runtime-preview-plan.test.ts tests/foundation/editor-runtime-preview-attachment-store.test.ts`
- focused lint and studio typecheck
- headed canonical compositor journey
- headed profiler, compositor, and bounded-resource journeys: 3 passed
- fixed-device Curve Spectrum interaction workload: 1 passed
- manual in-app-browser ownership and backing-resolution inspection

The complete foundation gate passed:

- 42 parity rows: 35 verified, 7 partial, zero gaps or unaudited rows
- clean 17-package dependency architecture, formatting, lint, and all package,
  studio, and tool type checks
- 62 deterministic-test files and 277 tests
- all 15 active headed Chromium journeys plus one ordinary-gate opt-in skip
- all package builds and the studio production build
- packed-consumer and creative-loop smoke scenarios
