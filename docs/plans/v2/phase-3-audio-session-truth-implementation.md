# Phase 3 Audio Session Truth Implementation

## Purpose

This document records the third real hidden-brain swap under the preserved
editor UI:

- audio source and session truth are now explicit
- browser audio engine attachments are no longer mixed into the same store
- the existing audio panel stays visually intact

## What Landed

### Canonical app-local audio session store

A new audio session store now exists in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-audio-session-store.ts`

It owns:

- canonical attached source metadata
- current media selection URL
- bundled track list and current track index
- local file selection
- capture-session source truth
- current time and visual time
- analyzer/session diagnostics backed by `@viz-engine/editor-session`

The session semantics are backed by the already-built audio-session controller
in `@viz-engine/editor-session`, rather than being improvised inside the
preserved editor components.

### Browser audio attachments are explicitly separate

The old mixed audio store has been replaced by:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/audio-engine-store.ts`

That narrower store now owns browser/runtime attachment details only:

- audio element ref
- audio context
- analyzer node
- gain node
- attached media source node
- decoded audio buffer
- captured media stream
- imperative element attachment helpers

This keeps browser-media ownership explicit without pretending it is canonical
editor or runtime truth.

### The real audio panel now reads one audio session brain

The preserved audio UI now uses the canonical session store for:

- bundled track selection
- local file selection
- previous/next/restart behavior
- current time / visual time display
- capture-mode state

While browser-specific consumers now read the narrower engine store for:

- audio element access
- analyzer access
- gain-node and stream attachment

### Audio analyzer state is now surfaced explicitly

A new manager now exists in:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-audio-session-manager.tsx`

It keeps the canonical audio session in sync with the actual browser audio
engine availability:

- no analyzer => unavailable
- analyzer present but no source => idle
- analyzer plus connected source => active

That gives the editor a truthful session model without making the UI itself own
those semantics.

## Why This Shape

The old audio path had become a second giant mixed store:

- source selection
- track navigation
- audio time state
- capture mode
- analyzer nodes
- audio context
- media element refs
- decoded buffers

That violated the main rewrite rule:

- the editor edits
- the runtime runs

The clean cut for this phase was:

- move source and session truth into one explicit audio-session store
- keep browser engine attachments in a separate store
- let the preserved UI read both where appropriate
- do not redesign the panel

## What This Phase Does Not Claim Yet

- it does not make browser media attachment a package-level runtime concern
- it does not remove all old analyzer-driven component assumptions yet
- it does not move Rhythm Lab or node-audio consumers onto baked artifact inputs
- it does not replace the remaining browser-audio imperative edges in waveform
  and export flows yet

## Exit Result

The repo now has a real third ownership swap under the actual editor:

- the visible audio panel is preserved
- audio source/session truth is explicit
- browser audio engine attachments are separate
- preview transport and audio session no longer share one mixed legacy store

That is the correct base for the next seam:

- graph / node editor truth
- then deeper burn-down of the old editor-owned runtime assumptions
