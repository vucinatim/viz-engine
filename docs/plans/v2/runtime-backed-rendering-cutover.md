# Runtime-Backed Rendering Cutover

## Goal

Make the package runtime and `VizSession` the only owners of visual scene
evaluation while preserving the real V1 editor product surface.

This is a replacement cutover:

- editor component definitions may retain authoring metadata and parameter
  schemas
- visual meaning must live in package runtime component implementations
- browser code may own canvases, WebGL contexts, asset hydration, and other
  host attachments
- browser/editor code must not own component-specific scene behavior
- temporary fallback dispatch is deleted when the final component is migrated

## Evidence Baseline

The immutable product reference is:

```text
e806fbc10980615588b52ff574bc923c6f00f35e
```

At the start of this cutover the preserved editor exposed 15 components.
All 15 now have package-runtime implementations. One cached runtime session
evaluates the complete canonical project once per frame, and preview plus
export present sliced layer plans from that shared evaluation.

The temporary per-layer bridge and mixed callback fallback have been deleted.
`src/lib/editor-runtime-preview-attachment.ts` is now a runtime-plan
presentation attachment only.

## Component Inventory

| Editor component | Current visual path | Runtime family | Migration requirements |
| --- | --- | --- | --- |
| Curve Spectrum | package runtime | primitive 2D scene | Complete: shared frame audio enters as explicit runtime input values; historical callback and per-layer bridge removed |
| Debug Animation | package runtime | primitive 2D scene | Complete: rectangles plus reusable text primitive; historical callback removed |
| Feature Extraction Bars | package runtime | primitive 2D scene | Complete: rectangles plus reusable text primitive and five node-driven values; historical callback removed |
| Heartbeat Monitor | package runtime | temporal 2D scene | Complete: deterministic resolved-setting history, portable polyline/glow, retained Three line resources, historical callback removed |
| Simple Cube | package runtime | persistent Three scene | Complete: deterministic persistent scene; historical callbacks removed |
| Instanced Supercube | package runtime | persistent Three scene | Complete: retained instancing, deterministic explosion replay and rotation, lights and shadows; historical callbacks removed |
| Light Tunnel | package runtime | persistent Three scene | Complete: retained solid/edge batches and lights, deterministic movement/palette/wave replay, fog, reusable bloom/depth-of-field pipeline; historical callbacks removed |
| Morph Shapes | package runtime | persistent Three scene | Complete: retained instancing, deterministic procedural/model/text point clouds, canonical asset delivery, direct-frame morph/rotation semantics, paused async invalidation; historical callbacks removed |
| Neural Network | package runtime | persistent Three scene | Complete: merged deterministic topology, retained soma/activation/signal instancing, direct-frame trigger replay, custom materials, bloom and depth of field; historical callbacks removed |
| Noise Shader | package runtime | persistent shader scene | Complete: package-owned GLSL and deterministic grouped uniforms; historical callbacks removed |
| Orbiting Cubes | package runtime | persistent Three scene | Complete: seeded topology, retained instancing, lighting, canonical camera orbit, and node-driven parameters; historical callbacks removed |
| Particle System | package runtime | persistent Three scene | Complete: analytic seeded instancing, physics, colors, and blend modes; historical callbacks removed |
| Stage Scene | package runtime | persistent Three scene | Complete: retained stage/effect rig, deterministic camera/light/effect semantics, browser-hosted fly-camera attachment, fog and bloom, content-pinned authored DJ, and deterministic GPU-animated model crowd; procedural characters remain loading/failure fallback only |
| Fullscreen Shader | package runtime | persistent shader scene | Complete: package-owned shader selection and deterministic uniforms; historical callbacks removed |
| Strobe Light | package runtime | persistent shader scene | Complete: deterministic runtime shader; historical callbacks removed |

## Runtime Model

Two runtime representation families are required.

### Portable primitives

Simple visuals should return ordinary typed render nodes. The primitive
vocabulary should stay intentionally small and renderer-independent:

