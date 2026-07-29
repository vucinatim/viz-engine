# Phase 1 Layer Working Project Implementation

## Purpose

This document records the first real editor gut-swap slice under the preserved
product UI:

- layer truth is now centralized
- the existing layer UI stays in place
- the old layer stores are no longer the intended source of truth

## What Landed

### Canonical app-local layer project

A new app-local canonical layer project store now exists in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-project-store.ts`

It owns:

- layer existence
- layer order
- layer values
- layer settings
- expanded/collapsed state
- debug-toggle state

The store intentionally does **not** own graph truth yet. That remains in the
node-network store until the later graph phase.

### Real editor layer flows now target the canonical store

The preserved editor UI now dispatches layer mutations through the canonical
store for:

- add layer
- remove layer
- duplicate layer
- reorder layer
- expand/collapse layer
- expand/collapse all layers
- debug toggle
- layer settings edits
- layer parameter edits
- layer preset application

### Legacy stores are now projections, not the intended truth

For this phase, the old editor/runtime layer surfaces still read:

- `layer-store`
- `layer-values-store`

But those stores are now updated from the canonical layer working project.

That keeps:

- the current UI intact
- the current renderer paths intact
- the current preview mirrors intact
- the current history-manager wiring intact

without letting the old layer mutation APIs remain the primary ownership path.

### Undo/redo is kept coherent for this phase

Layer undo/redo still uses the existing history store.

To avoid a dual-brain failure mode, history application now re-imports layer
truth back into the canonical layer project after legacy history restoration.

That is a temporary bridge for this phase, not the final history architecture.

### Save/load/reset now respect the canonical layer project

Project persistence still writes the current `.vizengine.json` product shape,
but the layer payload is now derived from the canonical layer working project
instead of being read directly from ad hoc editor mutations.

Load and reset paths now also reinitialize the canonical layer project after
legacy-store hydration/reset.

## Why This Shape

The cleanest first cut was:

- centralize layer truth
- keep the face still
- avoid a fake parallel editor shell
- avoid dragging preview, audio, and graph rewrites into one change

The important tradeoff is deliberate:

- canonical ownership is real for layers now
- legacy stores still exist as projections because renderer, mirror-canvas,
  and history surfaces still depend on them

That is acceptable for this phase because the bridge is explicit and one-way.

## What This Phase Does Not Claim Yet

- it does not make the runtime the canonical owner of the full editor scene yet
- it does not replace graph truth yet
- it does not replace transport/preview truth yet
- it does not replace audio-session truth yet
- it does not fully delete `layer-store` or `layer-values-store` yet

## Exit Result

The repo now has a real first ownership swap under the actual editor:

- the visible layer panel is preserved
- the hidden layer brain is cleaner
- project persistence is less ad hoc
- history no longer silently forks a second layer truth model

That is the correct base for the next real slice:

- transport and preview truth
- then audio session truth
- then graph truth
