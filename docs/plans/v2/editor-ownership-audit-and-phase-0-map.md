# Editor Ownership Audit And Phase 0 Map

## Purpose

This document answers the question:

- how do we replace the editor’s hidden guts without swapping its face

It is the detailed Phase 0 audit for the real editor rebuild.

It should be read together with:

- [real-editor-v2-rewire-execution-plan.md](./real-editor-v2-rewire-execution-plan.md)
- [v1-editor-ux-preservation-and-v2-rebuild-map.md](./v1-editor-ux-preservation-and-v2-rebuild-map.md)
- [agent-operated-live-editor-roadmap.md](./agent-operated-live-editor-roadmap.md)

## Non-Negotiable Rule

This work is not allowed to redesign the editor by accident.

That means:

- do not remove visible controls
- do not change panel structure
- do not simplify density
- do not “modernize” the shell by replacing it with a lighter concept

Allowed additions, when truly needed:

- small buttons
- small inputs
- tooltips
- hidden debug affordances

Not allowed as a side effect:

- visible text churn
- panel replacement
- control removal
- changing the editor’s visual identity

## Real Editor Surface

The current live editor is composed through:

- [src/components/editor/editor-page.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-page.tsx)
- [src/components/editor/editor-layout.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-layout.tsx)
- [src/components/editor/editor-header.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-header.tsx)
- [src/components/editor/layers-config-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layers-config-panel.tsx)
- [src/components/editor/remotion-player.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/remotion-player.tsx)
- [src/components/editor/animation-builder.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/animation-builder.tsx)
- [src/components/audio/audio-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/audio-panel.tsx)

Those are the surfaces we must keep looking the same while changing ownership
underneath them.

## Current Ownership Problem

The editor currently works because a group of Zustand stores collectively act
as:

- scene document
- live preview state
- audio session state
- graph document
- history system
- runtime attachment layer

That is the core architectural problem.

The UI is not the issue.

The issue is that truth is fragmented and some of those fragments also own
runtime side effects.

The intended split is simple:

- the editor edits
- the runtime runs

So the goal is not to make the editor own runtime behavior more elegantly.

The goal is to stop the editor from owning runtime truth at all, while keeping
React as the host for the same visible editor surface.

## Current Store Ownership Map

### 1. Editor Store

File:

- [src/lib/stores/editor-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-store.ts)

Current fields:

- `isPlaying`
- `playerRef`
- `playerFPS`
- `ambientMode`
- `dominantColor`
- `resolutionMultiplier`
- `isRhythmLabOpen`
- `rhythmSelection`

Current role:

- mixed UI state
- mixed preview/runtime state
- mixed runtime refs

Target ownership:

- `ambientMode`
  - stays editor UI state
- `isRhythmLabOpen`
  - stays editor UI state
- `rhythmSelection`
  - likely editor working-head adjunct or dedicated rhythm-lab domain state
- `resolutionMultiplier`
  - preview/runtime state
- `isPlaying`
  - preview transport state
- `playerFPS`
  - preview/runtime metadata
- `playerRef`
  - browser preview adapter detail, not canonical editor truth
- `dominantColor`
  - likely derived preview/UI state, not canonical scene truth

Main problem:

- one store currently mixes pure UI toggles with transport truth and runtime
  references

Immediate replacement seam:

- split `editor-store` into:
  - editor UI state
  - preview session state
  - runtime/browser refs kept out of canonical editor truth

### 2. Layer Store

File:

- [src/lib/stores/layer-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/layer-store.ts)

Current contents:

- `layers`
- `layerRenderFunctions`
- layer CRUD operations
- expansion/debug state
- layer settings
- component swapping
- duplication
- reorder
- mirror canvas registration
- manual render registration

Current role:

- scene document
- runtime attachment layer
- layer UI state
- export/runtime coordination

Target ownership:

- `layers` as current scene truth
  - move into canonical working project document
- `isExpanded`
  - editor UI state only
- `isDebugEnabled`
  - editor UI / preview debug state
- `layerSettings`
  - split carefully:
    - scene-affecting settings into project truth
    - preview-only/debug settings out of project truth
- `comp`
  - canonical component binding in project truth
- `config`
  - canonical layer parameter schema binding
- `state`
  - must stop being editor-owned implicit component runtime state
- `mirrorCanvases`
  - browser runtime attachment detail only
- `layerRenderFunctions`
  - browser/export runtime attachment detail only

