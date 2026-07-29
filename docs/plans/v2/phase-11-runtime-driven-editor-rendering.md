# Phase 11: Runtime-Driven Editor Rendering

## Purpose

This phase closes the biggest remaining architectural gap in the preserved
editor terrain:

- the editor is no longer allowed to be the thing that truly owns live scene
  rendering
- the editor should configure, inspect, and host the runtime
- the runtime should evaluate and render the scene

The visible editor should stay effectively the same.

This is a gut swap of rendering ownership, not a redesign of the product
surface.

## Why This Phase Exists

The current regut has already made major truth surfaces canonical:

- project truth
- preview transport truth
- audio-session truth
- graph truth
- history truth
- editor command/control truth

But the live visual path in the real editor is still transitional.

Today the browser preview still flows mainly through:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/renderer.tsx`
- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/layer-renderer.tsx`
- `/Users/timvucina/Desktop/MyProjects/viz-engine/src/components/editor/remotion-player.tsx`

That means the editor is still partly responsible for:

- interpreting projected layer data
- invoking component draw / draw3D behavior directly
- owning the browser-oriented render loop

That is not the end state.

The end state should be:

- the editor edits
- the runtime runs

So this phase is about making the real editor become a client of the runtime
for live rendering too, not only for state and control.

## Core Goal

Replace editor-owned live rendering with a runtime-driven live preview path,
while keeping:

- the same editor shell
- the same panel structure
- the same transport posture
- the same node-editor posture
- the same audio/live authoring feel

## Non-Goals

This phase is not:

- a visual redesign
- a shell rewrite
- a simplification of the editor
- a mandate to throw away useful browser rendering attachments
- a mandate to make everything headless-only

The goal is not to make the editor thinner-looking.

The goal is to make its rendering ownership correct.

## Architectural Target

The target split after this phase should be:

### Editor

Owns:

- UI state
- selection state
- open/closed panel state
- drag/hover/tool state
- command dispatch
- preview host/container lifecycle

Does not own:

- scene evaluation
- layer interpretation semantics
- graph evaluation semantics
- temporal stepping semantics
- final render-plan meaning

### Runtime

Owns:

- project validation
- frame/time evaluation
- graph evaluation
- temporal stepping
- resolved assets/artifacts interpretation
- render-plan creation
- visual scene meaning

### Browser Attachment Layer

Owns:

- canvas attachment
- WebGL resources
- media element and analyzer hookups
- host-specific render surfaces

But it should act as an adapter over runtime output, not as the place where
scene meaning is invented.

## Desired End State

The real editor preview path should become:

1. editor holds canonical working project and preview state
2. editor invokes runtime/session evaluation for the current frame
3. runtime produces a frame plan / render plan / evaluated scene
4. browser renderer attachment consumes that evaluated output
5. editor displays it and continues to expose the same controls

In other words:

- the editor should host the preview
- the runtime should define what the preview is

## Work Breakdown

### Phase 11A: Rendering Surface Audit

Goal:

- map exactly what the current editor live preview still owns that should move
  behind runtime ownership

Primary targets:

- `src/components/editor/renderer.tsx`
- `src/components/editor/layer-renderer.tsx`
- `src/components/editor/remotion-player.tsx`
- `src/lib/hooks/use-audio-frame-data.ts`
- `src/lib/utils/export-orchestrator.ts`
- `src/lib/stores/layer-store.ts`

Deliverables:

- a precise ownership map of:
  - runtime truth
  - browser attachment state
  - remaining editor-owned render semantics
- a replacement matrix for each live preview responsibility

Exit criteria:

- we can point at every remaining live-render responsibility and say whether it
  belongs to:
  - runtime
  - browser attachment adapter
  - editor UI state

### Phase 11B: Runtime-Driven Preview Model

Goal:

- define one explicit editor live-preview model that is runtime-first

Deliverables:

- canonical preview inputs:
  - working project
  - resolved assets/artifacts
  - frame/time
  - preview mode
  - live audio session inputs
