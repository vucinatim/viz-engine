# Runtime Rendering Cutover — Slice 5

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Noise Shader`:

- package ownership of the preserved procedural-noise GLSL
- deterministic projection of all grouped settings into typed shader uniforms
- removal of historical editor-owned Three state and callbacks
- runtime-backed live-layer and catalog-thumbnail rendering

## Architecture

The editor definition retains:

- display metadata
- fourteen product presets
- grouped authoring schema and visibility rules

`@viz-engine/components-core` owns:

- the vertex and fragment programs
- noise-type and color-mode mapping
- canonical time and viewport projection
- all noise, animation, distortion, color, and output uniforms

The package component emits the same serializable shader node contract used by
Fullscreen Shader and Strobe Light. The persistent Three adapter reconciles its
material and geometry in place.

## Determinism

The historical component already consumed explicit preview time for `u_time`.
The runtime implementation tightens that into:

```text
frameContext.timeInSeconds
```

Animation speed remains a separate shader uniform, matching the preserved GLSL
semantics. Fixed project, frame, settings, and seed produce equal render plans.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts \
  tests/foundation/three-renderer.test.ts \
  tests/foundation/svg-renderer.test.ts
```

Result:

- 4 test files passed
- 25 tests passed

The tests cover:

- registry identity under `noise-shader`
- equal fixed-frame plans
- canonical time and viewport uniforms
- enum, boolean, color, and scalar uniform mapping
- live editor bridge output
- absence of historical render callbacks

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 30 test files and 102 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk decreased from `387.30 kB` / `115.00 kB`
gzip before this slice to `385.23 kB` / `114.50 kB` gzip afterward. This is a
build-size observation, not yet the required runtime performance comparison
against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified after a clean page reload:

- added Noise Shader through the real Add Layer catalog
- observed its default runtime output and synchronized thumbnail
- applied the real Plasma Wave preset
- played and paused at approximately `00:01.13`
- expanded Noise Settings
- changed Noise Type from Simplex to Voronoi through the real control
- observed the main output and thumbnail update
- observed no browser errors or warnings during the clean verification window

## Honest Classification

This proves runtime ownership and representative browser behavior for Noise
Shader. It does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- performance parity against V1
- migration of the remaining temporal and Three scene components
- deletion of the temporary preview bridge
