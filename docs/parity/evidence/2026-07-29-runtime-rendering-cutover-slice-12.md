# Runtime Rendering Cutover — Slice 12

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Neural Network`:

- seeded three-dimensional neuron placement
- nearest-neighbor connection topology
- organic tapered dendrites and junctions
- custom neuron and soma materials
- retained soma and activation instances
- traveling signal orbs and halos
- canonical activation decay and network rotation
- bloom and depth of field
- removal of editor-owned Three state and callbacks
- runtime-layer hide/show lifecycle repair

## Architecture

The preserved editor definition now contains only its established authoring
schema and default node-network declarations.

`@viz-engine/components-core` resolves structure, appearance, post-processing,
and rising trigger edges into a serializable
`viz-core/neural-network/v1` program node. Each trigger event carries canonical
age and the signal properties captured at that edge.

`@viz-engine/renderer-three` owns:

- one retained merged dendrite mesh and shared shader material
- one retained 50-capacity soma instance batch
- one retained 50-capacity activation instance batch
- one retained 2,000-capacity signal instance batch
- one retained 2,000-capacity halo instance batch
- one perspective camera and fixed light rig
- one shared renderer-owned bloom/depth-of-field pipeline

Topology changes rebuild only the merged structural geometry and instance
matrices. The scene, program, mesh objects, materials, reusable sphere
geometries, camera, lights, and post-processing pipeline remain attached.

The shared post-processing contract now accepts an explicit tone-mapping policy.
Neural Network uses linear tone mapping at exposure `1`, matching its historical
intent, while Light Tunnel keeps the existing ACES default.

## Determinism

Neuron positions and organic curve perturbations use the preserved seeded
algorithm. They do not call `Math.random()`.

Trigger waves are rising edges in canonical resolved-setting history. Orb
progress, easing, fade, and activation level are direct functions of event age.
Network rotation is `timeInSeconds * 0.05`. Seeking and export therefore do not
depend on an editor-owned `currentTime`, mutable orb list, or accumulated
rotation.

The live signal batches have an explicit 2,000-instance ceiling. Newest active
events take precedence if a pathological trigger rate exceeds that bound. This
replaces V1's unbounded per-event mesh allocation with predictable retained
resources; dense long-lived event simulations should become bake artifacts
rather than silently allocating without limit.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/layer-fps-tracker.test.ts \
  tests/foundation/component-registry.test.ts \
  tests/foundation/three-renderer.test.ts
```

The tests cover:

- deterministic fixed-frame component-plan output
- node-driven trigger-edge history
- stable topology across independent program instances
- retained scene, mesh, material, sphere-geometry, and signal resources
- structural regeneration without program replacement
- deterministic signal and activation state
- canonical network rotation
- stable profiler attachment identity across unrelated React rerenders

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 32 test files and 124 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `389.76 kB` / `117.27 kB`
gzip before this slice to `389.07 kB` / `116.98 kB` gzip afterward: a
`0.69 kB` raw and `0.29 kB` gzip decrease after removing the historical
browser implementation. The shared Three-extras chunk changed to `379.19 kB` /
`115.02 kB` gzip, a `3.78 kB` raw and `0.86 kB` gzip increase that contains the
package topology and batching implementation.

These bundle measurements are recorded but are not the required measured
runtime-performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- added Neural Network through the real Add Layer catalog
- observed its runtime-backed thumbnail and full stage output
- changed Neuron Count from `30` to `10`
- changed Growth from `1` to `0.45`
- enabled Fire Neurons while paused and observed activation halos
- played the transport and observed retained traveling pink signal orbs along
  dendrite paths
- changed signal speed, size, and activation decay
- enabled bloom and disabled depth of field, then restored both defaults
- restored neuron count, growth, trigger, signal, and post-processing defaults
- hid and showed the runtime-backed layer without a React lifecycle failure
- observed no browser warnings or errors in the final clean session

The browser pass caught two defects that object-level renderer tests could not:

1. a custom instanced signal shader initially conflicted with Three's injected
   instance-color attribute and then compiled without the attribute when no
   signal was active; explicit retained `signalColor` attributes now make the
   shader lifecycle stable
2. hiding a layer exposed unstable empty-array and profiler identities that
   repeatedly unregistered and re-registered the attachment; both identities
   are now stable

## Honest Classification

This proves package-runtime ownership, deterministic topology and trigger
semantics, retained/bounded resources, live signal rendering, post-processing,
representative preserved-editor controls, playback, and repaired visibility
lifecycle.

It does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- measured runtime performance parity against V1
- exact output under pathological trigger rates beyond the explicit retained
  signal capacity
- full historical V1-node reconstruction through the temporary per-layer
  bridge
- renderer-owned parity for the preserved debug overlay
- migration of Stage Scene
- deletion of the temporary preview bridge
