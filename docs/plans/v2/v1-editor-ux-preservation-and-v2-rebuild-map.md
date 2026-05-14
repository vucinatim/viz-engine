# V1 Editor UX Preservation And V2 Rebuild Map

## Purpose

This document makes one critical V2 rule explicit:

- the V1 editor experience is the product UX reference
- the V1 hidden architecture is what must be replaced

It exists to answer:

- what parts of the current editor are core product value
- what parts are architecture debt
- what the rebuild should preserve exactly
- what the first true replacement seam should be

This should be treated as a front-line execution document for the next editor
work, not a historical note.

## Core Correction

The wrong framing is:

- V1 is just legacy
- V2 should invent a different editor concept

The correct framing is:

- V1 already contains a remarkable live creative-tool UX
- V2 must preserve that experience aggressively
- V2 must replace the state/runtime/document architecture underneath it

So the mission is not:

- “build a new editor”

The mission is:

- “rebuild the real Viz editor over V2 truth”

## What Was Verified

The following V1 surfaces were inspected directly:

- [src/app/page.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/app/page.tsx)
- [src/components/editor/editor-layout.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-layout.tsx)
- [src/components/editor/editor-header.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-header.tsx)
- [src/components/editor/editor-toolbar.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-toolbar.tsx)
- [src/components/editor/layers-config-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layers-config-panel.tsx)
- [src/components/editor/layer-config-card.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-config-card.tsx)
- [src/components/editor/layer-parameters.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-parameters.tsx)
- [src/components/editor/animation-builder.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/animation-builder.tsx)
- [src/components/editor/remotion-player.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/remotion-player.tsx)
- [src/components/editor/custom-player-controls.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/custom-player-controls.tsx)
- [src/components/editor/video-timeline.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/video-timeline.tsx)
- [src/components/editor/layer-renderer.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-renderer.tsx)
- [src/components/audio/audio-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/audio-panel.tsx)
- [src/lib/stores/editor-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-store.ts)
- [src/lib/stores/layer-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/layer-store.ts)

This is enough to identify the core workflow shape and the most important
architecture replacement seams.

## Product UX To Preserve

These are first-class product assets.

### 1. Spatial editor layout

The current panel structure is right:

- left panel for scene/layer authoring
- top-right for live visual output
- bottom-right for audio and transport
- overlay-based graph/animation editing over the live visual

This is not accidental.
It creates the correct creative-tool relationship between:

- scene structure
- live output
- sound
- modulation logic

This spatial workflow should be preserved unless a clearly better replacement
is proven.

### 2. Dense, serious-tool header and toolbar posture

The current header and toolbar do not feel like a toy app.

They already express the right product posture:

- file/project operations
- examples
- export
- fullscreen
- performance visibility
- ambient mode and quality control
- tool-density without clutter collapse

That seriousness should remain.

### 3. Layer-centric composition workflow

The layer workflow is a major strength.

Important preserved qualities:

- drag reorder
- quick layer affordances
- preview per layer
- collapse/expand behavior
- direct visibility into what a layer is
- density of controls without losing scanability

This is one of the clearest pieces of product value in the current app.

### 4. Parameter editing with animation affordances inline

The current parameter workflow is excellent because it keeps:

- parameter editing
- animation enablement
- live values
- graph entry points

close together.

That relationship should survive the rebuild.

### 5. Overlay-based animation/node workflow over the live visual

This is a big deal.

The current animation-builder posture is strong because:

- graph editing feels attached to the visual
- the live result remains visible underneath
- the user does not mentally switch into a separate disconnected tooling world

That should be preserved.

### 6. Live preview and transport relationship

The player, controls, fullscreen behavior, and transport overlay are all part
of the product identity.

Important preserved qualities:

- strong central visual stage
- play/pause immediacy
- integrated seeking
- live relation between playback and audio

### 7. Audio panel as a first-class creative surface

The audio panel is not just an upload widget.

It is part of the actual workflow:

- load/capture audio
- transport
- waveform/timeline
- timecode
- volume
- track navigation

This must remain first-class in V2.

### 8. “Miracle frontend” feel

The broader thing to preserve is the feeling that the editor is:

- live
- immediate
- dense but legible
- tool-like
- confident

