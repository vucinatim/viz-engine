# Runtime Rendering Cutover — Slice 8

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Heartbeat Monitor` and
the setting/runtime foundations required to make temporal visuals truthful:

- canonical resolved inputs now override component settings through stable
  colon-delimited paths such as `appearance:scaleY`
- package components consume those resolved settings instead of reading raw
  `layer.settings`
- component render contexts can sample resolved settings at an arbitrary
  canonical frame
- the render contract now includes a portable polyline and renderer-independent
  glow description
- SVG renders the path directly and Three uses retained wide-line resources
- Heartbeat Monitor derives its visible history from canonical frames instead
  of browser callback history
- the historical Canvas state and `draw` callback were removed

## Architecture

`createVizRenderPlan` now materializes one resolved setting object per layer.
Resolved `layer.inputs` are applied immutably through the same colon-delimited
paths used by canonical editor graph bindings. This closes a correctness gap
where the temporary editor bridge appeared node-aware while direct runtime and
export components still read only static settings.

The component render context also exposes deterministic frame sampling.
Heartbeat requests only the visible frame window and maps each sampled
`yPosition` to a portable polyline. Static inputs use a constant-time fast path;
graph and artifact inputs use the runtime frame evaluator and its existing
temporal graph checkpoints.

The Three adapter maps each polyline to retained `Line2` geometry and material
resources. Compatible frame updates mutate the existing position buffer and
preserve the scene graph, line geometry, line material, background geometry,
and compositor layer.

## Determinism

Heartbeat history is a direct function of:

- requested frame
- project timeline
- viewport width
- canonical `yPosition` input at each visible frame
- line color and width settings

It does not depend on render-call count, playback direction, browser refresh
rate, or an editor-owned history array. Direct evaluation of frame 5 produces
the same four-point history repeatedly in the focused proof.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/component-settings.test.ts \
  tests/foundation/component-registry.test.ts \
  tests/foundation/svg-renderer.test.ts \
  tests/foundation/three-renderer.test.ts
```

Result:

- 4 test files passed
- 26 tests passed

The tests cover:

- immutable nested setting overrides and unsafe-path rejection
- graph-output propagation into existing package components
- deterministic random-access Heartbeat history
- SVG core/glow polyline output
- retained Three polyline objects, geometry, material, and position-buffer
  updates

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 31 test files and 114 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `386.19 kB` / `115.17 kB`
gzip before this slice to `388.12 kB` / `115.97 kB` gzip afterward. The
`1.93 kB` raw / `0.80 kB` gzip increase covers the resolved-setting contract,
temporal sampling, portable polyline support, and retained line reconciliation.
It is recorded but is not the required runtime performance comparison against
V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`, quality multiplier 2.

Verified:

- added Heartbeat Monitor through the real Add Layer catalog
- observed the dark zinc surface and emerald round/glowing line
- played to approximately `00:17`
- changed Y Position from `0` to `80` and observed an immediate vertical update
- opened the Y Position animation workspace
- loaded the established Sine Oscillator preset
- observed the live node output updating during playback
- confirmed the render canvas remained at the intended `1748x924` backing
  resolution
- observed no browser errors or warnings

Browser validation also found and fixed a shared resolution-ownership bug:
the Three preview controller was multiplying explicit render-plan dimensions
by device pixel ratio even though the editor had already applied its quality
multiplier. The controller now honors render-plan pixel dimensions exactly.

## Honest Classification

This proves package ownership, deterministic direct-frame history for canonical
runtime inputs, renderer portability, retained line resources, and preserved
editor controls/node workspace.

It does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- measured performance parity against V1
- full historical sampling of the preserved editor's legacy node execution
  while the temporary bridge still injects only its current evaluated value
- migration of the five remaining large Three scenes
- deletion of the temporary preview bridge

The canonical package graph path is history-correct and covered by automated
tests. The preserved editor node projection must still move onto that same
package execution registry before node-driven browser history and export can be
classified as end-to-end parity.
