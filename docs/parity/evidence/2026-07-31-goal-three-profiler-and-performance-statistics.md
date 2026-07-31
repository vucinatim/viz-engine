# Goal Three Profiler And Performance Statistics

Date: 2026-07-31

Status: profiler and performance-stat capabilities verified; broader Goal
Three parity, agent tooling, and the second production remain open.

## Purpose

This checkpoint certifies the editor profiler as a truthful browser diagnostic,
not merely a preserved V1 panel.

The durable metric definitions live in the
[Profiler Measurement Contract](../../profiler-measurement-contract.md).

The pinned V1 surface was compared with V2 at:

- 1600 × 1000 CSS pixels
- device pixel ratio 1
- dark color scheme
- the same `simple-example` project
- quality multiplier 1
- active preview rendering
- the profiler expanded

Artifacts:

- [Pinned V1 profiler](./artifacts/2026-07-31-goal-three-v1-profiler-1600x1000.png)
- [V2 profiler](./artifacts/2026-07-31-goal-three-v2-profiler-1600x1000.png)

V2 retains the compact overlay, recorder, editor cadence, memory, GPU
capability, storage, layer, and graph sections. It adds a canonical-runtime
section because the deterministic runtime now exposes useful work boundaries
that V1 did not.

## Audit Findings

The V1-derived implementation contained measurements whose labels were more
confident than their sources:

- `Frame Budget` divided foreground `requestAnimationFrame` intervals by
  16.67 ms. Ordinary 60 Hz cadence therefore appeared as `100%` CPU or frame
  budget, even though browser CPU utilization was never observed.
- node-network computation displayed `0.000 ms` when the canonical V2 runtime
  had no per-graph timing source
- layer `Render Time` measured browser CPU time spent submitting attachment
  work, not GPU execution
- background-tab gaps could contaminate minimum FPS
- recorder samples were counted as frames even though one sample can contain
  many display intervals
- a hidden profiler could remain enabled indefinitely after its first use

V2 removes those false implications. Unsupported data is omitted or named as
unavailable; it is never replaced with a plausible zero.

## Documented Measurement Contract

| Surface | Meaning |
| --- | --- |
| Editor FPS | Foreground browser `requestAnimationFrame` cadence. |
| Render Cadence | Completed canonical runtime render cycles per second. |
| Frame Plan | CPU wall time for deterministic frame-plan construction, including graph evaluation. |
| Renderer Attachment | CPU wall time spent attaching the plan to the browser renderer/compositor. |
| Total Runtime | CPU wall time for the complete inspected runtime render cycle. |
| Plan Issues | Current deterministic frame-plan issue count. |
| Long-task Share | Percentage of the sampling window occupied by Long Task API entries of at least 50 ms. It is not total CPU usage. |
| Longest Long Task | Longest Long Task API entry in the sampling window. |
| Frame intervals | Nonoverlapping foreground `requestAnimationFrame` intervals. A slow interval is longer than 33.33 ms. |
| Layer CPU Submit | Browser CPU wall time used to submit that layer's attachment work. It is not GPU execution time. |
| Graph Evaluation | Included in aggregate frame-plan time. Per-graph timing is not claimed because the runtime does not expose it. |
| Memory | Chromium `performance.memory` values when available. |
| GPU | Static WebGL vendor, renderer, and maximum-texture capability; not live GPU utilization. |
| Storage | Browser storage estimate and quota when supported. |

The same names flow through live cards, recording snapshots, statistics,
downloadable report data, CSV, chart labels, and chart ZIP filenames. Internal
recording fields use `mainThread`, `longTaskShare`, and `longestLongTask`; the
old CPU/budget terminology is not retained as a second vocabulary.

## Runtime And Lifecycle Design

High-frequency runtime inspections and display intervals accumulate in local
monitor state. The profiler publishes compact telemetry to its Zustand store
twice per second. Memory publishes once per second and storage every five
seconds.

This keeps measurement and presentation frequencies separate:

```text
runtime/display events
  -> local interval accumulators
  -> 500 ms telemetry publication
  -> profiler cards and optional recorder
```

Opening Performance enables collection and mounts the collapsed trigger.
Closing it disables collection and removes the trigger. Reset clears sampled
values while preserving static GPU capability already discovered for the
current browser. Visibility changes reset foreground clocks, so returning from
a background tab does not invent a severe frame interval.