Main problem:

- this store is doing four jobs at once

Immediate replacement seam:

- first move layer CRUD and parameter mutation onto canonical working-head
  actions
- leave browser attachments in a smaller preview/runtime attachment layer until
  later cleanup

### 3. Layer Values Store

File:

- [src/lib/stores/layer-values-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/layer-values-store.ts)

Current role:

- actual live parameter values for each layer

Target ownership:

- canonical working project truth

Main problem:

- actual scene values are split away from `layer-store`
- project truth is already bifurcated before runtime even starts

Immediate replacement seam:

- merge the concept of layer values into the canonical working project model
- keep any local form/transient editing state out of the canonical document

### 4. Node Network Store

File:

- [src/components/node-network/node-network-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/node-network-store.ts)

Current contents:

- graph networks by parameter id
- `openNetwork`
- `areNetworksMinimized`
- `shouldForceShowOverlay`
- graph CRUD and compute
- graph enable/disable state
- graph output computation
- graph duplication and cleanup

Current role:

- graph document truth
- graph UI state
- graph execution owner

Target ownership:

- `networks`
  - canonical graph truth in the working project
- `openNetwork`
  - editor UI state
- `areNetworksMinimized`
  - editor UI state
- `shouldForceShowOverlay`
  - editor UI transient state
- `computeNetworkOutput`
  - should no longer be editor-owned graph execution truth

Main problem:

- the graph editor UI and graph evaluation model are still fused together

Immediate replacement seam:

- move graph document mutation into canonical actions first
- only after that move execution ownership fully onto the V2 graph/runtime path

### 5. Audio Session And Audio Engine Stores

Files:

- [src/lib/stores/editor-audio-session-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-audio-session-store.ts)
- [src/lib/stores/audio-engine-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/audio-engine-store.ts)

Current contents:

- audio source selection and capture-session truth
- current time
- visual time
- track list/index/url
- audio element ref
- decoded audio buffer
- audio context / analyzer / gain / source nodes
- capture stream attachment state

Current role:

- explicit editor audio session truth
- browser audio engine attachment truth

Target ownership:

- audio source/session lifecycle
  - explicit preview audio session state
- browser refs and Web Audio nodes
  - browser adapter/runtime attachment detail
- `currentTime`
  - explicit audio session timing state
- `visualTime`
  - derived preview/audio session state
- track list/index/url
  - audio session / editor source selection state

Main problem solved:

- browser/Web Audio runtime objects are no longer in the same store as
  user-facing audio session state

Current remaining follow-up:

- remove the remaining direct media-element writes in legacy waveform/export
  consumers so more of the browser attachment seam is centralized

### 6. History Store

File:

- [src/lib/stores/history-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/history-store.ts)

Current role:

- editor history
- node history
- context routing
- direct restore into multiple legacy stores

Main problem:

- history restore currently mutates multiple stores directly because truth is
  fragmented

Target ownership:

- undo/redo over canonical working head plus explicit editor UI context

Immediate replacement seam:

- after working-head truth is in place, history should apply action/document
  snapshots, not coordinate legacy store restoration

### 7. Comp Store

File:

- [src/lib/stores/comp-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/comp-store.ts)

Current role:

- component catalog registry for the editor

Target ownership:

- lightweight editor/runtime registry input

Assessment:

- this is relatively clean already
- keep small
- avoid letting it become scene truth

## Current Mutation Entry Points

These are the actual UI entry points that mutate editor truth today.

### Layer creation

- [src/components/editor/editor-layer-search.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-layer-search.tsx)
- currently calls `useLayerStore().addLayer`

### Layer structural changes

- [src/components/editor/layer-config-card.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-config-card.tsx)
- currently calls:
  - `removeLayer`
  - `duplicateLayer`
  - `setIsLayerExpanded`
  - `setDebugEnabled`
  - `updateLayerComp`

### Layer parameter changes

- [src/components/editor/layer-parameters.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-parameters.tsx)
- [src/components/config/dynamic-form.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/config/dynamic-form.tsx)
- currently call `useLayerValuesStore().updateLayerValue`

### Layer settings changes

- [src/components/editor/layer-settings.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-settings.tsx)
- [src/components/editor/layer-preview.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-preview.tsx)
- currently call `updateLayerSettings`

### Layer reordering

- [src/components/editor/layers-config-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layers-config-panel.tsx)
- currently calls `reorderLayers`

