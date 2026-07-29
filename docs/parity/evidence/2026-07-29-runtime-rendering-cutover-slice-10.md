# Runtime Rendering Cutover — Slice 10

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Light Tunnel`:

- solid and hollow neon cube-ring modes
- five palette modes, including deterministic random selection
- retained solid instancing and thick edge lines
- tunnel travel, wrapping, and rotation
- rotating point-light circle
- overlapping rising-edge Mexican-wave events
- exponential fog
- bloom and depth of field
- removal of editor-owned Three state and callbacks

## Architecture

The preserved editor definition now contains only its established parameter
schema and default network declaration.

`@viz-engine/components-core` resolves the nested settings, derives motion from
canonical frame time, and reconstructs active wave ages from canonical
resolved-setting history. The render plan contains only deterministic,
serializable direct-frame parameters.

`@viz-engine/renderer-three` owns one retained program containing:

- one 320-capacity solid `InstancedMesh`
- one 3,840-segment `LineSegments2` edge batch
- one fixed pool of 16 point lights and helper resources
- one perspective camera
- exponential scene fog
- one reusable renderer-owned post-processing pipeline

The post-processing pipeline retains its composer and passes, supports bloom
and bokeh depth of field, copies its final internal buffer into the compositor
layer target, and restores renderer tone-mapping state after each render. It is
not Light-Tunnel-specific and is available to the remaining large Three
programs.

## Determinism

Tunnel and light-circle motion are direct functions of canonical
`timeInSeconds`. Ring wrapping uses travel distance and logical ring identity
instead of mutating and rotating an editor-owned array.

The historical `Random` palette mode used `Math.random()` whenever geometry was
regenerated. It now hashes the canonical seed, source ring, and cube index,
preserving varied palette output while producing the same result for the same
scene frame.

Wave events are rising edges in resolved `wave:triggerWave` history. The
component samples only the maximum currently visible event window, supports
overlapping waves, and emits their ages in the frame plan. The renderer applies
the same eased outward-and-back displacement to the four center cubes of each
logical ring.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/three-renderer.test.ts
```

The tests cover:

- fixed-frame component-plan equality
- canonical nested setting projection
- node-driven rising-edge event history
- expected wave age at a directly evaluated frame
- deterministic seeded edge positions across independent programs
- expected solid instance and edge-segment counts
- retained program, mesh, geometry, and material resources
- structural and animated buffer updates without scene replacement

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 31 test files and 119 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `387.53 kB` / `116.01 kB`
gzip before this slice to `388.44 kB` / `116.69 kB` gzip afterward: a
`0.91 kB` raw and `0.68 kB` gzip increase. This includes the reusable
post-processing attachment. It is recorded but is not the required measured
runtime-performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- added Light Tunnel through the real Add Layer catalog
- observed its runtime-backed thumbnail and full stage output
- observed the default solid alternating magenta/cyan tunnel with active bloom
- played and paused beyond four seconds
- observed canonical tunnel travel and axial rotation
- changed Tunnel Speed from `0.5` to `2`
- switched from `Solid` to `Hollow`
- disabled bloom and observed the sharp unprocessed edge output
- re-enabled bloom and enabled depth of field
- observed the processed output without a WebGL or composer failure
- restored Tunnel Speed, Solid mode, bloom, and depth-of-field defaults
- observed no browser warnings or errors throughout the clean session

## Honest Classification

This proves package-runtime ownership, deterministic direct-frame semantics,
retained geometry/material/light resources, actual bloom and depth-of-field
rendering, and representative preserved-editor controls.

It does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- measured runtime performance parity against V1
- historical V1-node pulse reconstruction through the temporary per-layer
  preview bridge
- renderer-owned parity for the preserved debug grid/axes/light-helper toggle
- migration of Morph Shapes, Neural Network, and Stage Scene
- deletion of the temporary preview bridge
