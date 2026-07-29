# Real Editor V2 Rewire Execution Plan

## Purpose

This document turns the current high-level roadmap into the concrete execution
plan for the next major body of work:

- keep the real editor UI effectively intact
- replace the hidden ownership model underneath it
- validate each slice before moving on

This is not a “new editor” plan.

It is the plan to rebuild the existing editor over V2 runtime, action, graph,
and preview truth.

One important refinement now overrides the older transitional framing:

- the destination is not “a set of cleaner canonical editor stores”
- the destination is one unified session engine called `VizSession`
- future rewire work should converge directly on `VizSession`
- superseded bridges should be deleted, not normalized into permanent layers

The detailed Phase 0 ownership audit now lives here:

- [editor-ownership-audit-and-phase-0-map.md](./editor-ownership-audit-and-phase-0-map.md)
- [../../specs/v2/viz-session.md](../../specs/v2/viz-session.md)
- [viz-session-transition-plan.md](./viz-session-transition-plan.md)

## Core Rule

The visible product should not change as a side effect of this work.

That means, by default:

- same shell
- same colors
- same layout
- same controls
- same node-editor posture
- same audio/transport posture
- same density

The rewrite target is hidden architecture:

- state ownership
- runtime ownership
- preview ownership
- graph ownership
- action/document ownership

The intended end state is simple:

- the editor edits
- the runtime runs
- `VizSession` is the canonical live state engine between them

So this plan is not about making the editor smarter.

It is about making the editor stop owning things that belong to:

- the working project
- the preview/runtime session
- the runtime itself

## Strategy

We should not attempt a single giant “switch to V2” change.

The correct approach is vertical replacement:

1. identify one product surface
2. move its hidden truth onto V2 ownership
3. validate it thoroughly
4. keep the UI looking the same
5. move to the next surface

Every phase should leave the repo in a shippable, comprehensible state.

But from this point forward, each phase should also answer one stricter
question:

- did this move the repo closer to a real `VizSession`
- or did it merely add cleaner transitional glue inside the editor terrain

Only the first kind of work should survive.

## VizSession Convergence Rule

Remaining work should now bias toward:

- one unified in-memory `VizSession`
- one command surface over that session
- one subscription/read surface over that session
- runtime preview/render consuming that same session
- editor and agent tools acting as clients of that session

That means the remaining regut is no longer just:

- store cleanup
- preview cleanup
- control cleanup

It is specifically:

- collapsing those cleaned-up seams into `VizSession`
- deleting duplicate ownership once the session path is real

## Non-Negotiable Validation Rules

Every phase must end with:

- code-level tests for the new ownership seam
- browser verification in the real editor
- `pnpm check:foundation`
- a quick regression audit confirming that the visible editor did not drift

If a phase requires temporary bridges:

- they must be explicit
- they must be small
- they must be tracked for removal before the next phase is called complete

## Phase 6: Adapter Burn-Down

### Goal

Reduce the remaining legacy editor stores until they are clearly UI/session
adapters or runtime-attachment surfaces, not hidden owners of canonical truth.

### Deliverables

- `node-network-store` reduced to node-editor UI/session ownership
- graph mutation and execution exposed through canonical graph helpers instead
  of UI-store semantics
- remaining editor-facing legacy stores audited and narrowed further where safe

### Concrete scope

- remove graph-truth ownership from:
  - `src/components/node-network/node-network-store.ts`
- rewire graph-facing consumers to:
  - canonical graph helpers
  - canonical graph selectors
- keep the preserved node editor behavior and visible controls unchanged

### Exit criteria

- no remaining graph mutation or graph execution truth is hidden inside
  `node-network-store`
- the preserved node editor still behaves the same to a human reviewer
- tests lock the new split down

### Validation

- focused graph/history/editor tests
- browser verification in the real editor
- `pnpm check:foundation`

## Phase 7: Layer Projection Burn-Down

### Goal

Reduce `layer-store` and `layer-values-store` so they are clearly projections
and runtime-attachment surfaces, not editable scene truth.

### Deliverables

- layer CRUD/value mutation no longer exposed through projection-store APIs
- layer/value mutation flows routed through canonical working-project ownership
- runtime/editor readers can still consume the preserved projected data shape
  without changing the visible UI

### Exit criteria

- no remaining editor callers write scene truth through `layer-store` or
  `layer-values-store`
- projection stores read honestly as projections/attachments
- focused tests cover the canonical/projected split

### Validation

- focused project/history tests
- browser verification in the real editor
- `pnpm check:foundation`

## Phase 8: Canonical Project Persistence Closeout

### Goal

Make local save/load/reset use canonical project and graph truth directly,
instead of legacy store-shaped payloads.

### Deliverables

- canonical `.vizengine.json` file shape
- canonical save/load hydration path
- bundled sample project files migrated to the canonical shape

