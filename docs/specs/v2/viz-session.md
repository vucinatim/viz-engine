# VizSession

## Purpose

`VizSession` is the canonical in-memory state engine for VizEngine V2.

It is the architectural answer to a problem that the repo has only partly
solved so far:

- too much editor-owned truth
- too many transitional bridges
- too many partial control surfaces

From this point forward, the target is not “cleaner editor glue”.

The target is:

- one `VizSession`
- one canonical command surface
- one canonical subscription/read surface
- one runtime-facing state model
- multiple clients over that same truth

Those clients are:

- the preserved real editor UI
- local programmatic hosts
- future MCP/tool/agent surfaces
- runtime preview and render attachments

## Core Rule

There should be one canonical mutable session object in memory.

That object is `VizSession`.

It owns the live working state of the scene system.

It is not:

- a React store
- a browser-only singleton tied to the UI
- a bundle of unrelated Zustand stores pretending to be one system
- a second control plane beside the runtime

It may still use an external-store implementation internally.

What matters is:

- one truth owner
- not many public truth owners

## Architectural Position

The clean split is:

- the editor is a view/controller over `VizSession`
- the runtime evaluates `VizSession` state
- agents/tools mutate and inspect `VizSession` state

The editor is not the owner of scene truth.

React is not the owner of scene truth.

Browser attachment code is not the owner of scene truth.

`VizSession` is the owner of scene/session truth.

## What VizSession Owns

`VizSession` should own the canonical live state for:

- working project document
- layer ordering and layer settings
- parameter values
- graph/network state
- preview transport state
- audio session state
- history/undo/redo state
- runtime evaluation inputs
- derived preview snapshot
- derived render/debug inspection snapshot

Where state is needed for deterministic or inspectable runtime behavior, it
belongs here explicitly:

- checkpoints
- caches
- prepared/materialized assets
- explicit runtime session state

## What VizSession Does Not Own

`VizSession` should not own ephemeral UI-only state such as:

- open panels
- hover state
- drag state
- local form focus
- dialog visibility
- temporary view-only expansion state

`VizSession` should also not directly own browser attachment details such as:

- DOM refs
- canvas refs
- WebGL renderer instances
- media element refs
- ResizeObserver wiring

Those belong in attachment layers or UI hosts that consume `VizSession`.

## Command Surface

All durable scene/session mutations should go through one canonical command
surface over `VizSession`.

That includes operations such as:

- add layer
- remove layer
- duplicate layer
- reorder layer
- patch layer values
- patch layer settings
- create/open/modify graph
- connect/disconnect nodes
- play
- pause
- seek
- set preview mode
- set quality/resolution
- attach/clear audio source
- import/load/reset project
- undo
- redo

The preserved editor should call these commands.

Agent tools should call these commands.

Programmatic hosts should call these commands.

There should not be:

- one editor-only mutation path
- one agent-only mutation path
- one runtime-only hidden mutation path

## Read And Subscription Surface

`VizSession` should expose a stable read/subscribe model for:

- project snapshot
- graph snapshot
- preview snapshot
- audio session snapshot
- runtime inspection snapshot
- history state

This is how the editor stays in sync.

This is how agents inspect real state.

This is how runtime preview/render attachments consume canonical inputs.

## Realtime UI Binding Model

The move to `VizSession` must not regress the current editor’s selective-update
performance.

The current editor works on the web partly because external-store subscriptions
avoid broad React rerenders.

We should preserve that advantage.

The correct move is not:

- replace Zustand with naive React state
- push one giant session object through React context
- rerender the app at transport/frame cadence

The correct move is:

- keep the external-store/selective-subscription model
- collapse truth into one `VizSession`

That means `VizSession` should behave like a high-performance external store.

It should expose:

- `getState()` or `getSnapshot()`
- `subscribe(listener)`
- selector subscriptions
- batched or transactional updates

The implementation may use:

- `zustand/vanilla`
- or an equally small custom external-store core

But that should remain an implementation detail of `VizSession`, not a reason
to preserve many public stores.

## Three Realtime Lanes

The clean realtime model has three lanes.

### 1. Durable session lane

This lane covers:

- project
- layers
- graph
- preview transport state
- audio session state
- history

This belongs in `VizSession`.

