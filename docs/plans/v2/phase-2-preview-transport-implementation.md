# Phase 2 Preview Transport Implementation

## Purpose

This document records the second real hidden-brain swap under the preserved
editor UI:

- preview transport truth is now explicit
- transport state is no longer owned by `editor-store`
- the existing playback controls and preview shell stay visually intact

## What Landed

### Canonical app-local preview transport store

A new preview transport store now exists in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-preview-store.ts`

It owns:

- `isPlaying`
- `currentFrame`
- `durationFrames`
- `fps`
- `loop`
- preview mode
- the browser-side Remotion player attachment ref

The transport semantics are backed by the already-built transport controller in
`@viz-engine/editor-session`, rather than being reimplemented ad hoc.

### The real playback cluster now reads one preview brain

The preserved editor UI now uses the canonical preview store for:

- Remotion player playback ownership
- play/pause toggles
- seek operations
- frame time used by layer rendering
- preview-aware waveform seeking
- graph-overlay “playing” UI affordances
- export pause/resume behavior

### `editor-store` is narrower

`editor-store` no longer owns preview transport fields such as:

- `isPlaying`
- `playerRef`
- `playerFPS`

It is now closer to what it should be:

- editor/UI preferences
- ambient mode
- quality / resolution multiplier
- rhythm-lab UI state

### Persistence and reset no longer pretend preview transport is editor state

Project persistence no longer serializes preview transport from `editor-store`.

Reset now clears the explicit preview transport store instead of trying to
manually preserve and rehydrate player refs inside editor state.

### Track navigation now keeps preview transport in sync

Audio track navigation and restart now also reset preview position through the
canonical preview store, so audio transport and visual transport do not drift
apart on next/previous/restart flows.

## Why This Shape

The preview transport seam had already become the next real bottleneck because
the old system expressed playback state in too many places at once:

- `editor-store.isPlaying`
- the Remotion player instance
- direct player-ref reads in render/export code
- audio-element-driven seeking helpers

That was exactly the kind of dual-brain ownership the rewrite is supposed to
remove.

The clean cut for this phase was:

- make one explicit preview store canonical
- let the preserved UI read from it
- let browser-specific player attachment stay explicit
- keep audio-session ownership for the next phase

## What This Phase Does Not Claim Yet

- it does not fully replace audio-session truth yet
- it does not make the runtime itself the final preview owner yet
- it does not remove the remaining browser-media specifics from the app layer
- it does not rewrite the export pipeline around the package-level preview
  foundations yet

## Exit Result

The repo now has a real second ownership swap under the actual editor:

- the visible playback controls are preserved
- preview transport truth is explicit
- editor UI state is less polluted by runtime ownership
- renderer/export/waveform consumers no longer read casual playback fields out
  of `editor-store`

That is the correct base for the next seam:

- audio session truth
- then graph/node truth