### Exit criteria

- no exported project files are written as `layerStore/layerValuesStore/...`
  payloads
- load/reset re-enter canonical project and graph ownership directly
- sample project fixtures stay on the canonical shape

### Validation

- focused persistence/sample-file tests
- browser verification in the real editor
- `pnpm check:foundation`

## Phase 9: Bootstrap And History Cleanup

### Goal

Remove the remaining bootstrap/history smells left behind after canonical
project and graph ownership became real.

### Deliverables

- projection stores no longer persist scene truth
- canonical project bootstrap naming matches actual ownership
- history no longer duplicates open-node context already owned by node-editor
  UI state

### Exit criteria

- `editor-project-store` is the sole persisted project source
- startup/bootstrap naming reflects current architecture honestly
- history routes layer-vs-node undo based on live canonical/UI state instead of
  duplicated copies

### Validation

- focused history/project/persistence tests
- browser verification in the real editor
- `pnpm check:foundation`

## Phase 10: Editor Control Plane And Build Hygiene

### Goal

Make the preserved editor’s command paths explicit and finish the last high
signal build-noise cleanup.

### Deliverables

- one local explicit editor control facade over canonical project, graph,
  preview, audio, history, UI, and persistence operations
- main user-facing editor commands rewired onto that facade
- mixed static/dynamic import warnings removed
- hidden heavy editor surfaces lazy-loaded instead of bundled eagerly

### Exit criteria

- routine editor commands no longer need to reach into multiple stores
  directly
- the future agent/MCP surface has a cleaner canonical seam to target
- Vite build output is free of the previous mixed-import and circular-chunk
  warnings

### Validation

- focused control-surface tests
- `pnpm studio:typecheck`
- `pnpm studio:build`
- `pnpm check:foundation`

## Phase 11: Runtime-Driven Editor Rendering

### Goal

Make the preserved real editor a host/configuration surface for the runtime,
instead of letting it remain the owner of live scene rendering semantics.

### Deliverables

- explicit live preview contract driven by canonical runtime/session inputs
- browser rendering attachment that consumes runtime-owned scene meaning
- transport/audio integration onto that runtime-driven preview path
- burn-down of remaining legacy live-render ownership in editor-side renderer
  code

### Exit criteria

- the real editor preview is genuinely runtime-driven
- the editor still looks and behaves the same to the user
- the runtime, not the editor, defines layer/component/graph visual meaning
- browser rendering acts as an attachment layer, not the owner of semantics

### Validation

- focused preview/runtime contract tests
- browser verification in the real editor
- console/runtime-health inspection
- `pnpm check:foundation`

Detailed plan:

- [phase-11-runtime-driven-editor-rendering.md](./phase-11-runtime-driven-editor-rendering.md)

## Phase 0: Ownership Audit And Replacement Map

### Goal

Map the existing real editor state and behavior into replacement categories so
we stop guessing where truth currently lives.

### Deliverables

- a concrete classification of current editor-store responsibilities into:
  - UI-only state
  - project/document truth
  - preview/runtime truth
  - asset/audio session truth
  - graph/node truth
- a list of the current editor components that read each category
- a list of the exact first mutation flows to rewire

### Concrete scope

- audit:
  - `src/lib/stores/editor-store.ts`
  - `src/lib/stores/layer-store.ts`
  - the main editor panels and transport surfaces
- identify:
  - which values should move into `@viz-engine/editor-session`
  - which values should move into runtime/preview control foundations
  - which values should remain local UI state
- produce a replacement matrix for the first three implementation phases

### Non-goals

- no behavior change
- no UI refactor
- no partial rewiring yet

### Exit criteria

- we can point at every major store field and say what its target owner is
- the next implementation phases have exact entrypoints, not vague goals

### Validation

- doc review against:
  - `current-state.md`
  - `working-agreements.md`
  - `v1-editor-ux-preservation-and-v2-rebuild-map.md`

## Phase 1: Canonical Working Head Under Layer Authoring

### Goal

Make the real editor’s layer authoring flow operate on canonical project truth
instead of ad hoc scene ownership in the current stores.

### Why first

The layer surface is the easiest high-value seam:

- it is central to the editor
- it is visible to the user
- it touches scene truth directly
- it is less risky than transport or graph timing on the first pass

### Deliverables

- the real editor loads a canonical working project
- layer create/update/delete/reorder flows apply canonical actions
- the visible layer panel stays visually the same
- the preview consumes the updated working head
- export/reload uses canonical project truth, not editor-only structures

### Concrete scope

- wire the real layer panel flows through `@viz-engine/actions`
- make the editor hold:
  - `sourceProject`
  - `workingProject`
  - explicit selected layer / editor UI state