Graph identity and issue counts come from canonical runtime inspection.
Existing graphs are initialized from `VizSession`'s working project rather
than a legacy graph store.

## Fixed-Device Overhead

A direct Chrome measurement on the Apple M1 Pro used the same simple project,
quality multiplier 1, active playback, and five-second windows:

| State | Runtime cycles | Window | Observed cadence |
| --- | ---: | ---: | ---: |
| Profiler disabled | 296 | 5000.5 ms | 59.194 FPS |
| Enabled, collapsed | 287 | 5001.0 ms | 57.389 FPS |
| Enabled, expanded | 294 | 5001.0 ms | 58.788 FPS |

The collapsed sample was 3.05% below the disabled sample. The expanded sample
was 0.69% below it, demonstrating ordinary run noise rather than an
expanded-panel cost. Every window advanced approximately 300 display frames.
This is a bounded diagnostic cost on the measured device, not a universal
hardware guarantee.

The headed regression journey additionally compares 1.5-second baseline and
profiled runtime-cycle windows under Playwright's pathological software-render
conditions. It requires profiled throughput to retain at least 60% of baseline
while still advancing. The loose threshold prevents SwiftShader variance from
masquerading as a product benchmark; the real-device numbers above are the
performance evidence.

## Browser And Recording Proof

The dedicated headed Chromium journey:

- starts canonical preview playback
- records an unprofiled runtime-cycle baseline
- enables Performance through the visible View menu
- opens the accessible profiler trigger
- observes positive canonical render cadence
- verifies graph work is described as included in the frame plan
- verifies `Long-task Share` is present and `Frame Budget` is absent
- records a named session during real playback
- opens the resulting statistics dialog
- verifies frame and long-task meanings remain visible there
- resets and closes the profiler
- verifies the canonical project revision never changes
- accepts no unexpected console warning, console error, page error, or invalid
  dialog DOM

The focused journey passed in approximately 1.1 minutes after the final
lifecycle and naming changes.

Focused deterministic tests also prove:

- actual display intervals, rather than recorder snapshots, determine total
  and slow-interval counts
- long-task time-series projection and uncapped layer CPU-submit aggregation
- symmetric enable/show and disable/hide editor-control behavior
- reset and layer-FPS semantics

## Assumptions And Boundaries

- The fixed-device numbers describe Apple M1 Pro, Chrome, the simple sample,
  and the stated viewport. Other projects and machines need their own
  recordings.
- WebGL does not provide portable live GPU utilization or GPU duration here.
  No card or report claims either.
- Browsers do not expose portable total process CPU utilization. Long-task
  share describes blocking work only.
- Memory details are Chromium-specific. Unsupported browser APIs retain an
  honest unavailable/zero-data state and do not redefine the metric.
- Firefox and WebKit API breadth is not certified by this Chromium checkpoint.
- Per-graph timing may become useful later, but it must be added at the
  canonical runtime evaluation boundary. Reintroducing editor-side stopwatch
  guesses would violate this contract.

## Validation

The complete foundation gate passed:

- 42 valid parity rows: 11 verified, 31 partial, zero gaps, and zero unaudited
- clean package dependency architecture
- formatting, strict lint, and all package/studio/tool type checks
- 56 Vitest files and 258 deterministic tests
- all 12 active headed Chromium journeys in 3.5 minutes; the fixed-device
  interaction benchmark remained intentionally opt-in and skipped
- every package build and the studio production build
- built-package consumer and agent creative-loop smoke scenarios
- fixed-size V1/V2 visual inspection

The headed product suite includes canonical editing/history, transport and
audio synchronization, every bundled sample, layer diagnostics, the new
profiler/recorder workflow, alpha and blend composition, portable model assets,
graph authoring, file roundtrip, still and video export, and bounded resource
churn.

The first full-gate attempt left the two manual V1/V2 comparison tabs actively
rendering while Playwright also recorded video and trace data. That
cross-process contention caused the transport journey to observe 4.20 frames
of audio/state skew against its strict `<4` threshold. The same test reproduced
at 4.28 while the comparison tabs remained active, then passed unchanged in
26.3 seconds immediately after those tabs were closed. The clean complete gate
also passed the original assertion. No product code or tolerance was changed
to hide the contention.

Goal Three remains open after this checkpoint.
