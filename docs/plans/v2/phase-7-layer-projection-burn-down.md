# Phase 7 Layer Projection Burn-Down

## Purpose

Finish the next obvious ownership cleanup under the preserved editor:

- keep the real layer UI the same
- stop `layer-store` and `layer-values-store` from looking like editable scene
  truth
- leave them as projection/runtime-attachment surfaces only

## What changed

- `src/lib/stores/layer-store.ts`
  - no longer exposes layer CRUD or layer mutation actions
  - now clearly owns only:
    - projected `layers`
    - mirror-canvas attachment
    - manual render-function registration
  - added lightweight projection helpers:
    - `getProjectedLayers`
    - `getProjectedLayer`
- `src/lib/stores/layer-values-store.ts`
  - no longer exposes direct value mutation actions
  - now clearly owns only projected layer values plus
    `replaceProjectedValues`
  - added `getProjectedLayerValues`
- remaining editor callers that still wrote through the projection stores were
  rewired onto `editor-project-store`

## Why this matters

Before this slice:

- the canonical working project already owned layer/value truth
- but the projection stores still exposed mutation APIs, which made them look
  like competing sources of truth

After this slice:

- layer/value mutation is clearly routed through `editor-project-store`
- projection stores are now much more honest about what they are:
  compatibility projections and runtime attachment surfaces

## Validation

- `pnpm studio:typecheck`
- `pnpm vitest run tests/foundation/editor-project-store.test.ts tests/foundation/history-store.test.ts tests/foundation/editor-graph-store.test.ts`
- `pnpm check:foundation`

## Remaining work after this phase

- reduce project save/load/reset legacy payload shaping so canonical project
  truth becomes even more obvious at the persistence boundary
- keep shrinking history and editor control seams until the editor and future
  agent tools are using one clear canonical control plane
