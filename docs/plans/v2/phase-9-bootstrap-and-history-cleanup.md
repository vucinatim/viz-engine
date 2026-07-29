# Phase 9: Bootstrap And History Cleanup

## Goal

Close two remaining transitional seams in the regut:

- projection stores should no longer persist scene truth
- history should stop duplicating node-editor selection context that already
  lives in the node-editor UI store

This keeps the visible editor unchanged while making the hidden ownership model
cleaner and easier to reason about.

## What changed

### Projection stores are now runtime-only projections

These stores no longer persist project truth:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/layer-store.ts`
- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/layer-values-store.ts`

They now exist only to mirror the canonical working project into the preserved
editor terrain and to hold browser/runtime attachments like mirror canvases and
registered render functions.

The only persisted scene/document source is now:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-project-store.ts`

### Canonical bootstrap naming now matches reality

The project bootstrap entrypoint was renamed from:

- `initializeFromLegacy`

to:

- `initializeProjectState`

That matters because the canonical editor-project store is now the real source
of persisted project truth. On startup, it prefers its own persisted canonical
state and only falls back to projected layer data when needed.

### History no longer duplicates open-node context

`history-store` no longer keeps its own copy of:

- `activeContext`
- `openNodeNetwork`

Instead, it now reads the active node network directly from:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/node-network-store.ts`

and combines that with its own focus flag to decide whether undo/redo should
apply to:

- layer history
- or node-editor history

That removes one more place where the editor could silently fork into two
different ideas of “which graph is currently active”.

## Validation

- `pnpm vitest run tests/foundation/history-store.test.ts tests/foundation/editor-project-store.test.ts tests/foundation/project-persistence.test.ts`
- `pnpm studio:typecheck`
- `pnpm check:foundation`
- browser sanity check on the real editor at `http://localhost:4173/?allowSmallViewport=1`

## Exit criteria reached

- projection stores no longer persist scene truth
- canonical project bootstrap naming reflects actual ownership
- history no longer duplicates node-editor selection context
- full regression gate stayed green
- the real editor still loads in the browser after the cleanup

## Still left after this phase

- keep tightening history/control seams so editor controls and future
  agent/MCP controls converge on the same canonical control plane
- address the remaining Vite build hygiene warnings:
  - large app chunk
  - static/dynamic import warning around `export-store`
  - static/dynamic import warning around `idb-file-store`
