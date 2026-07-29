# Runtime Rendering Cutover — Slice 9

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Instanced Supercube`:

- eight hollow edge-lattice cubes
- grid sizes from 3 through 8
- retained instanced geometry and standard material
- configurable spacing, color, explosion factor, and explosion shift
- deterministic explosion response and rotation
- directional and ambient lighting
- preserved shadow plane and soft-shadow rendering
- removal of editor-owned Three state and callbacks

## Architecture

The editor definition now contains only the established parameter schema.

`@viz-engine/components-core` resolves the current lattice parameters and
replays the scalar explosion response from canonical setting history. The
resulting render-plan node contains only serializable direct-frame parameters.

`@viz-engine/renderer-three` owns one retained program containing:

- one fixed-capacity 640-instance mesh
- one box geometry and one standard material
- one directional light and one ambient light
- one shadow plane
- one perspective camera

Grid-size and explosion changes rewrite matrices in the existing instance
buffer. They do not replace GPU scene resources.

The historical `onBeforeCompile` injection was deliberately removed. Its time
uniform was unused and its only visible behavior replaced the standard
material's diffuse color with a live color uniform. Updating the retained
standard material color provides the same visible control with less shader
surface and no hidden compile hook.

## Determinism

Constant rotation speed maps directly to canonical `timeInSeconds`.

Explosion response reproduces V1's per-frame recurrence:

```text
shift = shift + (target - shift) * animationSpeed
```

The recurrence is evaluated from canonical frame history instead of retained
browser matrices. Static settings use an equivalent closed form. A focused
node-driven step proof evaluates frame 3 directly and produces the expected
smoothed value `0.75`.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/three-renderer.test.ts \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts
```

The tests cover:

- fixed-frame component-plan equality
- static closed-form explosion response
- node-driven historical explosion replay
- canonical rotation
- deterministic matrices across independent program instances
- expected instance counts for grid sizes 5 and 6
- retained program, mesh, geometry, and material across structural updates
- matrix changes after explosion and grid updates
- bridge registration and absence of historical callbacks

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 31 test files and 117 tests passed, including the final historical-step
  assertion
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `388.12 kB` / `115.97 kB`
gzip before this slice to `387.53 kB` / `116.01 kB` gzip afterward. The raw
entry decreased by `0.59 kB`; gzip increased by `0.04 kB`. This is recorded but
is not the required runtime performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- added Instanced Supercube through the real Add Layer catalog
- observed its runtime-backed thumbnail and lit red hollow-cube lattice
- played and paused at approximately `00:01.36`
- observed canonical two-axis rotation
- changed Explosion Shift from `0` to `1`
- changed Grid Size from `5` to `8`
- observed immediate lattice expansion and retained responsive rendering
- opened the Explosion Shift node workspace with the preserved input/output
  nodes and live-output surface
- observed no new browser warnings or errors after the clean page load

## Honest Classification

This proves runtime ownership, deterministic temporal response, retained
instanced resources, structural controls, and representative preserved-editor
behavior. It does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- measured performance parity against V1
- full legacy-editor node execution through the package registry
- migration of Light Tunnel, Morph Shapes, Neural Network, and Stage Scene
- deletion of the temporary preview bridge
