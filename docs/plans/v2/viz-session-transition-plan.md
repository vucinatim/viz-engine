# VizSession Transition Plan

## Purpose

This document defines the clean transition path from the current
partly-regutted editor architecture to the actual target architecture:

- one canonical in-memory session engine
- one canonical command surface
- one canonical read/subscribe surface
- one preserved real editor UI over that same truth

That engine is:

- `VizSession`

This plan exists to prevent the rewrite from stalling in a “cleaner
transitional glue” state.

The point is not to improve the current bridges indefinitely.

The point is to replace them.

## Core Rule

Every remaining implementation step must answer one question:

- does this move truth into `VizSession`
- or does it add another layer around old ownership

If it only adds another layer around old ownership, it is the wrong move.

## Target End State

The end state is:

- the preserved editor UI remains the product face
- `VizSession` is the single canonical in-memory truth
- the runtime evaluates `VizSession`
- the editor reads from and writes to `VizSession`
- agents/tools read from and write to `VizSession`
- browser attachments consume `VizSession` output
- replaced bridges and duplicate stores are deleted

## Non-Goals

This is not a plan to:

- redesign the editor
- replace the editor with a simpler shell
- add more app-local “canonical” stores
- preserve transitional bridges for comfort
- build a separate agent-only control plane

## Clean Transition Strategy

The cleanest possible path is:

1. freeze the architecture target
2. build the minimal real `VizSession`
3. move existing canonical-ish ownership into it
4. bind the editor to it
5. bind the runtime preview/render path to it
6. bind agents/tools to it
7. delete superseded stores and bridges immediately after each cutover

That is the path that keeps the repo minimal and crystallized.

## Hard Rules

From this point forward:

- no new Zustand truth stores
- no new editor-local canonical stores
- no feature work that bypasses `VizSession`
- no browser attachment code mutating scene truth
- no separate editor mutation path and agent mutation path
- no long-lived compatibility shims

If a temporary bridge is truly required:

- keep it tiny
- name it honestly
- track its deletion explicitly
- delete it as soon as the next cutover lands

One important clarification:

- this is not a plan to abandon external-store performance
- it is a plan to collapse truth ownership into one session engine

The performance model should stay strong.

The ownership model should get simpler.

## What VizSession Must Own

`VizSession` should own:

- working project document
- graph state
- preview transport state
- audio session state
- history state
- runtime inspection state
- derived preview/render snapshot state

It may also own explicit runtime session concerns such as:

- checkpoints
- caches
- materialized asset state

## What Must Stay Outside VizSession

`VizSession` should not own:

- panel open/closed state
- hover state
- drag state
- dialog visibility
- local field focus
- DOM refs
- canvas refs
- WebGL renderer instances
- media element refs
- ResizeObserver wiring

Those belong in:

- UI-local state
- browser attachment modules

## One Command Plane

All durable scene/session mutation should go through one command API over
`VizSession`.

That command API should cover:

- add/remove/duplicate/reorder layer
- patch layer values/settings
- create/open/modify graph
- connect/disconnect nodes
- play/pause/seek
- set preview mode
- set quality/resolution
- attach/clear audio source
- import/load/reset project
- undo/redo

The editor should use this API.

Agents/tools should use this API.

Tests should use this API.

There should not be:

- editor-only mutation semantics
- agent-only mutation semantics
- hidden browser-only mutation semantics

## One Read And Subscription Plane

`VizSession` should expose one stable read/subscribe surface for:

- project snapshot
- graph snapshot
- preview snapshot
- audio snapshot
- history snapshot
- runtime inspection snapshot

The editor should bind to this surface.

Agent inspection should bind to this surface.

Runtime preview/render should bind to this surface.

## Realtime Performance Posture

The current editor benefits from selector-based subscriptions and narrow
rerender boundaries.

That should be preserved.

The clean path is not:

- one giant React context snapshot
- whole-app rerenders on every live update

The clean path is:

- `VizSession` as the one external selective store
- tiny UI subscriptions to small slices
- imperative runtime/attachment subscribers for frame-driven work

