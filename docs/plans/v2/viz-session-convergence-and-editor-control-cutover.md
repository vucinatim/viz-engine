# VizSession Convergence And Editor-Control Cutover

Status: implemented and validated on `codex/viz-engine-v2`.

## Goal

Converge the preserved editor and the reusable local control surface on one
canonical project/session architecture without changing the established editor
product surface.

The cutover had six non-negotiable outcomes:

1. `VizProjectDocument` remains the only portable scene document.
2. `@viz-engine/editor-session` owns typed mutation history and undo/redo.
3. `@viz-engine/nodes-core` owns executable built-in node behavior.
4. the React node editor is an authoring projection, not a runtime.
5. persistence stores the canonical project document directly.
6. UI and agent tooling inspect the same runtime results and provenance.

## Implemented Architecture

### Project and action ownership

- `@viz-engine/contracts` defines the complete typed action vocabulary used by
  the editor for layer, timeline, graph, and node-document mutations.
- `@viz-engine/actions` applies those mutations as pure document transforms.
- `@viz-engine/editor-session` validates, normalizes, records, undoes, and
  redoes successful action batches.
- continuous gestures may open one history group, so a drag remains one undo
  step without introducing another history store.
- the app-local Zustand session is a reactive read model plus browser host
  state. It does not implement a competing document mutation or history
  algorithm.

### Graph and node ownership

- all preserved built-in node compute functions and portable authoring
  definitions live in `@viz-engine/nodes-core`.
- React custom node bodies are attached only in the editor presentation
  wrapper.
- canonical graphs live only in `VizProjectDocument.graphs`.
- `NodeNetwork` values are memoized editor projections.
- graph edits replace only the targeted graph document; unrelated or
  package-native graphs are not rewritten.
- editor-local graph evaluators and live-value caches were deleted.
- live node values, node inputs, outputs, and temporal state come from the
  package runtime evaluation result.

### UI-local graph state

React Flow measurement, selection, and measured dimensions are intentionally
canvas-local. Durable node positions, node definitions, bindings, and edges
remain canonical document data.

This boundary is important: routing transient React Flow measurements through
the portable graph document makes the controlled canvas continually discard
its measurements and hides its nodes.

### Persistence and startup

- IndexedDB persistence stores one `projectDocument`.
- revision counters, source snapshots, history, projections, runtime
  inspection, and UI state are not serialized as canonical project truth.
- `.vizengine.json` keeps the canonical `project` document and separately
  names optional editor UI preferences.
- startup creates the canonical package session from the validated persisted
  document.

### Inspection

The app and `@viz-engine/editor-control` expose structured inspection for:

- canonical project and validation
- action history and session warnings
- graph documents
- per-graph values and issues
- per-node resolved inputs, outputs, and temporal state
- resolved layer inputs with their exact `VizValueSource`
- asset and artifact references
- materialized runtime assets
- frame/render-plan warnings

These structures are the future agent/tool boundary. Browser scraping is not a
source of scene truth.

## Deleted Duplicate Ownership

- editor-local node runtime registry
- standalone component-preview graph evaluator
- graph-output and node-live-value cache stores
- stateful layer-projection store
- React history-observer component
- separate layer and node history stacks
- duplicated `VizSession.graph.networks` state

## Validation

Validation evidence is recorded in:

- [2026-07-29-viz-session-convergence-and-node-editor-parity.md](../../parity/evidence/2026-07-29-viz-session-convergence-and-node-editor-parity.md)

The acceptance result covers package and studio type checks, the complete
foundation suite, runtime benchmarks, production builds, consumer smoke,
creative-loop roundtrip, and real browser interaction across Stage Scene,
node-graph creation, presets, live values, undo/redo, persistence, rapid edits,
and export configuration.

## Remaining Deliberate Boundaries

- browser audio elements, render attachments, and React Flow interaction state
  remain host-owned by design.
- editor component configs remain projections because the preserved UI still
  consumes the V1 config presentation model.
- small hook-shaped adapter modules remain for selective React subscriptions;
  they are facades over `VizSession`, not independent stores.
- FBX loader warnings for unsupported legacy material maps and excess skin
  weights remain an asset-preparation concern. Model rendering itself is
  functional and retains the production-quality DJ/crowd experience.

## Next Architectural Direction

The next large seam should not create another editor state migration. It should
use the now-stable session, action, node, runtime, and inspection contracts to
expand agent-operated authoring and finish the remaining projection/adaptor
burn-down only where a concrete consumer can be moved cleanly.
