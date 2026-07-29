# Phase 4 Graph Truth Implementation

## Purpose

This document records the fourth real hidden-brain swap under the preserved
editor UI:

- graph document truth is no longer owned by the node-editor UI store
- graph execution is no longer owned by the node-editor UI store
- the existing node editor still renders against the same visible surface

## What Landed

### Canonical graph store

A new canonical graph store now exists in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-graph-store.ts`

It owns:

- graph network truth keyed by parameter id
- graph create/remove/duplicate operations
- node and edge mutation
- input-value mutation for graph nodes
- executable graph evaluation
- graph persistence serialization and rehydration

This is now the canonical graph brain for the editor terrain.

### Node editor store is now a projection and UI adapter

The preserved node-editor-facing store in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/node-network-store.ts`

still exposes the same surface the UI already expects, but it no longer owns
graph truth itself.

Its role is now:

- hold node-editor UI state such as:
  - open network
  - minimized state
  - force-show overlay flag
- mirror canonical graph networks from `editor-graph-store`
- delegate graph mutations and evaluation down into the canonical graph store

That means the node editor face stays intact while the brain underneath it is
replaced.

### History and persistence now re-enter the canonical graph path

The graph/history/persistence seams were updated so the legacy node-editor
store is no longer the authoritative path for project graph data:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/history-store.ts`
- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/project-persistence.ts`
- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-project-store.ts`

What changed:

- node undo/redo now restores nodes and edges through `editor-graph-store`
- project save/load now serializes and hydrates canonical graph truth
- layer duplication/default-network/preset paths now write into the canonical
  graph store

### Cycle cleanup needed for canonical graph ownership

To make the graph store safe as a canonical runtime-adjacent module, the node
graph types were split into:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/graph-types.ts`

and the runtime-adjacent graph modules were cleaned up so they do not pull the
node-editor store back into import-time ownership through type-only references.

That was necessary to avoid rebuilding the same circular “UI owns runtime”
shape in a new place.

## Why This Shape

Before this phase, the node editor still had one mixed store that owned too
much at once:

- graph document truth
- graph execution
- persistence shape
- open/minimized editor UI state
- some history application assumptions

That violated the agreed split:

- the editor edits
- the runtime runs

The clean swap was:

- move canonical graph truth and execution into one explicit graph store
- keep the node-editor UI store only as a thin adapter and UI state holder
- patch history and persistence so they re-enter the same canonical graph path

## What This Phase Does Not Claim Yet

- it does not make the node editor itself runtime-package-native yet
- it does not remove the UI adapter store entirely
- it does not move graph truth into the package-level `VizProjectDocument`
  graph contract inside the real product editor yet
- it does not remove the remaining editor-side history context store yet

## Exit Result

The repo now has a real fourth ownership swap under the preserved editor UI:

- the visible node editor remains the same
- graph truth is explicit
- graph execution is explicit
- history and persistence re-enter canonical graph ownership
- the old node-editor store is no longer the real graph brain

That is the correct base for the next cleanup step:

- burn down the remaining adapter/projection seams
- then expose the same graph/runtime controls through the canonical agent/tool
  surface