- canonical preview outputs:
  - frame plan
  - graph/runtime diagnostics
  - render plan
  - renderer attachment snapshot/state as needed

This should build on:

- `/Users/timvucina/Desktop/MyProjects/viz-engine/packages/viz-runtime`
- `/Users/timvucina/Desktop/MyProjects/viz-engine/packages/viz-editor-session`
- `/Users/timvucina/Desktop/MyProjects/viz-engine/packages/viz-editor-control`

Exit criteria:

- the live editor preview contract is explicit and package-shaped
- editor-side rendering stops depending on implicit layer projection semantics
  as the source of visual meaning

### Phase 11C: Browser Renderer Attachment

Goal:

- keep browser rendering capabilities, but make them consume runtime-owned
  render meaning

Deliverables:

- a browser preview adapter that consumes runtime output
- explicit ownership split between:
  - runtime evaluation
  - browser draw attachment
- retention of the current live preview feel where possible

Important rule:

- browser rendering adapters are allowed
- browser-owned scene meaning is not

Exit criteria:

- layer/component/graph meaning is no longer being defined inside the editor
  renderer path
- browser rendering can still attach efficiently to the runtime output

### Phase 11D: Transport And Audio Integration Onto Runtime Preview

Goal:

- make the real transport/audio loop drive the runtime-owned preview path, not
  a separate editor-owned visual loop

Deliverables:

- play/pause/seek drive canonical runtime preview state
- live audio session diagnostics feed the same preview path
- time/frame/audio relationships stay explicit and inspectable

Exit criteria:

- transport and audio no longer drive a separate shadow rendering path
- preview movement still feels immediate in the real editor

### Phase 11E: Layer Projection And Legacy Renderer Burn-Down

Goal:

- remove the remaining legacy rendering ownership bridges once the runtime path
  is proven

Targets:

- shrink or remove live-render responsibilities still embedded in:
  - `renderer.tsx`
  - `layer-renderer.tsx`
  - legacy render-function registration in projection stores

Exit criteria:

- the preserved editor preview is plainly runtime-driven
- remaining projection stores are not quietly defining scene render meaning

## Validation Requirements

This phase is too important to validate only with build/test success.

Every implementation slice must end with:

- focused tests for new preview/runtime contracts
- browser verification in the real editor
- `pnpm check:foundation`
- inspection of console/runtime issues
- confirmation that the visible editor did not drift

In addition, final completion of this phase should include:

- real agent/browser interaction verification of transport movement
- layer visibility/state verification in the live editor
- runtime/preview inspection proving the editor is hosting runtime output, not
  inventing it locally

## Canonical Control Surface Requirement

This phase must not invent a second control plane.

The same canonical control concepts should remain true for:

- editor UI
- local programmatic hosts
- future MCP/tool surfaces

The real editor preview should therefore be operable through the same durable
concepts we already have growing in:

- `src/lib/editor-control.ts`
- `packages/viz-editor-control`

The long-term target is:

- local editor facade for app wiring
- package-level editor/runtime control contract for agents and other hosts
- one shared semantic model underneath both

## Risks To Avoid

1. Moving rendering ownership without clearly separating browser attachment
   state from runtime truth.
2. Rebuilding a second runtime inside the editor “just for live mode”.
3. Regressing the live feel while improving the architecture.
4. Overcomplicating the browser preview adapter when a smaller explicit seam
   would do.
5. Preserving projected layer rendering semantics longer than necessary because
   they are convenient.

## Done Means

This phase should only be called complete when:

- the real editor still looks and behaves like VizEngine
- the real editor preview is genuinely runtime-driven
- the runtime, not the editor, defines the scene’s visual meaning
- browser rendering acts as a host/attachment layer
- agent/editor/programmatic control all point toward the same canonical
  preview/runtime concepts

At that point, the editor will be much closer to the actual vision:

- a serious preserved creative cockpit
- powered by a real canonical runtime
- ready for deeper agent-operated live authoring
