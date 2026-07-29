# Phase 5 Canonical History Cleanup

## Purpose

This document records the next cleanup pass after the first editor ownership
swaps:

- layer undo/redo should snapshot canonical working-project truth directly
- history should stop thinking in legacy layer-store/layer-values-store terms
- the visible editor behavior should remain unchanged

## What Landed

### Layer history now stores canonical project snapshots

The layer-history state in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/history-store.ts`

now stores:

- canonical `EditorProjectDocument` snapshots
- graph enabled-state snapshots

instead of storing:

- serialized legacy layer-store layer shells
- serialized layer-values-store payloads

That means the layer undo/redo path now snapshots the same working project the
editor is already using as its canonical scene truth.

### Layer history restore now re-enters canonical project ownership directly

When layer history is applied, it now restores through:

- `useEditorProjectStore.getState().importWorkingProject(...)`

instead of reconstructing:

- `layer-store`
- `layer-values-store`

and then forcing the canonical project store to re-import from those legacy
stores.

This removes another important transitional bridge from the editor brain.

### The history manager now watches canonical project truth

The tracking component in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/history-manager.tsx`

now watches:

- canonical working-project truth
- canonical graph enabled-state truth

instead of watching:

- `layer-store`
- `layer-values-store`
- full node-network graph objects

That makes the history trigger reflect the actual hidden ownership model after
the earlier layer and graph swaps.

## Why This Shape

After the earlier layer working-project swap, the old history implementation
still thought the real source of truth was:

- legacy layer-store state
- legacy layer-values-store state

and then re-imported that back into the canonical project store after undo/redo.

That was acceptable as a temporary bridge, but it was not a clean final shape.

This cleanup removes that contradiction:

- editor history now snapshots canonical project truth
- canonical project truth now restores directly
- legacy layer/value stores remain projections for the preserved UI, not the
  truth history reasons about

## What This Phase Does Not Claim Yet

- it does not remove the history store itself
- it does not unify node-editor history into a new package-level action model
- it does not remove every remaining projection seam for legacy UI stores yet

## Exit Result

The repo now has one less major transitional bridge:

- layer history is canonical
- undo/redo no longer reconstructs canonical project truth from legacy stores
- the visible editor behavior remains the same

This is the right cleanup step before further adapter burn-down and the
stronger editor/agent control surface work.
