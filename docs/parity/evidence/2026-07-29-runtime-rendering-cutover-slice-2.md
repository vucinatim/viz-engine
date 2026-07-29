# Runtime Rendering Cutover — Slice 2

Date: 2026-07-29

## Scope

This evidence covers the first persistent GPU runtime slice:

- typed, serializable shader render nodes
- package-owned shader sources and uniforms
- persistent Three shader material/geometry reconciliation
- deterministic runtime implementation for `Strobe Light`
- removal of obsolete browser attachment legacy-light configuration

## Determinism Correction

The V1 strobe had two frame-semantics problems:

- Intensity mode accumulated `dt` in editor component state.
- Random Flashes mode called `Math.random()` for every draw.

The runtime implementation now derives:

- Intensity mode from canonical `frameContext.timeInSeconds`
- Random Flashes mode from a stable hash of runtime seed and frame

The same project, frame, and seed therefore produce the same strobe result in
live preview and render mode.

## Persistent Resource Contract

Shader render nodes carry:

- stable program id
- vertex and fragment source
- typed uniforms
- viewport rectangle
- transparency and blend mode

`@viz-engine/renderer-three` updates compatible shader nodes in place. It
retains the existing mesh, geometry, material, and GPU program while updating
uniform values. Shader source changes explicitly invalidate the material
program.

## Automated Evidence

Focused validation passed:

```text
pnpm typecheck:packages
pnpm studio:typecheck
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts \
  tests/foundation/three-renderer.test.ts \
  tests/foundation/svg-renderer.test.ts
```

The focused tests prove:

- fixed Strobe project/frame/seed inputs produce equal render plans
- Intensity mode is on at frame 0 and off at frame 45 for a one-hertz,
  50-percent-duty-cycle configuration
- the editor bridge dispatches `strobe-light` to a shader render node
- compatible next-frame shader plans retain object, geometry, and material
  identity while updating uniforms
- the SVG adapter rejects the unsupported GPU node without pretending to
  render it

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- added Strobe Light through the real Add Layer catalog
- observed the default Intensity frame render visibly
- changed Mode to Manual
- changed Strength from `1` to `0` and observed the output update
- returned to Intensity mode
- played for approximately 1.2 seconds and paused
- observed no new browser errors or warnings during the clean playback window

The layer's opaque editor surface background can hide lower layers when the
strobe shader itself is transparent. This behavior predates the runtime port
and remains part of the later compositor/layer-surface parity audit; it is not
classified as fixed by this slice.

## Honest Classification

This proves the reusable persistent shader seam and one migrated shader
component. It does not yet prove:

- Fullscreen Shader or Noise Shader migration
- final export capture parity
- final layer compositing parity
- total component-cutover completion
- temporary bridge deletion
