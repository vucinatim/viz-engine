# Goal Three Fixed-Device Interaction Performance

Date: 2026-07-31

Status: V2 fixed-device checkpoint; controlled V1 comparison and broader
workload certification remain open.

## Purpose

This checkpoint turns the continuous-edit contract into repeatable headed
browser evidence. It covers the exact interaction invariant:

```text
pointer movement
  -> transient session overlay
  -> ordinary runtime evaluation
  -> visible renderer update

pointer release
  -> one canonical transaction
  -> one revision/history result
  -> transient overlay cleared
```

React owns control presentation and editor structure. It is not the
pointer-rate project bus, the runtime clock, or the graph-canvas movement
store.

## Architectural Repairs

Measurement exposed and removed four sources of avoidable work:

- Full session and host snapshots were constructed for listeners that only
  needed a change notification. Lightweight subscriptions now avoid cloning
  the project, action history, graph summaries, resources, and runtime state.
- The Jobs badge subscribed to the complete control snapshot on every
  transport tick. It now subscribes only to the job service.
- The app store and editor session held separate deep-cloned versions of the
  same canonical project. The UI now reads the trusted immutable session view,
  preserving unchanged layer identity and allowing projected layer reuse.
- Runtime-session replacement copied every temporal graph checkpoint.
  Replacement now carries only the nearest valid checkpoint, and
  graph-layout-only revisions retain the current runtime session entirely.

React Flow now owns transient pointer-rate node positions through its
canvas-local store. Canonical graph positions are committed once when dragging
ends. Protected endpoint deletion remains guarded through React Flow's
pre-delete contract.

The preview clock also changed from integer animation-frame skipping to a
deadline-carrying scheduler. On a 144 Hz display, the former implementation
rendered every third display frame at about 48 Hz. The new clock averages the
authored 60 Hz cadence without evaluating at the display refresh rate.

The numeric slider readout uses the same control-local live value as the thumb,
so the value shown during a drag is the value sent to the transient runtime.

## Repeatable Harness

Run:

```bash
pnpm benchmark:editor-interaction
```

The dedicated Playwright configuration uses:

- headed Chromium
- 1600 × 1000 CSS pixels
- device scale factor 1
- one worker
- no video, trace, CPU throttling, or network throttling
- three-second playback warmup
- five-second frame-pacing sample
- 20 slider gestures and 20 graph-node gestures

The harness asserts:

- the selected sample and rendered layer identities
- live numeric readout changes before release
- canonical revision remains unchanged during slider movement
- exactly one revision is created on slider release
- exactly one revision is created on node-drag release
- no unexpected console warnings, console errors, or page errors

It records display cadence, runtime cadence, pointer-to-transient,
pointer-to-runtime, pointer-to-visible, release-to-mutation,
release-to-runtime, release-to-visible, runtime-plan timings, memory, fixture
identity, browser identity, and raw commit samples.

The full machine-readable report is
[2026-07-31-goal-three-v2-simple-example-interaction-performance.json](./artifacts/2026-07-31-goal-three-v2-simple-example-interaction-performance.json).

## Fixed-Device Results

Environment:

- Apple M1 Pro, arm64
- macOS Darwin 25.5.0
- Chromium 151.0.7922.34
- 1600 × 1000 at DPR 1
- measured display cadence about 144.93 Hz

Playback pacing:

| Measure | Median | P95 | Maximum | Frames over 25 ms |
| --- | ---: | ---: | ---: | ---: |
| Display interval | 6.90 ms | 8.20 ms | 15.20 ms | 0 / 715 |
| Runtime interval | 15.20 ms | 21.30 ms | 23.30 ms | 0 / 300 |

Continuous slider:

| Measure | Mean | Median | P95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Pointer to transient overlay | 0.31 ms | 0.30 ms | 0.50 ms | 0.90 ms |
| Pointer to runtime publication | 2.00 ms | 1.90 ms | 2.30 ms | 3.10 ms |
| Pointer to visible frame | 8.87 ms | 8.90 ms | 10.10 ms | 10.40 ms |
| Release to canonical mutation | 0.33 ms | 0.30 ms | 0.40 ms | 0.70 ms |
| Release to runtime publication | 21.46 ms | 21.20 ms | 22.10 ms | 26.80 ms |
| Release to visible frame | 25.05 ms | 24.70 ms | 25.60 ms | 31.00 ms |

Graph-node movement:

| Measure | Mean | Median | P95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Pointer to visible position | 19.33 ms | 18.60 ms | 26.00 ms | 26.50 ms |
| Release to canonical mutation | 0.54 ms | 0.50 ms | 0.60 ms | 1.20 ms |
| Release to runtime publication | 21.81 ms | 21.80 ms | 22.80 ms | 24.30 ms |
| Release to visible frame | 25.78 ms | 25.30 ms | 27.90 ms | 35.00 ms |

The preview is already showing the final transient value when release occurs.
Release measurements describe canonical settlement, not a period in which the
visual remains stale.

The diagnostic pass initially measured about 46–52 ms of runtime-plan work
after every commit and roughly 70 ms release-to-runtime latency. Nearest
checkpoint carryover and runtime-session reuse reduced measured per-commit plan
work to roughly 0.2–0.5 ms in the final sample and release-to-runtime to about
21–22 ms.

## Deterministic And Product Validation

New focused tests protect:

- deadline scheduling on high-refresh displays
- allocation-free runtime inspection subscriptions
- lightweight session and host change subscriptions
- immutable structural sharing through edits and history
- exported project mutation isolation
- unchanged projected-layer identity after another layer changes
- exact temporal checkpoint resume
- runtime-session reuse for graph-layout-only revisions

The complete foundation gate passed:

- 42 valid parity rows and clean workspace dependency architecture
- formatting and strict ESLint
- all package, studio, and tool type checks
- 56 Vitest files and 249 tests
- all seven standard headed browser journeys in 1.5 minutes
- all package builds and the production studio build
- packed-package consumer smoke
- built agent creative-loop smoke

The dedicated headed performance journey then passed separately with no
diagnostics.

Checkpoint source metrics before documentation:

- production: 354 files / 69,461 lines
- tests: 59 files / 14,337 lines
- all maintained code: 453 files / 89,603 lines

## Honest Boundary

This report is a V2 fixed-device baseline, not final parity certification.

It proves the architecture and Simple Example workload on one machine. It does
not yet prove:

- controlled V1/V2 distributions on the same machine and browser
- large graph, Stage Scene, many-layer, and long-session interaction budgets
- every slider-like control and every catalog component
- the complete 42-capability visual and behavioral audit

Those remain required before Goal Three can close.
