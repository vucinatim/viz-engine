# Goal Three Curve Spectrum Portable Rendering

Date: 2026-07-31

Status: implementation and fixed-device workload checkpoint; final
transparency/compositor and broad product certification remain open.

## Purpose

This checkpoint repairs Curve Spectrum as a real portable render-plan feature,
not as an editor-only canvas exception. It also measures continuous editing
while the four-layer Simple Example project includes the animated spectrum.

The controlled V1 reference is commit
`e806fbc10980615588b52ff574bc923c6f00f35e`. Its Curve Spectrum establishes
the intended behavior:

- logarithmic frequency sampling across the viewport
- a midpoint-quadratic curve when smoothing is enabled
- a transparent-to-half-opacity vertical area gradient
- a configurable curve stroke and circular sample points
- frequency and amplitude grids with labels

## Canonical Rendering Repair

The portable render contract now includes two generally reusable primitives:

- a polygon with optional explicit triangle topology and a linear fill
  gradient
- a point cloud with a shared radius and style

Curve Spectrum emits:

- one stable-topology gradient polygon
- one polyline
- one point cloud
- the existing grid lines and labels

The area uses an exact strip topology rather than a triangle fan or
per-frame polygon triangulation. This preserves concave spectrum shapes while
allowing the Three renderer to update existing position, color, and index
buffers in place.

The Three renderer represents the point cloud with one `Points` draw object
and a round fragment shader. It no longer creates hundreds or thousands of
individual circle meshes. One-pixel polylines use native Three lines, while
thick and glow lines retain the wide-line path. Text canvas textures are
uploaded only when their content or styling changes.

The SVG renderer implements the same polygon gradient and point-cloud
contracts. Component code therefore remains independent of browser canvas,
Three, SVG, Remotion, and editor concerns.

The spectrum sample count is stable for a given viewport and audio-analysis
resolution. It never invents more samples than the available FFT data. Stable
buffer sizes prevent the dynamic wide-line attribute mismatch that produced
WebGL draw warnings during the first measured implementation.

## Fixed-Device Workload

Run:

```bash
VIZ_PERFORMANCE_WORKLOAD=curve-spectrum \
VIZ_PERFORMANCE_ITERATIONS=10 \
pnpm benchmark:editor-interaction
```

The machine-readable report is
[2026-07-31-goal-three-v2-curve-spectrum-interaction-performance.json](./artifacts/2026-07-31-goal-three-v2-curve-spectrum-interaction-performance.json).

Environment:

- Apple M1 Pro, arm64
- Chromium 151.0.7922.34
- 1600 × 1000 at DPR 1
- four rendered layers, including Curve Spectrum
- ten physical slider gestures and ten graph-node gestures

Playback pacing:

| Measure | Median | P95 | Maximum | Intervals over 25 ms |
| --- | ---: | ---: | ---: | ---: |
| Display interval | 8.30 ms | 9.20 ms | 17.00 ms | 0 / 599 |
| Runtime interval | 16.70 ms | 17.70 ms | 28.60 ms | 2 / 301 |

Continuous slider:

| Measure | Mean | Median | P95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Pointer to transient overlay | 0.30 ms | 0.30 ms | 0.40 ms | 0.50 ms |
| Pointer to runtime publication | 2.89 ms | 2.80 ms | 3.10 ms | 3.40 ms |
| Pointer to visible frame | 11.40 ms | 11.20 ms | 12.00 ms | 14.10 ms |
| Release to canonical mutation | 0.35 ms | 0.30 ms | 0.50 ms | 0.60 ms |

Graph-node movement:

| Measure | Mean | Median | P95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Pointer to visible position | 19.91 ms | 21.50 ms | 22.40 ms | 24.00 ms |
| Release to canonical mutation | 0.62 ms | 0.60 ms | 0.70 ms | 0.90 ms |

Every physical slider gesture preserved the live-edit contract:

- the control readout changed before release
- the transient session overlay changed before release
- the runtime and visible preview changed before release
- canonical project revision remained unchanged during movement
- release created exactly one canonical revision

The headed run produced no console warning, console error, page error, or
WebGL diagnostic.

## Validation

Focused regression coverage proves:

- Curve Spectrum emits one polygon, one point cloud, and no per-point circles
- smoothed and unsmoothed curve-plan behavior
- SVG gradient definitions and point-cloud output
- persistent Three polygon geometry across updates
- persistent Three point-cloud buffers across updates

The focused suite passed 40 tests across three files.

The complete foundation gate passed:

- 42 valid parity rows and clean dependency architecture
- formatting, strict lint, and all package/studio/tool type checks
- 56 Vitest files and 253 tests
- all seven standard headed browser journeys
- all package builds and the production studio build
- packed-consumer and built creative-loop smoke tests

## Honest Boundary

This checkpoint certifies the portable Curve Spectrum repair and its
fixed-device interaction workload. It does not close Goal Three.

The editor preview currently mounts one full WebGL controller and canvas per
layer, then relies on DOM stacking for part of the visible composition. That
multiplies frame work and WebGL resources and leaves transparency, background,
and blend behavior split between the canonical compositor and CSS. It is the
next architectural repair: the editor should attach one canonical multi-layer
preview compositor so editor playback, export, alpha, blend modes, and runtime
ordering share the same contract.

The two runtime intervals above 25 ms and the longer post-release settlement
times remain evidence for that work, not results to hide with memoization or
looser thresholds.
