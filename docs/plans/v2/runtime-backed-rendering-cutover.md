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

At the start of this cutover the preserved editor exposes 15 components.
`Curve Spectrum` is the only one whose live editor output is currently produced
through `@viz-engine/runtime` and `@viz-engine/renderer-three`.

The temporary bridge is:

- `src/lib/editor-runtime-preview-runtime-bridge.ts`

The mixed fallback attachment is:

- `src/lib/editor-runtime-preview-attachment.ts`

## Component Inventory

| Editor component | Current visual path | Runtime family | Migration requirements |
| --- | --- | --- | --- |
| Curve Spectrum | package runtime | primitive 2D scene | Historical callback removed; remove bridge-specific spectrum injection when all layers use one session render plan |
| Debug Animation | package runtime | primitive 2D scene | Complete: rectangles plus reusable text primitive; historical callback removed |
| Feature Extraction Bars | package runtime | primitive 2D scene | Complete: rectangles plus reusable text primitive and five node-driven values; historical callback removed |
| Heartbeat Monitor | package runtime | temporal 2D scene | Complete: deterministic resolved-setting history, portable polyline/glow, retained Three line resources, historical callback removed |
| Simple Cube | package runtime | persistent Three scene | Complete: deterministic persistent scene; historical callbacks removed |
| Instanced Supercube | package runtime | persistent Three scene | Complete: retained instancing, deterministic explosion replay and rotation, lights and shadows; historical callbacks removed |
| Light Tunnel | package runtime | persistent Three scene | Complete: retained solid/edge batches and lights, deterministic movement/palette/wave replay, fog, reusable bloom/depth-of-field pipeline; historical callbacks removed |
| Morph Shapes | Three `init3D`/`draw3D` | persistent Three scene | Instancing, procedural/model/text sources, asset loading, custom material |
| Neural Network | Three `init3D`/`draw3D` | persistent Three scene | Procedural seeded topology, custom shaders, activation motion, bloom and depth-of-field |
| Noise Shader | package runtime | persistent shader scene | Complete: package-owned GLSL and deterministic grouped uniforms; historical callbacks removed |
| Orbiting Cubes | package runtime | persistent Three scene | Complete: seeded topology, retained instancing, lighting, canonical camera orbit, and node-driven parameters; historical callbacks removed |
| Particle System | package runtime | persistent Three scene | Complete: analytic seeded instancing, physics, colors, and blend modes; historical callbacks removed |
| Stage Scene | Three `init3D`/`draw3D` | persistent Three scene | Instancing, lighting, fog, camera path, bloom and feature-driven staging |
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
history. The preserved editor's legacy node evaluator still has to converge on
the package node registry before the temporary bridge can provide full
historical node sampling.

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
6. Replace per-layer runtime-plan creation with one VizSession-owned frame
   evaluation and one compositor update per frame.
7. Delete `draw`, `init3D`, `draw3D`, component-local render state, and the
   temporary runtime preview bridge after their last consumers are removed.

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

Component-catalog previews now use the same package runtime registry for
migrated components. This lets migrated editor schemas drop historical render
callbacks immediately without blanking catalog thumbnails. The catalog still
uses the historical path for unmigrated components until the final cutover.

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
