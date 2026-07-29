# Runtime Rendering Cutover — Slice 4

Date: 2026-07-29

## Scope

This evidence covers:

- the package-runtime migration of `Fullscreen Shader`
- removal of its historical editor-owned `init3D` and `draw3D` callbacks
- package ownership of its three preserved GLSL programs
- runtime-backed Add Layer catalog thumbnails for every migrated component
- removal of dormant historical render callbacks from all six migrated editor
  component definitions

## Architecture

The editor `Fullscreen Shader` definition now owns only:

- display name and description
- parameter schema and defaults
- parameter visibility rules

`@viz-engine/components-core` owns:

- shader selection
- the exact GLSL programs
- canonical frame-time evaluation
- typed, serializable uniforms
- the deterministic shader render node

Both live layers and catalog thumbnails resolve the component through the same
package component registry. The browser owns the canvas and persistent Three
attachment, not shader meaning.

## Determinism

`uTime` is derived from:

```text
frameContext.timeInSeconds * speed
```

Fixed project, frame, and settings therefore produce equal render plans without
accumulated editor-local time.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts \
  tests/foundation/three-renderer.test.ts \
  tests/foundation/svg-renderer.test.ts
```

Result:

- 4 test files passed
- 23 tests passed

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 30 test files and 100 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The automated evidence covers:

- registration under `fullscreen-shader`
- equal fixed-frame render plans
- deterministic time and viewport uniforms
- live editor bridge output
- component-catalog preview bridge output
- shader-node renderer reconciliation
- absence of `draw`, `init3D`, and `draw3D` callbacks on every migrated editor
  component definition

The production studio entry chunk decreased from `393.49 kB` / `117.13 kB`
gzip before dormant callback removal to `387.30 kB` / `115.00 kB` gzip after
the cleanup. This is a build-size observation, not yet the required runtime
performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- reset the local browser test project
- added Fullscreen Shader through the real Add Layer catalog
- observed runtime-rendered thumbnails for migrated components
- observed Radial Ripple Grid in the main layer preview
- switched the real Shader control to Cyber Grid
- observed Cyber Grid in both the main preview and catalog thumbnail
- played and paused the transport at approximately `00:01.32`
- observed animation advance from canonical transport time
- observed no browser errors or warnings during the clean verification window

## Honest Classification

This proves runtime ownership and a real browser workflow for Fullscreen
Shader. It does not yet prove:

- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- performance parity
- migration of Noise Shader or the remaining scene components
- deletion of the temporary preview bridge