- group
- rectangle
- circle
- image
- text
- polyline with explicit stroke and glow semantics

These nodes remain directly renderable by the SVG and Three adapters.

Package components receive resolved settings rather than raw static settings.
Canonical layer inputs override settings through colon-delimited paths, and a
deterministic frame sampler supports temporal views without browser-owned
history. The runtime receives frame-scoped graph inputs and executes every
preserved editor node kernel through its node-registry extension boundary.
Graph traversal, checkpoints, input resolution, and setting projection now
belong to the package runtime.

### Persistent Three programs

Complex GPU visuals should not be flattened into thousands of lossy rectangles
or reduced versions of the V1 product.

The render contract needs a typed package-owned Three program node that:

- identifies a stable renderer program
- carries deterministic, serializable frame/config/input data
- has no DOM, React, editor-store, or browser references
- lets `@viz-engine/renderer-three` retain expensive geometry/material state
  across frames
- derives animation from canonical frame context and seeded state rather than
  request-animation-frame accumulation
- is consumed by preview and final-render adapters through the same contract

Program implementations belong in package terrain. The editor host only
attaches the resulting renderer to a canvas.

## Slice Order

1. Add missing portable primitives and migrate the two stateless Canvas proofs:
   `Debug Animation` and `Feature Extraction Bars`.
2. Add the persistent Three program contract and migrate the shader family:
   `Fullscreen Shader`, `Noise Shader`, and `Strobe Light`.
3. Migrate the simpler scene family: `Simple Cube`, `Particle System`, and
   `Orbiting Cubes`.
4. Establish deterministic temporal sampling and migrate `Heartbeat Monitor`.
5. Migrate the large scene family: `Instanced Supercube`, `Light Tunnel`,
   `Neural Network`, `Stage Scene`, and `Morph Shapes`.
6. Complete: replace per-layer runtime-plan creation with one
   VizSession-owned frame evaluation whose layer plans feed the existing
   stacked browser surfaces.
7. Complete: delete `draw`, `init3D`, `draw3D`, component-local render state,
   the temporary runtime preview bridge, and the duplicated offline-audio
   handoff.

## Per-Slice Gates

Every component slice must prove:

- component registration under its canonical kebab-case id
- deterministic render-plan output for fixed project/frame/seed/input
- node-driven parameter propagation
- browser rendering in the preserved editor
- play, pause, and seek behavior
- no new console errors or warnings
- no unexplained material performance regression
- successful focused tests and the complete foundation gate

Visual similarity is audited against the pinned V1 reference. Runtime-backed is
an ownership claim, not a visual-parity claim; the two pieces of evidence must
remain separate.

Component-catalog previews use the same package runtime registry for every
preserved component. No historical catalog render fallback remains.

## Final Deletion Conditions

The cutover is complete only when:

- all 15 preserved-editor components are registered runtime implementations
- the editor never calls component `draw`, `init3D`, or `draw3D`
- the editor does not carry component render state
- one VizSession frame evaluation produces the plan used by preview and export
- the temporary runtime preview bridge is deleted
- browser attachment code is component-agnostic
- the preserved node graph still drives component parameters
- browser parity and measured performance evidence are recorded

All architecture deletion conditions are now met. The fixed-device V1/V2
comparison passes all 21 checks, the bounded three-minute soak is recorded, and
a real runtime-backed H.264/AAC export has been inspected. The final
requirement-by-requirement record lives in
`docs/parity/evidence/2026-07-29-runtime-rendering-cutover-acceptance-audit.md`.

The Stage character restoration is complete through the canonical native 3D
system in
`docs/specs/v2/native-3d-model-character-and-performance-system.md`: stable
model asset refs, explicit readiness, renderer-owned resources, absolute-frame
animation sampling, and a scalable deterministic crowd path. The historical
browser FBX loader was not restored. Procedural actors remain only as a
deterministic live loading/failure fallback.
