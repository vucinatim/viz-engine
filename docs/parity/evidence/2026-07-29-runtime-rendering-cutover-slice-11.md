# Runtime Rendering Cutover — Slice 11

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Morph Shapes`:

- retained instanced point-cloud rendering
- cube-frame and pyramid procedural sources
- seeded GLTF surface sampling
- embedded-font and optional TTF custom text
- shape position and rotation transforms
- deterministic morph smoothing and explosion
- canonical scene rotation
- normal and additive material modes
- asynchronous paused-preview invalidation
- removal of editor-owned Three state and callbacks

## Architecture

The preserved editor definition now contains only its established authoring
schema and default node-network declaration.

`@viz-engine/components-core` resolves nested shape settings, canonical
materialized model assets, morph history, explosion, and scene rotation into a
serializable `viz-core/morph-shapes/v1` program node.

`@viz-engine/renderer-three` owns:

- one retained 60,000-capacity `InstancedMesh`
- one retained sphere geometry and standard material
- one perspective camera
- one directional and one ambient light
- deterministic procedural and sampled point targets
- an asynchronous shape cache with explicit preview invalidation

Three program factories now receive the current canonical materialized-asset
map and an attachment-level invalidation callback. Compatible compositor
updates deliver new asset maps without rebuilding the program. A model request
that failed while its asset was absent retries when that canonical asset later
appears.

## Determinism

Procedural targets are direct functions of the settings. Model and text surface
sampling use a stable hash of the canonical scene seed and shape description
instead of `Math.random()`.

Scene rotation is emitted as a canonical quaternion. Static rotation is a
direct function of frame time; node-driven rotation replays resolved settings.

Sequential preview frames apply one retained morph recurrence step. Arbitrary
static frames use the closed form of that recurrence, and node-driven temporal
frames receive canonical morph history. The same frame, project, seed, assets,
and resolved settings therefore produce the same instance transforms without
depending on editor-owned mutable state.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/three-renderer.test.ts
```

The tests cover:

- deterministic fixed-frame component-plan output
- node-driven morph history
- canonical rotation quaternion output
- canonical binary-model asset mapping
- independent-program matrix equality
- expected procedural instance counts
- retained program, mesh, geometry, and material resources
- structural, morph, explosion, additive, and rotation updates
- asynchronous custom-text generation
- text target extent and final instance translations
- explicit invalidation after an asynchronous target resolves

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 31 test files and 121 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `388.44 kB` / `116.69 kB`
gzip before this slice to `389.76 kB` / `117.27 kB` gzip afterward: a
`1.32 kB` raw and `0.58 kB` gzip increase. The embedded default font is placed
in the existing Three-extras chunk. This is recorded but is not the required
measured runtime-performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- added Morph Shapes through the real Add Layer catalog
- observed its runtime-backed thumbnail and full stage output
- changed Morph from `0` to `1`
- changed Explosion Shift from `0` to `3`
- changed Sphere Size from `0.15` to `0.4`
- enabled Additive Glow
- changed Grid Size from `5` to `8`
- played and paused the canonical transport
- selected `custom-text`, entered `VIZ`, and observed the resolved text point
  cloud while the transport remained paused at `00:00.00`
- restored Morph, explosion, material, grid, point-count, sphere-size, and
  procedural shape defaults
- observed no browser warnings or errors

The paused custom-text proof is important: asynchronous renderer completion now
repaints through an explicit attachment invalidation callback. It does not
depend on transport playback, request-animation-frame polling, or component
recreation.

## Honest Classification

This proves package-runtime ownership, retained resources, deterministic
procedural/text sampling, direct-frame morph semantics, canonical binary-asset
delivery at the package boundary, paused asynchronous repaint, and
representative preserved-editor controls.

It does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- measured runtime performance parity against V1
- portable preserved-editor model browsing, because the historical
  `FileInput` still persists browser-local `idb:` values instead of canonical
  asset references
- production-scale custom-text/model preprocessing latency; these operations
  remain candidates for first-class bake artifacts or worker execution
- bounded random-seek cost for long node-driven morph histories; runtime
  checkpoints or bake artifacts remain the intended optimization
- historical V1-node reconstruction through the temporary per-layer bridge
- renderer-owned parity for the preserved debug overlay
- migration of Neural Network and Stage Scene
- deletion of the temporary preview bridge
