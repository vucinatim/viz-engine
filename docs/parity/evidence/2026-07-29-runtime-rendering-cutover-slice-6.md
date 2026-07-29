# Runtime Rendering Cutover — Slice 6

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Particle System`:

- deterministic analytic particle evaluation
- package-owned persistent Three scene program
- instanced geometry, shader colors, physics, emitter shapes, and blend modes
- removal of historical editor-owned simulation state and callbacks

## Architecture

The editor definition now contains only authoring metadata and grouped
parameter schemas.

`@viz-engine/components-core` projects the canonical frame, seed, and settings
into a serializable `three-program` node.

`@viz-engine/renderer-three` retains:

- one scene and camera
- one instanced mesh
- one sphere geometry
- one shader material
- one instance-color buffer

Compatible frames update those resources in place.

## Deterministic Simulation

The V1 component accumulated `dt`, mutated particle pools, and called
`Math.random()` during emission. Its output therefore depended on browser
scheduling and prior callback history.

The runtime program derives each live particle from:

```text
canonical time
+ session seed
+ stable emission index
+ current physics and emitter settings
```

Spawn time, initial position, velocity, gravity displacement, lifetime color,
and group rotation are all evaluated analytically. A fixed frame can be sought
or rendered directly without replay.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts \
  tests/foundation/three-renderer.test.ts
```

Result:

- 3 test files passed
- 26 tests passed

The tests cover:

- registry and bridge identity under `particle-system`
- equal fixed-frame render plans
- canonical time, seed, and rotation projection
- equal fixed-frame instance matrices across independent program instances
- expected live-particle counts
- retained program and instanced-mesh identity across frame updates
- absence of historical render callbacks

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 30 test files and 105 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `385.23 kB` / `114.50 kB`
gzip before this slice to `385.89 kB` / `114.91 kB` gzip afterward. The small
increase contains the deterministic analytic program and is not a runtime
performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified after a clean project reset:

- added Particle System through the real Add Layer catalog
- observed the intentional empty state at time zero
- played to approximately `00:01.43` and paused
- observed the active magenta-to-cyan particle stream
- observed the synchronized layer thumbnail
- changed Emitter Shape from Point to Sphere at the paused frame
- observed the same fixed frame re-evaluate immediately with the new shape
- observed no browser errors or warnings during the clean verification window

The first browser pass exposed stale instanced-mesh frustum bounds after the
time-zero empty frame. The program now disables automatic frustum culling for
this dynamically populated mesh; a clean reload proved the correction.

## Honest Classification

This proves runtime ownership, deterministic direct-frame evaluation, retained
GPU resources, and representative browser behavior for Particle System. It
does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- performance parity against V1
- migration of Orbiting Cubes or the larger Three scene components
- deletion of the temporary preview bridge