- replace direct scene mutation in the existing store path for:
  - add layer
  - remove layer
  - reorder layer
  - patch layer params
  - toggle layer visibility where appropriate
- keep panel rendering and affordances unchanged

### Non-goals

- no transport rewrite yet
- no node-editor rewrite yet
- no cloud persistence

### Exit criteria

- layer authoring in the real editor goes through canonical actions
- project export/reload roundtrips from the mutated working head
- no editor-only fields leak into serialized project truth
- the UI still looks the same to a human reviewer

### Current implementation note

The first production cut of this phase uses an app-local canonical layer
working-project store for the current editor terrain.

That store currently projects its truth back into:

- `layer-store`
- `layer-values-store`

so the existing renderer, preview mirrors, and preserved UI can stay intact
while ownership is swapped under them.

This is an intentional temporary bridge for the layer phase, not the final
steady state for the whole editor.

### Validation

- editor-session integration tests for layer mutation sequences
- roundtrip tests:
  - load project
  - mutate layers
  - export
  - reload
  - render
- browser verification of:
  - add layer
  - reorder
  - param edit
  - visual parity of the layer panel
- `pnpm check:foundation`

## Phase 2: Transport And Preview Truth Rewire

### Goal

Move playback and preview ownership out of the legacy store semantics and onto
the explicit V2 preview/session model.

### Deliverables

- the visible transport UI stays the same
- play/pause/seek are driven by explicit preview state
- current frame/time ownership becomes explicit
- the preview stage reads from the same working head plus preview state model
- live-vs-baked diagnostics become inspectable

### Concrete scope

- wire the real transport controls onto `@viz-engine/editor-session`
  live-preview foundations
- replace hidden timing ownership for:
  - play
  - pause
  - seek
  - scrub/timeline updates
- make the preview stage recompute from explicit session inputs
- add explicit debug/inspection hooks for current preview state

### Non-goals

- no node editor rewiring yet
- no audio-capture redesign yet
- no transport UI redesign

### Exit criteria

- the transport UI still behaves the same visually
- preview state is explicit and inspectable
- live playback does not rely on hidden store-owned timing semantics
- deterministic render mode remains intact

### Current implementation note

The first production cut of this phase uses an app-local canonical preview
transport store backed by the existing editor-session transport controller.

That store currently owns:

- `isPlaying`
- `currentFrame`
- `durationFrames`
- `fps`
- the Remotion player attachment ref

and the preserved playback UI now reads from it instead of `editor-store`.

### Validation

- preview/transport state tests
- regression tests ensuring render-mode semantics stay deterministic
- browser verification:
  - play
  - pause
  - seek
  - timeline update behavior
- `pnpm check:foundation`

## Phase 3: Audio Session And Input Ownership Rewire

### Goal

Move the real audio panel and live audio inputs onto explicit session ownership
without changing how the panel feels.

### Deliverables

- explicit audio-source/session ownership
- audio file loading wired through the V2 preview/session path
- clear separation between:
  - audio input lifecycle
  - preview transport
  - baked artifact inputs
- the visible audio panel remains functionally and visually familiar

### Concrete scope

- rewire audio loading and current track ownership
- rewire waveform/timeline dependencies to explicit session state where needed
- make it obvious which scene behaviors are driven by:
  - baked features
  - live audio analysis
  - fallback behavior
- preserve the existing panel structure

### Non-goals

- no production-grade audio engine redesign
- no cloud media management
- no node editor rewrite yet

### Exit criteria

- the audio panel uses explicit session ownership underneath
- playback and audio-source changes cooperate cleanly
- the preview still responds live

### Current implementation note

The first production cut of this phase now uses two explicit app-local stores:

- `editor-audio-session-store`
- `audio-engine-store`

The split is:

- canonical audio/session/source truth
- browser audio refs and Web Audio attachments

The preserved audio UI now reads the canonical session store for source and
time truth, while browser-specific hooks/components read the narrower audio
engine store for refs, analyzers, gain nodes, and captured streams.

### Validation

- audio-session tests
- browser verification:
  - load track
  - switch track
  - play/pause
  - time display / waveform still behave correctly
- `pnpm check:foundation`

## Phase 4: Node Editor Truth Rewire

### Goal

Keep the current node editor UI and posture, but move graph truth and graph
execution ownership onto the canonical graph/runtime path.

### Why this is later

This is the most subtle editor seam:

- graph truth is complex
- graph UI is deeply interactive
- temporal behavior is easy to corrupt

It should sit on top of already-clean working-head and preview ownership.

### Deliverables

- the visible node editor remains the same product surface
- graph edits apply to canonical graph documents
- graph execution uses the V2 evaluator/runtime path
- temporal node behavior remains deterministic underneath the editor

### Concrete scope

