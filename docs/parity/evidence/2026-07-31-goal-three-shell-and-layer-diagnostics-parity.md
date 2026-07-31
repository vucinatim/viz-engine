# Goal Three Shell And Layer Diagnostics Parity

Date: 2026-07-31

Status: shell visual language and layer diagnostics verified; the broader
capability-by-capability audit remains open.

## Controlled Shell Comparison

The V1 reference was served from immutable commit
`e806fbc10980615588b52ff574bc923c6f00f35e`. V1 and V2 were captured in fresh
Chromium contexts with:

- 1600 × 1000 viewport
- device pixel ratio 1
- dark color scheme
- tutorial dismissed
- `simple-example` loaded from the visible Examples menu
- transport paused at `0:00`
- no graph or modal overlay
- UI animation and transition timing disabled for the capture
- V1 React Scan instrumentation hidden

Two states were captured for each product:

1. the normal three-layer editor shell
2. the first layer expanded through the visible Settings control

Artifacts:

- [V1 normal shell](./artifacts/2026-07-31-goal-three-v1-simple-shell-1600x1000.png)
- [V2 normal shell](./artifacts/2026-07-31-goal-three-v2-simple-shell-1600x1000.png)
- [V1 expanded settings](./artifacts/2026-07-31-goal-three-v1-expanded-settings-1600x1000.png)
- [V2 expanded settings](./artifacts/2026-07-31-goal-three-v2-expanded-settings-1600x1000.png)

The captures preserve the same:

- header height, dark surface language, menu density, labels, toggles, and
  numeric quality control
- left-panel width, card hierarchy, drag handle, thumbnails, compact actions,
  disclosure, borders, and spacing
- preview and waveform panel placement
- waveform colors, time ruler, selection, gain control, transport alignment,
  and bottom-panel density
- expanded opacity, blend, background, schema labels, sliders, numeric inputs,
  animation affordances, and group spacing
- selected, disabled, and focused-state legibility

Supplementary SSIM measurements excluded the animated preview itself:

| Controlled region | SSIM |
| --- | ---: |
| Normal left editor panel | 0.984239 |
| Expanded settings panel | 0.985452 |
| Bottom waveform and transport panel | 0.998371 |

These measurements are supporting evidence, not a substitute for visual
inspection. Text antialiasing and product content can legitimately differ.

## Product Copy Correction

The comparison exposed one real visual/UX regression: V2 component cards had
started showing architecture phrases such as `deterministic package-runtime`
and `runtime-backed port`. Those descriptions were technically accurate but
not creator-facing and caused avoidable wrapping and density drift.

The preserved component catalog now uses concise product descriptions again.
The copy describes what each visual does while runtime determinism,
implementation version, and renderer family remain available through
capability inspection and documentation.

## Approved Additions And Honest Difference

The V2 header includes a Jobs control. This is an intentional additive surface
for canonical render and bake jobs; it does not replace or displace a V1
workflow.

The controlled screenshots show a red initial sample output in V1 and a green
initial output in V2. That is not treated as shell-language evidence. It
belongs to the still-partial live-preview/graph-input visual-fidelity audit and
remains visible in the artifacts rather than being cropped or hidden.

## Layer Diagnostics Proof

A dedicated headed Chromium journey enables diagnostics through the visible
layer-card control and proves:

- the debug canvas is mounted, visible, and nonblank
- the overlay receives current runtime-resolved settings
- graph-driven color values produce multiple distinct displayed values during
  playback
- enabling diagnostics does not change the project revision
- enabling diagnostics does not change the underlying runtime-canvas
  fingerprint at the paused frame
- editor-only diagnostic state is absent from the exported project document
- disabling diagnostics removes the overlay
- ordinary use produces no console or page diagnostics

The browser journey intercepts text written to only the diagnostic canvas. It
does not add frame-rate DOM attributes or production instrumentation.

Architecturally, debug presentation remains a browser attachment. It receives
the canonical layer render plan and measured layer statistics after the single
scene render; it is not part of the project, render plan, compositor, SVG
adapter, or export job.

## Validation

Validation passed:

- the complete parity-matrix validator with 42 capabilities, 9 verified,
  32 partial, 1 not audited, and zero gaps
- architecture, formatting, lint, package, studio, and tool type checks
- 56 Vitest files and 257 deterministic tests
- all 11 active headed Chromium journeys in 4.7 minutes; the fixed-device
  performance benchmark remained intentionally opt-in and skipped
- every package build and the production studio build
- built-package consumer and agent creative-loop smoke scenarios
- the headed layer-diagnostics journey in 10.5 seconds
- controlled V1/V2 normal and expanded captures

The complete browser gate includes canonical editing and history, transport
and audio synchronization, every bundled sample, diagnostics, alpha and blend
compositing, portable model assets, direct graph authoring, project roundtrip,
still export, bounded resource churn, and a nonblank nonfrozen video export.

## Boundary

This evidence verifies the recognizable shell visual language and layer debug
overlay contract. It does not claim every shell interaction or every debug and
profiler combination is complete. Resizing, shortcuts, profiler behavior,
performance-stat semantics, and preview initial-frame fidelity retain their
own parity rows and remain partial or not audited until their acceptance
criteria are proven.
