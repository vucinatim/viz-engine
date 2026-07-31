# Goal Three Canonical Preview Compositor

Date: 2026-07-31

Status: canonical editor-preview compositing and transparency checkpoint;
broader product-parity certification remains open.

## Purpose

This checkpoint removes the editor's one-WebGL-controller-per-layer preview
architecture. That design multiplied contexts, render loops, resource caches,
and DOM composition work while splitting opacity and blend ownership between
component nodes, Three, CSS, and React.

The editor now renders the complete runtime plan through one attachment, one
Three renderer, one WebGL context, and one visible runtime canvas.

## Canonical Ownership

The runtime plan remains the single scene input. The preview attachment sends
that plan to one retained compositor once per runtime frame.

The compositor owns:

- canonical layer order
- layer visibility through the materialized runtime plan
- per-layer render targets
- layer-surface background color and alpha
- layer opacity
- layer blend mode
- viewport background color and alpha
- final presentation

Component implementations no longer repeat layer opacity or blend mode on
their root render node. Those properties have one owner at the layer
compositor boundary.

The SVG adapter consumes the same layer properties on its outer layer group.
Canonical `add` maps to CSS/SVG `plus-lighter`; the browser pixel reference
uses Canvas2D `lighter`.

## Alpha and Blend Semantics

The visible WebGL context now requests alpha. Layer targets are transparent
surfaces unless their canonical layer surface declares a background.

The GPU compositor uses two retained ping-pong targets and a full-screen blend
stage. It implements all 17 canonical modes:

- normal
- multiply
- screen
- overlay
- darken and lighten
- color-dodge and color-burn
- hard-light and soft-light
- difference and exclusion
- hue, saturation, color, and luminosity
- add

Blend math follows source-over alpha composition. Colors convert from linear
render-target values to sRGB for CSS-compatible blend math and return to
linear values before final output conversion.

Layer render targets contain premultiplied accumulated color. The compositor
unpremultiplies each layer source before blend evaluation, while its own
intermediate targets retain straight color. Layer-surface clear colors are
premultiplied before entering the layer target.

This distinction is necessary for nested transparency. A direct controlled
probe used a 50%-alpha primitive inside a 65%-opacity layer:

- before the correction, the rendered RGB was `[88, 109, 136]`
- the Canvas2D reference was `[105, 117, 139]`
- after the correction, the rendered RGB was `[105, 118, 140]`

The permanent browser journey now tests this nested-alpha case over a
transparent viewport in addition to comparing all 17 layer blend modes
against Canvas2D pixel output.

## Mirrors, Debugging, and Actions

Layer cards still receive focused layer mirrors, but mirrors do not create
additional runtimes or WebGL contexts. The canonical attachment temporarily
presents a retained layer target, copies it to registered 2D mirrors, and
restores the retained final composite without rerendering scene content.

The ambient editor background now mirrors the final composite once. It no
longer restacks layer thumbnails and recreates blend semantics in the DOM.

Per-layer debug and profiler views remain separate presentation attachments.
They receive the layer plan and measured render statistics from the single
runtime render. Stage fly-camera actions route through the attachment with an
explicit layer identifier.

## Fixed-Device Workload

Run:

```bash
VIZ_PERFORMANCE=1 \
VIZ_PERFORMANCE_WORKLOAD=curve-spectrum \
VIZ_PERFORMANCE_ITERATIONS=20 \
VIZ_PERFORMANCE_REPORT=docs/parity/evidence/artifacts/2026-07-31-goal-three-v2-single-compositor-curve-spectrum-performance.json \
pnpm exec playwright test --config playwright.performance.config.ts
```

The machine-readable result is
[2026-07-31-goal-three-v2-single-compositor-curve-spectrum-performance.json](./artifacts/2026-07-31-goal-three-v2-single-compositor-curve-spectrum-performance.json).

Environment:

- Apple M1 Pro, arm64
- Chromium 151.0.7922.34
- 1600 × 1000 at DPR 1
- four rendered layers, including Curve Spectrum
- 20 physical slider gestures and 20 graph-node gestures

Playback pacing:

| Measure          |   Median |      P95 |  Maximum | Intervals over 25 ms |
| ---------------- | -------: | -------: | -------: | -------------------: |
| Display interval |  8.30 ms | 10.30 ms | 33.90 ms |              1 / 576 |
| Runtime interval | 16.60 ms | 19.80 ms | 31.40 ms |              2 / 299 |

Continuous slider:

| Measure                        |     Mean |      P95 |
| ------------------------------ | -------: | -------: |
| Pointer to transient overlay   |  0.30 ms |  0.40 ms |
| Pointer to runtime publication |  2.85 ms |  3.20 ms |
| Pointer to visible frame       | 10.42 ms | 11.90 ms |
| Release to canonical mutation  |  0.31 ms |  0.50 ms |

Graph-node movement:

| Measure                       |     Mean |      P95 |
| ----------------------------- | -------: | -------: |
| Pointer to visible position   | 18.88 ms | 23.00 ms |
| Release to canonical mutation |  0.58 ms |  0.70 ms |

The recorded heap was 91.13 MiB and the run produced no console, page, or
WebGL diagnostics.

Against the immediately preceding four-controller Curve Spectrum checkpoint:

- slider pointer-to-visible improved from 11.40 ms to 10.42 ms
- graph pointer-to-visible improved from 19.91 ms to 18.88 ms
- recorded heap decreased from 94.95 MiB to 91.13 MiB
- median display and runtime pacing remained effectively unchanged
- display P95 increased from 9.20 ms to 10.30 ms
- runtime P95 increased from 17.70 ms to 19.80 ms
- one display interval and two runtime intervals exceeded 25 ms

The tail increase is retained as evidence. One context removes duplicated
runtime work and ownership, but exact blend semantics add bounded full-screen
GPU passes. Broader-scene profiling should determine whether pass elision or
batching is justified; thresholds were not loosened.

## Validation

Focused coverage proves:

- one full render plan routes through one attachment
- readiness and action routing operate on the attachment's mounted layer set
- per-layer measured diagnostics still update
- layer-surface alpha becomes a premultiplied clear color
- root component nodes do not duplicate layer opacity or blend mode
- SVG owns layer opacity and blend mode at its adapter boundary
- the final runtime uses one visible runtime canvas
- all 17 layer modes match Canvas2D within the declared channel tolerance
- nested component alpha and layer alpha match transparent Canvas2D output

The canonical golden generator was also repaired to load bundles from the
project-bundle package that owns that API rather than from the dev CLI.

The complete foundation gate passed:

- 42 valid parity rows and clean package dependency architecture
- formatting, strict lint, and all package/studio/tool type checks
- 56 Vitest files and 256 tests
- all eight active headed browser journeys; the fixed-device benchmark remains
  intentionally opt-in
- all package builds and the production studio build
- packed-consumer and built creative-loop smoke tests

## Assumptions and Honest Boundary

The blend reference is browser Canvas2D because VizEngine's canonical modes
use CSS-compatible visual semantics. `add` is intentionally treated as
Canvas2D `lighter` and SVG `plus-lighter`.

This checkpoint proves compositor correctness, transparent output, focused
mirrors, and the live-edit workload. It does not claim complete V1 product
parity:

- freeze, every debug combination, and all complex production fixtures still
  need the broader parity sweep
- panel, modal, transport, and large-graph responsiveness need additional
  representative workloads
- Stage still needs final model-backed character fidelity
- full visual comparison against the pinned V1 product remains open

Accordingly, live parameter responsiveness is verified, while the broader
layer-compositing, live-preview, and editor-performance rows advance from gap
to partial rather than being overstated as complete.