### Graph editing

- [src/components/editor/animation-builder.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/animation-builder.tsx)
- [src/components/node-network/node-network-renderer.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/node-network-renderer.tsx)
- graph toolbar/parameter affordances currently call:
  - `setOpenNetwork`
  - `setNetworkEnabled`
  - `pushNodeHistory`

### Transport and preview

- [src/components/editor/remotion-player.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/remotion-player.tsx)
- [src/components/editor/custom-player-controls.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/custom-player-controls.tsx)
- [src/components/editor/video-timeline.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/video-timeline.tsx)
- currently coordinate through:
  - `editor-store.isPlaying`
  - audio-session timing state
  - direct DOM/audio element writes
  - direct Remotion player refs

### Audio source loading

- [src/components/audio/audio-file-loader.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/audio-file-loader.tsx)
- [src/components/audio/capture-audio.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/capture-audio.tsx)
- now routes through the canonical editor audio-session store plus the
  narrower browser audio-engine store

### Project load/save/reset

- [src/lib/project-persistence.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/project-persistence.ts)
- currently serializes and rehydrates legacy stores directly

This file is one of the most important replacement seams.

## Current Visible Surface To Hidden Truth Map

### Header

Visible component:

- [src/components/editor/editor-header.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-header.tsx)

Hidden truth used today:

- `ambientMode`
- `resolutionMultiplier`
- `isRhythmLabOpen`

Migration note:

- this should be one of the easiest UI-preserving surfaces to keep intact while
  splitting UI-only vs preview-state ownership

### Layer panel

Visible components:

- [src/components/editor/layers-config-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layers-config-panel.tsx)
- [src/components/editor/layer-config-card.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-config-card.tsx)
- [src/components/editor/layer-parameters.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-parameters.tsx)
- [src/components/editor/layer-settings.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-settings.tsx)

Hidden truth used today:

- `layer-store`
- `layer-values-store`
- `node-network-store`
- `history-store`

Migration note:

- this is the best first major rewire seam

### Preview stage

Visible components:

- [src/components/editor/remotion-player.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/remotion-player.tsx)
- [src/components/editor/layer-renderer.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-renderer.tsx)
- [src/components/editor/custom-player-controls.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/custom-player-controls.tsx)

Hidden truth used today:

- `editor-store`
- `audio-store`
- `export-store`
- `layer-store`
- implicit component/runtime state

Migration note:

- preview and runtime attachment are still fused deeply here
- this should be Phase 2, not Phase 1

### Audio panel

Visible components:

- [src/components/audio/audio-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/audio-panel.tsx)
- [src/components/audio/audio-file-loader.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/audio-file-loader.tsx)
- [src/components/audio/waveform-display.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/waveform-display.tsx)

Hidden truth used today:

- `editor-audio-session-store`
- `audio-engine-store`
- browser audio element ref
- Web Audio graph

Migration note:

- this should be rewired after transport truth, not before it

### Node editor overlay

Visible components:

- [src/components/editor/animation-builder.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/animation-builder.tsx)
- [src/components/node-network/node-network-renderer.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/node-network-renderer.tsx)

Hidden truth used today:

- `node-network-store`
- `history-store`
- `layer-store`
- `editor-store`

Migration note:

- this is the highest-risk rewire because it mixes UI, graph truth, and
  temporal behavior

## Clean Target Ownership Model

The editor should eventually be split like this:

### A. Canonical working project truth

Owns:

- layers
- layer order
- component bindings
- layer values
- scene-affecting layer settings
- graphs
- graph bindings
- project-level asset and artifact refs

Should live behind:

- canonical project document
- canonical actions
- canonical working-head reducer/session

### B. Editor UI state

Owns:

- which panels are open
- which layer is selected
- which layer cards are expanded
- whether the rhythm-lab panel is open
- which graph overlay is open
- whether the node editor is minimized
- hover/overlay visibility hints

Should never leak into:

- exported project documents
- deterministic runtime inputs

### C. Preview/runtime session state

Owns:

- play/pause/seek state
- current frame/time
- resolution multiplier
- live-vs-baked diagnostics
- preview selection of source assets/artifacts where needed

Should be explicit and inspectable.

This is runtime-facing session state that the editor controls.

It is not ordinary UI state.

### D. Browser attachment state

Owns:

- DOM refs
- player refs
- audio element refs
- Web Audio nodes
- mirror canvases
- manual render callbacks