That feel is a real requirement.

## Architecture To Replace

These are not product strengths.
These are replacement targets.

### 1. Editor store as partial runtime owner

The editor store currently owns things it should not own long term, including:

- playback/runtime coordination
- preview/runtime coupling
- hidden mutable live state

This is exactly the kind of architecture V2 is meant to replace.

### 2. Layer store as scene truth plus runtime carrier

The current layer store mixes:

- scene structure
- component instance identity
- runtime render registration
- mirror canvas registration
- component-local state lifecycle

That is not the right long-term boundary.

The editor should consume scene truth and runtime truth, not own both.

### 3. Hidden direct coupling between UI state and render behavior

Examples include:

- direct renderer setup living in layer components
- store-owned manual render registration
- implicit runtime effects tied to React/component lifecycle

This makes the current system powerful but difficult to reuse, validate, and
make agent-operable.

### 4. Component/runtime evaluation coupled to browser/editor assumptions

The current render path in [layer-renderer.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-renderer.tsx)
is proof that the system works, but it also shows the wrong long-term
ownership.

That ownership should move into:

- canonical project truth
- runtime evaluation
- explicit renderer/compositor packages

### 5. Persistence and mutation semantics tied too closely to app stores

The editor currently feels good because of carefully crafted UX, but the
underlying mutation model is not yet the clean V2 action/document model.

That is exactly what should be replaced.

## Preserve / Replace / Port / Drop Map

### Preserve as UX

- overall panel layout
- editor header posture
- file/examples/export workflows as product affordances
- layer list and layer card mental model
- inline parameter + animation affordance model
- overlay graph builder posture
- central live visual stage
- transport controls and fullscreen behavior
- audio panel centrality
- overall density and immediacy

### Replace as architecture

- scene truth living in Zustand stores
- runtime behavior living in editor components
- render registration via store maps
- hidden mutable cross-store state
- direct ownership of temporal/runtime semantics by UI layers

### Port later but deliberately

- rhythm lab
- advanced export UI
- profiler and debug surfaces
- richer example/project workflows
- secondary polish tools

These matter, but they are not the first seam.

### Drop or reevaluate

- anything that exists only because of bad architectural coupling
- anything that duplicates what V2 runtime/actions now handle better
- any UI complexity that cannot justify itself against the stronger V2 core

## The First True Replacement Seam

The first real editor rebuild seam should be:

- canonical working head
- canonical action-driven mutation
- runtime-owned preview state
- editor-only UI state kept separate

Not:

- a new alternate studio product
- a top-down rewrite of every panel at once
- a browser automation layer pretending to be architecture

This seam should sit underneath the preserved editor workflow.

## Immediate Rebuild Strategy

### Step 1

Preserve the shell and workflow shape:

- main page structure
- panel structure
- live stage posture
- audio panel posture

### Step 2

Identify where scene truth currently enters the editor and replace that with:

- `VizProjectDocument`
- working-head session
- canonical actions

### Step 3

Move preview/runtime ownership under V2 runtime packages while preserving the
same user-facing loop.

### Step 4

Rebuild the layer and parameter workflow on top of canonical actions, not store
mutation shortcuts.

### Step 5

Rebuild the animation/node workflow as a truthful client of V2 graph/runtime
semantics while preserving the current UX posture.

## What This Means For `apps/viz-studio`

`apps/viz-studio` is still useful.

But its role should be:

- dev shell
- runtime verification surface
- isolated preview/debug harness

It should not silently become:

- the main editor product concept
- a weaker replacement for the actual editor

## Validation Standard For Editor Rebuild Work

Future editor rebuild slices should be evaluated against two bars:

### Architecture bar

- clearer ownership
- canonical project truth
- stable action surface
- runtime/editor separation
- deterministic render compatibility

### UX bar

- does not degrade the live creative-tool feel
- preserves the strength of the current panel workflow
- preserves the relationship between visual stage, audio, layers, and graphs
- preserves or improves immediacy

If a change helps architecture but obviously weakens the editor experience, it
is not good enough.

## Summary

The rule is now simple:

- preserve the miracle UX
- replace the miracle’s hidden machinery with professional architecture

That is the correct V2 editor direction.
