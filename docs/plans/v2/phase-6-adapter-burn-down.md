# Phase 6 Adapter Burn-Down

## Purpose

Close one of the last major transitional seams in the preserved editor:

- keep the node editor UI intact
- stop the node-network adapter store from acting like graph truth
- make the canonical graph store the only owner of graph mutation and execution

## What changed

- `src/components/node-network/node-network-store.ts`
  - now owns only node-editor UI/session state:
    - `openNetwork`
    - `areNetworksMinimized`
    - `shouldForceShowOverlay`
  - no longer exposes graph mutation/execution as store-owned state/actions
  - now exports thin helper functions over `editor-graph-store` for:
    - graph reads
    - graph mutation
    - graph execution
    - node-editor convenience flows that also update UI state
- graph-facing consumers were rewired to use those helpers or read directly from
  the canonical graph store instead of assuming `node-network-store` owns the
  graph document

## Why this matters

Before this slice:

- `editor-graph-store` already owned canonical graph truth
- `node-network-store` still looked like a second graph owner because it exposed
  graph mutation and execution through the UI store API

After this slice:

- canonical graph truth is clearly owned by `editor-graph-store`
- `node-network-store` is now much closer to a pure UI/session adapter
- the preserved node editor still behaves the same, but the hidden ownership
  split is cleaner and easier to reason about

## Validation

- `pnpm studio:typecheck`
- `pnpm vitest run tests/foundation/editor-graph-store.test.ts tests/foundation/history-store.test.ts tests/foundation/editor-preview-store.test.ts tests/foundation/editor-audio-session-store.test.ts`
- `pnpm check:foundation`

## Remaining work after this phase

- shrink `layer-store` and `layer-values-store` further until they are clearly
  projection/runtime-attachment surfaces rather than transitional mutation
  surfaces
- keep reducing legacy persistence bridges around project save/load/reset
- keep moving toward one explicit editor/runtime/agent control plane
