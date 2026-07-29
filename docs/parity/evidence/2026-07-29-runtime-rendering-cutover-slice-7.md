# Runtime Rendering Cutover — Slice 7

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Orbiting Cubes`:

- all six preserved seeded neuron-topology variants
- retained instanced cubes and material
- three colored spotlights and ambient illumination
- deterministic structure rotation and multi-axis camera orbit
- preserved Seed and Spacing node-network authoring definitions
- removal of editor-owned procedural generation and Three callbacks

## Architecture

The editor definition now owns parameter schemas and its two established
default node-network documents.

`@viz-engine/components-core` projects resolved settings and canonical frame
time into a serializable `three-program` node.

`@viz-engine/renderer-three` retains one scene program containing:

- one 150-capacity instanced mesh and box geometry
- one standard material
- one structure group
- three spotlights, their targets, and one ambient light
- one perspective camera

Seed, maximum cube count, and fractal-depth changes regenerate deterministic
CPU topology into the existing instance buffer. They do not replace GPU scene
resources.

## Determinism

Topology uses the preserved seeded generator. Structure rotation and camera
position are direct functions of canonical `timeInSeconds`; neither accumulates
preview `dt`.

Fixed-frame plans and independent renderer instances produce equal instance
matrices for the same parameters.

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
- 29 tests passed

The tests cover:

- registry and bridge identity under `orbiting-cubes`
- equal fixed-frame render plans
- canonical time and authoring-parameter projection
- equal topology matrices across independent program instances
- retained program, instanced mesh, geometry, and material across regeneration
- changed matrices after seed and spacing updates
- absence of historical render callbacks

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 30 test files and 108 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `385.89 kB` / `114.91 kB`
gzip before this slice to `386.19 kB` / `115.17 kB` gzip afterward. The
`0.30 kB` raw / `0.26 kB` gzip increase is recorded but is not the required
runtime performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- added Orbiting Cubes through the real Add Layer catalog
- observed its colored-lit neuron structure and synchronized thumbnail
- played and paused at approximately `00:01.32`
- observed canonical structure and camera motion
- changed Structure Seed from `3499` to `3500` at the paused frame
- observed immediate deterministic topology regeneration
- opened the Seed animation control and observed the real node workspace,
  input/output nodes, and live output
- observed no browser errors or warnings during the clean verification window

## Honest Classification

This proves runtime ownership, deterministic topology and motion, retained GPU
resources, and representative browser/node-workspace behavior. It does not yet
prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- performance parity against V1
- migration of the remaining temporal and large Three scenes
- deletion of the temporary preview bridge
