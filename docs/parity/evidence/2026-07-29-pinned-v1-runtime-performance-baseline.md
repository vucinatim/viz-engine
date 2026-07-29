# Pinned V1 Runtime Performance Baseline

Date: 2026-07-29

## Purpose

Establish the immutable V1 half of a fixed-device browser comparison and add a
repeatable pass/fail comparison command before making any V2 performance-parity
claim.

The reference revision is:

```text
e806fbc10980615588b52ff574bc923c6f00f35e
```

This document establishes the baseline half of the comparison. The matching V2
candidate and bounded soak are now recorded in
`2026-07-29-v2-performance-and-video-certification.md`.

## Controlled Fixture

- browser: Chrome 150.0.0.0
- GPU: Apple M1 Pro through ANGLE Metal
- CSS viewport: 1280×720
- device pixel ratio: 2
- editor quality: 2
- project: `simple-example`
- layers: Fullscreen Shader, Simple Cube, Noise Shader
- active node networks: 3
- audio: `[HipHop] 808 Rap.mp3`
- observation window: 30 seconds
- recorder sample rate: 500 ms

V1 ran from a detached worktree at the pinned commit. The existing editor
performance recorder produced 62 samples. The profiler panel was forced open
in that disposable worktree so the recorder could be operated deterministically;
no runtime, component, graph, or renderer code was changed.

## V1 Results

| Metric | Result |
| --- | ---: |
| Mean FPS | 74.915 |
| Median FPS | 75.262 |
| FPS p05 | 70.035 |
| Minimum sampled FPS | 68.871 |
| Mean frame time | 13.347 ms |
| Frame-time p95 | 17.600 ms |
| Maximum frame time | 27.400 ms |
| Mean JS heap | 230.086 MB |
| Heap start / end | 210.017 / 274.954 MB |
| 30-second heap growth | 64.937 MB |
| Short-run heap trend | 24.100 MB/min |

The exact compact result is stored in
`artifacts/2026-07-29-pinned-v1-simple-example-performance-summary.json`.
The heap trend is a short-run observation, not long-session leak evidence.

## Comparison Contract

`pnpm compare:runtime-performance` reads the raw JSON exports from the existing
editor recorder, recomputes statistics from snapshots instead of trusting
precomputed fields, and fails when:

- browser, GPU, platform, resolution, DPR, sample rate, layer set, or active
  graph count differ
- candidate duration or sample count falls outside ±5% of the baseline
- mean FPS falls more than 10%
- p05 FPS falls more than 15%
- frame-time p95 exceeds both the baseline-relative and 20 ms budgets
- any sampled frame exceeds 50 ms
- mean heap, heap growth, or heap slope exceeds the explicit allowance

Usage:

```text
pnpm compare:runtime-performance \
  --baseline <pinned-v1-recorder.json> \
  --candidate <v2-recorder.json>
```

Focused tests prove equivalent recordings pass and device, FPS, frame-time,
and memory regressions fail.

## Completed Comparison

The final capture-safe V2 configuration passed all 21 strict comparison checks:

- 119.899 mean FPS
- 118.824 p05 FPS
- 9.900 ms frame-time p95
- 92.512 MB mean heap
- -9.205 MB heap growth over 30 seconds

A separate 180-second soak crossed the complete bundled audio loop at 119.959
mean FPS. See the certification record for exact scope and limitations.