This is real, but it is not canonical editor truth.

It is also not the runtime's semantic core.

It is the browser host layer around the runtime.

### E. Audio session state

Owns:

- current track/source
- track list
- capture state
- audio source mode
- analyzer mode diagnostics

This should be separate from raw browser audio node references.

## Runtime Posture Inside The Editor

The editor should not evaluate the scene by itself.

The clean end state is:

- editor UI manipulates a canonical working project
- editor UI drives explicit preview/audio session state
- runtime evaluates the scene from those explicit inputs

The runtime should be as pure as possible at its core:

- project
- resolved assets/artifacts
- explicit frame/time input
- explicit mode/session input
- evaluated result

And where runtime state is truly needed, it should live in explicit runtime
session objects:

- checkpoints
- caches
- materialized assets
- preview session state

not hidden editor-owned behavior

## Recommended Rewire Order

### First seam: working project truth under the layer panel

Why:

- central workflow
- high value
- lowest conceptual risk
- already has a canonical action system available

Exact files to target first:

- [src/components/editor/editor-layer-search.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/editor-layer-search.tsx)
- [src/components/editor/layers-config-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layers-config-panel.tsx)
- [src/components/editor/layer-config-card.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-config-card.tsx)
- [src/components/editor/layer-parameters.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-parameters.tsx)
- [src/components/editor/layer-settings.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-settings.tsx)
- [src/lib/project-persistence.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/project-persistence.ts)

### Second seam: transport and preview truth

Exact files to target:

- [src/components/editor/remotion-player.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/remotion-player.tsx)
- [src/components/editor/custom-player-controls.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/custom-player-controls.tsx)
- [src/components/editor/video-timeline.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/video-timeline.tsx)
- [src/lib/hooks/use-audio-playback-sync.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/hooks/use-audio-playback-sync.ts)

### Third seam: audio session truth

Exact files to target:

- [src/components/audio/audio-panel.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/audio-panel.tsx)
- [src/components/audio/audio-file-loader.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/audio/audio-file-loader.tsx)
- [src/lib/hooks/use-audio-engine.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/hooks/use-audio-engine.ts)
- [src/lib/stores/editor-audio-session-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/editor-audio-session-store.ts)
- [src/lib/stores/audio-engine-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/audio-engine-store.ts)

### Fourth seam: graph truth under the node editor

Exact files to target:

- [src/components/editor/animation-builder.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/animation-builder.tsx)
- [src/components/node-network/node-network-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/node-network-store.ts)
- [src/components/node-network/node-network-renderer.tsx](/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/node-network/node-network-renderer.tsx)
- [src/lib/stores/history-store.ts](/Users/timvucina/Desktop/MyProjects/viz-engine/src/lib/stores/history-store.ts)

## Validation Gates Per Rewire Phase

Every phase should prove four things:

### 1. No UI drift

- browser screenshot audit of the real editor
- same controls still visible
- same layout still intact

### 2. Ownership improved

- replaced surface now reads from the new owner
- old owner is narrower or removed

### 3. Serialization truth improved

- working project/export path no longer depends on fragmented legacy stores for
  the rewired slice

### 4. Regression gate stays green

- focused tests for the seam
- `pnpm check:foundation`

## Phase 1 Immediate Implementation Shape

Before writing code, the best exact implementation target is:

- create an adapter layer that lets the real editor read/write a canonical
  working project for layer truth
- keep the layer panel components visually untouched
- route:
  - add layer
  - duplicate layer
  - remove layer
  - reorder layer
  - patch layer parameters
  - patch scene-affecting layer settings
  through canonical actions

The current legacy stores should then shrink into:

- UI-only expansion/debug state
- temporary browser/runtime attachments that Phase 2 and later phases will
  remove or relocate

## What Must Not Happen

Do not:

- rewrite the layer panel UI while changing ownership
- redesign transport while changing preview truth
- rewrite the node editor while changing graph truth
- mix project-document migration with visual redesign
- leave both old and new ownership paths active indefinitely

The swap should be surgical:

- replace owner
- keep surface
- validate
- remove old path

## Definition Of A Clean Gut Swap

This gut swap is on track when:

- the user cannot feel a UI downgrade
- exported project truth becomes cleaner
- runtime and preview state become more explicit
- the editor becomes more testable
- the agent gets cleaner seams to drive the same editor