That means the migration should preserve:

- selector subscriptions
- minimal rerender boundaries
- non-React frame loops for preview/render/audio sampling

while removing:

- fragmented truth ownership across many public stores

## Transition Phases

## Phase A: Define Minimal VizSession

### Goal

Create the smallest real `VizSession` core that can become the only long-term
owner of live scene/session truth.

### Deliverables

- one `VizSession` module/class
- one internal state shape
- one command API
- one snapshot API
- one subscription API
- selector-based subscription support
- a batching/transaction model for grouped updates

### Rules

- keep it minimal
- do not mirror the current store sprawl one-for-one
- prefer fewer stronger primitives

## Phase B: Move Current Canonical-ish Logic Into VizSession

### Goal

Extract real ownership from the current app-local stores and place it inside
`VizSession`.

### Primary current owners to collapse

- `src/lib/stores/editor-project-store.ts`
- `src/lib/stores/editor-preview-store.ts`
- `src/lib/stores/editor-audio-session-store.ts`
- `src/lib/stores/editor-graph-store.ts`
- `src/lib/stores/history-store.ts`

### Required posture

- migrate logic inward
- do not wrap these forever
- do not treat them as permanent public architecture

### Exit criteria

- those stores are either:
  - gone
  - or thin temporary bindings over `VizSession`

## Phase C: Rebind Editor Control To VizSession

### Goal

Make the current editor control facade a thin wrapper over `VizSession`, or
remove it if the session surface is already clean enough.

### Primary target

- `src/lib/editor-control.ts`

### Exit criteria

- editor commands do not reach into multiple stores directly
- editor commands target `VizSession`
- command routing does not regress existing selective-update behavior

## Phase D: Rebind The Real Editor UI To VizSession

### Goal

Make the preserved real editor a subscriber/dispatcher over `VizSession`
instead of a terrain with multiple hidden truth owners.

### Sub-surfaces

- layer panel
- transport controls
- audio panel
- node editor
- preview inspector/debug surfaces

### Exit criteria

- same visible UI
- same workflow feel
- fewer public ownership seams
- no hidden editor-owned scene truth
- no broad rerender regression caused by naive session binding

## Phase E: Rebind Runtime Preview And Render To VizSession

### Goal

Make the runtime preview/render path consume `VizSession` directly instead of
remaining editor-shaped internally.

### Important rule

Browser attachment code may remain, but only as attachment code.

It should not define:

- scene meaning
- component meaning
- frame stepping semantics

### Exit criteria

- runtime preview/render consumes `VizSession`
- editor hosts preview but does not own its semantics
- frame-driven work runs through imperative subscribers, not broad React
  rerenders

## Phase F: Bind Agent And Tool Surfaces To VizSession

### Goal

Make the future agent/MCP/programmatic control plane target the same session
surface as the editor.

### Exit criteria

- one control plane
- one inspection plane
- browser automation used mainly for verification

## Phase G: Delete Superseded Architecture

### Goal

Finish each cutover by removing duplicate ownership instead of preserving it.

### Delete-first candidates after convergence

- app-local canonical-ish public stores
- duplicated bridge selectors/helpers
- temporary projection layers that only existed for transition
- editor-terrain mutation helpers that no longer serve a clean purpose

### Rule

If the new session path is real, the old path should die.

## Validation Rules

Every phase must end with:

- focused tests for the new `VizSession` seam
- browser verification in the real editor
- `pnpm check:foundation`
- a quick regression check that the visible editor did not drift

Additional required validation:

- editor mutation through the canonical contract changes the real browser UI
- runtime inspection reflects the same canonical session state
- no duplicate mutation path is needed to make the editor update
- the preserved editor does not regress into broad rerender storms during live
  transport or interaction

## Definition Of Clean

We should call this transition clean only when:

- one session owns truth
- one command plane mutates truth
- one subscription plane exposes truth
- the editor is a client
- the runtime is a client
- agents/tools are clients
- browser attachments are attachments
- superseded code has been deleted

If the repo still needs multiple public “canonical” app-local stores to
operate, the transition is not clean yet.
