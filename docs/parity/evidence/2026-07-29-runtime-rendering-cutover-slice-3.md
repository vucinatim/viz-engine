# Runtime Rendering Cutover — Slice 3

Date: 2026-07-29

## Scope

This evidence covers the first persistent 3D scene-program slice:

- typed, serializable `three-program` render nodes
- package-owned Three program registry and lifecycle
- runtime implementation for `Simple Cube`
- persistent camera, scene, geometry, material, and light resources
- removal of the final obsolete component-preview `useLegacyLights` assignment

## Architecture

A Three program node contains:

- stable program id
- deterministic serializable parameters

It does not contain:

- Three objects
- browser or DOM references
- React state
- request-animation-frame state
- editor store references

`@viz-engine/renderer-three` resolves the program id into a package-owned
program instance with explicit:

- update
- resize
- render
- dispose

lifecycles.

The first instance owns the Simple Cube scene, camera, mesh, material, and
lights. Compatible frame plans update that instance in place.

## Determinism Correction

V1 Simple Cube mutated rotation by:

```text
rotation += speed * dt
```

That made the result depend on preview scheduling and prior draw history.

The runtime implementation derives rotation from:

```text
frameContext.timeInSeconds * rotationSpeed
```

Seeking or rendering a fixed frame therefore produces the same orientation
without replaying browser draw callbacks.

## Automated Evidence

Focused validation passed:

```text
pnpm studio:typecheck
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts \
  tests/foundation/three-renderer.test.ts \
  tests/foundation/svg-renderer.test.ts
```

Result:

- 4 test files passed
- 19 tests passed

The focused tests prove:

- frame 30 at 60 fps produces the expected X/Y rotations
- repeated fixed-frame evaluation produces equal render plans
- the editor bridge emits a Three program node for `simple-cube`
- compatible program updates retain program instance, cube, geometry, and
  material identity
- rotation values update on the retained cube

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified after a clean page reload:

- reset the local browser test project
- added Simple Cube through the real Add Layer catalog
- observed the lit magenta cube in the main preview and layer thumbnail
- started playback
- observed the cube rotate
- paused at approximately `00:01.33`
- observed the paused orientation remain visible
- observed no browser errors or warnings during the clean verification window

## Honest Classification

This proves the reusable persistent Three program lifecycle and one migrated
3D component. It does not yet prove:

- the remaining instanced/procedural/post-processing scene migrations
- final pixel-level V1 comparison
- final export capture parity
- temporary bridge or historical callback deletion