### 2. UI-local lane

This lane covers:

- panel visibility
- hover state
- drag state
- dialog visibility
- local form focus
- temporary expansion/collapse state

This should stay outside `VizSession`.

It may use:

- React local state
- or a tiny UI-only store

But it is not canonical truth.

### 3. Runtime realtime lane

This lane covers:

- RAF-driven preview
- WebGL/canvas attachment updates
- audio analyzer sampling
- transport clock stepping
- runtime diagnostics streams

This should not drive broad React rerenders.

It should run through imperative runtime/attachment subscribers over
`VizSession`.

## React Subscription Rule

React components should subscribe to small slices, not the whole session.

Examples:

- layer list subscribes to layer list data
- selected-layer panel subscribes to selected layer data
- transport UI subscribes to transport state
- node editor subscribes to graph state
- preview chrome subscribes to small preview metadata

The actual preview renderer should not depend on React rerendering every frame.

The rule is:

- React renders structure
- runtime drives frames

## Time And Playback Rule

Transport/time is a special case.

The system should not force broad UI rerenders at playback cadence.

The correct model is:

- canonical transport state in `VizSession`
- imperative playback/preview driver for frame stepping
- small UI subscribers for time displays and control state

Human-facing time displays may be sampled or throttled separately from the
full-speed preview loop when useful.

## Runtime Relationship

The runtime should read from `VizSession`.

The editor should not define render semantics.

The editor may host preview surfaces, but it should not be the owner of:

- scene meaning
- component meaning
- graph meaning
- frame stepping semantics

The runtime should remain as pure as possible:

- `session state + explicit frame/time/mode input -> evaluated result`

Browser preview and render adapters may still exist, but only as attachments
over runtime-owned meaning.

### Current runtime-preview enforcement

The app-local implementation now enforces this split:

- `VizSession.preview.transport` owns preview transport truth
- `VizSession.preview.runtimeInspection` owns requested/completed frame
  inspection, render cycles, rendered layer ids, runtime-backed layer ids, and
  preview failures
- `vizSessionActions.preview.renderRuntimePreviewFrame(...)` is the single
  live/export frame-dispatch command
- the browser attachment registry owns render callbacks, mirror canvases, and
  the Remotion player ref
- the player ref is intentionally not part of `VizSession`
- projected V1 component/config objects remain a compatibility projection over
  the canonical project, not preview truth

The former editor preview controller, editor-local frame contract, and mixed
runtime-preview store were deleted rather than retained as parallel control or
inspection planes.

## Editor Relationship

The preserved editor UI remains the product face.

That is not changing.

But the editor should increasingly become:

- a subscriber to `VizSession`
- a dispatcher of `VizSession` commands
- an owner only of UI-local state

The editor should stop being the hidden home of canonical scene/runtime truth.

## Agent Relationship

The future agent contract should target `VizSession` directly or through a thin
stable wrapper over it.

That means agents should be able to:

- inspect state snapshots
- inspect runtime preview/debug snapshots
- mutate project state
- mutate graph state
- control transport
- control audio session state

without relying on browser clicking as the primary control path.

Browser automation remains useful for:

- visual verification
- interaction validation
- debugging real product behavior

But browser automation is not the canonical control plane.

## Rewrite Rule

From this point forward, `VizSession` is the convergence target.

That means:

- no new parallel app-local “canonical” stores as a long-term solution
- no new editor-first mutation paths
- no new runtime semantics hidden in React components
- no new transitional ownership layers unless explicitly justified

If a piece of code does not converge on `VizSession`, it is on the wrong path.

## Migration Rule

During the remaining rewrite work:

1. define the minimal `VizSession` surface clearly
2. move current canonical-ish stores under it or replace them with it
3. bind the editor to it
4. bind the runtime preview/render path to it
5. bind agent/tool surfaces to it
6. delete superseded bridges and duplicate ownership

The rewrite should now optimize for direct convergence, not comfortable
transition.

## Success Condition

We are done with this phase when all of the following are true:

- the preserved editor is visibly the same product
- `VizSession` is the single canonical in-memory truth
- the runtime consumes `VizSession`
- the editor consumes `VizSession`
- the agent/tool contract consumes `VizSession`
- replaced bridge layers are deleted instead of being memorialized
