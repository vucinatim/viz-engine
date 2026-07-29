# Phase 10: Editor Control Plane And Build Hygiene

## Goal

Close two remaining cleanup seams after the major editor regut:

- stop letting user-facing editor commands reach into multiple Zustand stores
  directly
- remove the remaining Vite build-noise caused by mixed import patterns and
  oversized eager chunks

The visible editor stays the same. The change is that its command paths and
build output become much easier to reason about.

## What changed

### Editor-facing commands now converge on one local control surface

A new explicit editor control facade now lives in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/editor-control.ts`

It groups stable editor-facing operations under a few explicit domains:

- `project`
- `history`
- `preview`
- `nodeEditor`
- `audio`
- `ui`
- `persistence`

This is not a new truth store. It is a thin canonical entry layer over the
already-regutted state owners:

- `editor-project-store`
- `editor-preview-store`
- `editor-audio-session-store`
- `editor-graph-store`
- `history-store`
- `project-persistence`

The important result is that the real editor surface now has one cleaner place
to perform durable operations, which is also the right seam for future
agent/MCP tools to converge on.

### The preserved editor surface now uses that control plane

The main user-facing controls were rewired onto `editorControl`, including:

- toolbar save/load/reset and undo/redo
- layer add/remove/duplicate/reorder/settings/value writes
- play/pause/seek transport actions
- track navigation and capture-session control
- node-editor open/close/enable/disable flows
- rhythm-lab and other editor UI toggles

That means the editor UI no longer needs to know which internal store owns
which part of reality for routine actions.

### Build hygiene warnings were cleaned at the source

The two mixed static/dynamic import warnings were removed by making those
imports consistent:

- `video-encoder.ts` now uses a normal static import of `export-store`
- `morph-shapes.ts` now uses a normal static import of `idb-file-store`

The initial application chunk was also reduced by:

- lazy-loading `animation-builder`
- lazy-loading `profiler-panel`

And the Vite chunking strategy is now explicit in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/apps/viz-studio/vite.config.ts`

The final build posture is simpler than the temporary experiments:

- keep meaningful vendor splitting
- keep lazy boundaries for truly hidden heavy surfaces
- avoid over-clever local chunk rules that create circular-chunk warnings

## Validation

- `pnpm studio:typecheck`
- `pnpm studio:build`
- `pnpm check:foundation`

The final validated build state includes:

- no mixed static/dynamic import warnings
- no circular chunk warnings
- initial app chunk materially smaller than before the control-plane/build pass
- full foundation gate still green

## Exit criteria reached

- user-facing editor commands now have one explicit local control surface
- future agent/MCP tools have a cleaner canonical seam to target
- mixed import build warnings are gone
- temporary noisy chunking experiments were removed
- full validation stayed green after the cleanup

## Still left after this phase

- broaden the explicit control plane further until internal browser/runtime
  attachment code is the only remaining place that talks store-to-store
  directly
- continue hardening browser-verified live authoring flows on top of the now
  cleaner control surface