- route graph create/update/delete/connect flows through canonical actions
- replace editor-owned graph truth with working-head graph truth
- make graph preview/runtime state explicit
- preserve overlay-based graph editing over the live scene

### Non-goals

- no graph UI redesign
- no brand new node system UX
- no giant node-feature expansion at the same time

### Exit criteria

- graph edits in the editor affect canonical graph documents
- graph execution no longer depends on legacy hidden editor ownership
- temporal graph semantics remain correct

### Current implementation note

The first production cut of this phase now uses:

- `editor-graph-store` as the canonical graph brain
- `node-network-store` as a thin adapter for the preserved UI

That means graph truth and execution are now canonical, while the existing UI
keeps the same component-facing API during the swap.

### Validation

- graph mutation tests
- temporal graph regression tests
- browser verification:
  - add node
  - connect node
  - modify node inputs
  - see effect in live preview
- `pnpm check:foundation`

## Phase 5: Agent-Operable Editor Surface Hardening

### Goal

Make the rebuilt editor surfaces operable through stable control/state seams so
the agent can drive the real editor truthfully.

### Deliverables

- explicit editor-control operations for the newly rewired surfaces
- stronger inspection of:
  - working project
  - preview state
  - graph state
  - audio session state
- browser verification loop for agent-visible feedback

### Concrete scope

- connect the rewired editor surfaces to `@viz-engine/editor-control`
- expose the minimal stable operations needed for live agent iteration
- avoid reintroducing UI-scraping as architecture

### Non-goals

- no chat UI yet
- no cloud runner yet
- no broad tool explosion

### Exit criteria

- the agent can drive the rewired editor through stable local operations
- browser interaction is secondary verification, not the primary truth path

### Validation

- operator-surface tests
- scripted creative-loop scenario updates
- browser-verified end-to-end mutation + preview loop
- `pnpm check:foundation`

## Phase 6: Legacy Store Burn-Down And Final Ownership Cleanup

### Goal

Remove the now-obsolete V1 ownership paths so the editor no longer has two
competing architectures living underneath it.

### Deliverables

- dead store responsibilities removed
- duplicate runtime ownership removed
- docs updated to reflect the new real ownership map
- suggestions logged for the next frontier only after the old seam is gone

### Concrete scope

- remove replaced state from legacy stores
- remove no-longer-used bridge code
- delete dead helpers, stale selectors, and obsolete mutation paths
- update docs and tests to reflect the new canonical editor architecture

### Non-goals

- no speculative future abstractions
- no keeping dead code around “just in case”

### Exit criteria

- one clear ownership model exists for:
  - project truth
  - preview truth
  - audio session truth
  - graph truth
- the old hidden ownership paths are gone

### Validation

- repo search proving replaced paths are gone
- full regression gate
- browser verification on the real editor
- `pnpm check:foundation`

### Latest closeout progress

The current remaining ownership picture is cleaner than it was when this plan
started:

- canonical project truth persists through `editor-project-store`
- layer/value stores are projections only and no longer persist scene truth
- graph truth persists through `editor-graph-store`
- history no longer keeps a duplicated copy of the active node-editor
  selection context

The remaining closeout work is now concentrated in:

- history/control-plane convergence
- build hygiene warnings
- final browser-verified authoring and control-loop hardening

## Recommended Immediate Execution Order

The next actual coding order should be:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6

Do not skip Phase 0.

The fastest way to create a mess from here would be:

- touching layer flows
- transport flows
- and graph flows

without an explicit replacement map first.

## Definition Of Success

This plan succeeds when:

- the user still feels like they are using the same editor
- the codebase no longer behaves like the editor secretly owns runtime truth
- the agent can operate the same scene through stable contracts
- the product is more deterministic, more testable, and more maintainable
  without becoming less polished

## Runtime Preview Follow-through

The first concrete rendering-ownership cutover under this plan is now done:

- the preserved editor still shows the same preview surface
- but the live renderer, export renderer, and mirror-canvas path now use a
  dedicated runtime preview store instead of the general layer projection store
- live preview timing/orchestration is also centralized through one explicit
  preview driver instead of per-layer RAF loops
- live preview and export now share one explicit preview-frame payload contract
- the preview seam now also exposes one canonical controller and one
  inspectable preview snapshot surface
- the browser render attachment seam is now explicit too, with
  `LayerRenderer` reduced toward a host/registration component instead of
  owning render setup/teardown semantics directly
- the first supported preserved-editor layer now renders through the package
  runtime/render-plan path inside the real editor surface instead of local
  `draw` / `draw3D` semantics

That means the remaining rendering work is now narrower:

- keep the preserved editor UI intact
- keep the editor as the host/configurator
- keep moving render meaning out of editor-specific ownership
- bridge the preview path closer to the package runtime model from this new
  explicit seam instead of through the general UI layer store
