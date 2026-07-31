# Profiler Measurement Contract

Last reconciled: 2026-07-31

## Purpose

This document defines what VizEngine's browser profiler measures. It is a
semantic contract, not a pasted implementation snapshot.

The profiler must:

- name measurements according to their real source
- keep editor cadence, canonical runtime work, browser blocking, and static
  capability information distinct
- show unavailable information honestly instead of inventing zero
- collect at a lower publication rate than the runtime and display loops
- never mutate the canonical project

Acceptance evidence, fixed-device results, screenshots, and browser boundaries
are recorded in
[Goal Three Profiler And Performance Statistics](./parity/evidence/2026-07-31-goal-three-profiler-and-performance-statistics.md).

## Measurement Sources

| Measurement | Source | Meaning |
| --- | --- | --- |
| Editor FPS | Foreground `requestAnimationFrame` callbacks | Browser display-callback cadence during each sample window. |
| Render Cadence | Canonical runtime inspection publications | Completed runtime render cycles per second. |
| Frame Plan | Canonical runtime inspection timing | CPU wall time used to construct the deterministic frame plan, including graph evaluation. |
| Renderer Attachment | Canonical runtime inspection timing | CPU wall time used to attach the plan to the browser renderer/compositor. |
| Total Runtime | Canonical runtime inspection timing | CPU wall time from runtime-frame evaluation start through renderer attachment completion. |
| Plan Issues | Canonical frame plan | Current deterministic planning issue count. |
| Long-task Share | Browser Long Task API | Percentage of the sample window occupied by tasks of at least 50 ms. |
| Longest Long Task | Browser Long Task API | Longest qualifying task observed in the sample window. |
| Frame intervals | Foreground `requestAnimationFrame` timestamps | Nonoverlapping display-callback intervals. Intervals above 33.33 ms are classified as slow. |
| Layer CPU Submit | Renderer attachment measurement | Browser CPU wall time spent submitting one layer's attachment work. |
| Graph Evaluation | Canonical frame-plan result | Graph identity, node count, and issue count. Graph execution time is included in aggregate frame-plan time. |
| Memory | Chromium `performance.memory` | Current JavaScript heap values when the API exists. |
| GPU capability | WebGL context parameters | Static vendor, renderer, and maximum-texture information; never live utilization. |
| Storage | `navigator.storage.estimate()` | Browser-managed usage and quota estimate when supported. |

## Explicit Non-Measurements

The profiler does not claim:

- total process or system CPU utilization
- portable GPU utilization
- GPU execution duration
- per-graph execution time
- frames actually presented by the operating-system compositor

Those values require a trustworthy platform or runtime source before they may
appear. Editor-side stopwatch guesses are not an acceptable substitute.

## Collection And Publication

Runtime completions, graph results, long tasks, and display intervals accumulate
locally. Compact telemetry is published to the profiler store every 500 ms.
Memory publishes every second and storage every five seconds.

```text
runtime and browser observations
  -> monitor-local accumulation
  -> bounded telemetry publication
  -> live cards
  -> optional recording snapshots
```

The graph map is replaced in one publication from the current canonical
project and runtime results. It is not updated through one store mutation per
graph.

Visibility changes reset foreground clocks. A background-tab gap is not a
display interval. Closing Performance disables all collection; hiding the
panel does not leave invisible monitoring active.

## Recording Semantics

A `PerformanceSnapshot` contains:

- editor cadence
- the display intervals observed during that recorder window
- memory, main-thread long-task, and storage values
- per-layer CPU-submit and draw-call values
- graph identity, node count, issue count, and nullable execution time

The recording schema uses:

- `mainThread`
- `longTaskShare`
- `longestLongTask`
- `cpuSubmitTime`
- `frameTimes` for raw foreground display intervals

Statistics count actual display intervals, not recorder samples. The interval
stability score is `1 - coefficientOfVariation(frameTimes)` and is zero when
no display intervals were observed. A slow interval is greater than 33.33 ms.

Live cards, the statistics dialog, JSON report, chart-data export, CSV, chart
labels, and chart filenames must use the same vocabulary.

## Runtime Ownership

Profiler collection is a browser attachment around canonical runtime
inspection:

```text
VizProjectDocument
  -> VizSession runtime evaluation
  -> runtime inspection publication
  -> profiler monitor
  -> optional recorder/report
```

The profiler cannot write project actions, project history, graph values,
transport state, render plans, or exported scene semantics.

## Browser Boundaries

- `performance.memory` is Chromium-specific.
- the Long Task API is not uniformly available in every browser
- WebGL renderer information may be masked
- storage values are estimates
- fixed-device overhead results apply only to the recorded environment and
  workload

Unsupported APIs must leave an honest unavailable or no-data state without
changing the meaning of another metric.

## Validation

The contract is protected by:

- foundation tests for interval counting and report projection
- editor-control lifecycle tests
- a headed playback journey covering profiler open, live runtime values,
  recording, statistics, reset, close, project immutability, and diagnostics
- the fixed-device measurements and controlled V1/V2 comparison linked above

Any future metric change must update this contract, the parity evidence, and
all live/recorded/exported labels together.
