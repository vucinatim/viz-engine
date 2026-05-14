# Agent-Operated Live Editor Roadmap

## Purpose

This document turns the
[Agent-Operated Live Editor Vision](../../visions/agent-operated-live-editor-vision.md)
into an implementation roadmap.

It exists to answer:

- what the major execution phases are
- what each phase must deliver
- how each phase should be validated
- what should explicitly not be done too early

This is the road to the workflow where:

1. the user says `open up the editor`
2. the editor opens
3. the agent can inspect and operate the scene truthfully
4. the user and agent iterate on one live visual loop
5. the user mostly watches, listens, steers, and approves

Before the roadmap phases below, one prerequisite posture is now explicit:

- the current V1 editor is the UX reference
- the V2 rebuild must preserve that experience while replacing the hidden
  architecture underneath it

That reference map now lives here:

- [V1 Editor UX Preservation And V2 Rebuild Map](./v1-editor-ux-preservation-and-v2-rebuild-map.md)

## Current Starting Point

We are not starting from zero.

The repo already has:

- canonical scene contracts
- canonical project actions
- a pure action surface
- deterministic runtime planning
- first graph execution
- first temporal graph execution
- portable bundle load/export/reload
- shared asset materialization
- a `Three` preview baseline
- editor-session and local control foundations
- a first scripted agent-native creative-loop proof
- validation and golden tests

That means this roadmap is not about inventing V2 from scratch.

It is about turning the current V2 baseline into a genuinely operable live
authoring system for both humans and agents.

Very important clarification:

- this roadmap is not a plan to replace the V1 editor with a weaker different
  editor concept
- this roadmap is a plan to rebuild the proven V1 editor experience on top of
  V2 runtime/action/document truth

The V1 editor is the UX reference.

The V2 package/app baseline is the new architectural core.

One hard rule for the roadmap:

- do not replace the visible editor with a simplified alternate shell
- do not “modernize” the UI by lowering its density or changing its product
  posture
- do not treat agent operability as a reason to redesign the editor

The deliverable is:

- the same editor surface
- backed by better architecture
- operable by both humans and agents

## Roadmap Principles

This roadmap should stay disciplined around a few rules.

- The editor must remain a client of runtime and actions.
- The live loop must stay truthful to the runtime.
- Browser automation may help, but it must not become the architecture.
- The agent must operate stable contracts, not hidden UI state.
- Code authoring and scene authoring must both remain first-class.
- Each phase should end with a real validation gate, not only “it seems good”.
- The rebuild must preserve the caliber of the current editor UX, not drift
  into a lower-ambition dev-shell experience.

## Phase 1: Working-Head-Driven Editor Foundation

### Goal

Make the future real editor foundation operate over canonical project state and
canonical project actions instead of hidden editor-owned runtime semantics.

### Why this phase comes first

If the editor foundation does not operate through the same working-head and
action model
that the agent will use later, everything after this will drift into special
cases.

This is the phase that turns the V2 foundation from “a runtime shell” into
“the architectural base for the real editor experience”.

This phase should be understood as:

- keep the visible editor shell
- replace the ownership model beneath it

### Deliverables

- a canonical in-memory working-head model inside the editor foundation
- explicit loading of a project document into working head
- action-driven mutation inside the studio
- live preview updates from the working head through the shared runtime path
- stable editor state split between:
  - scene truth
  - editor UI state
  - preview/runtime state
- first scene inspection surfaces that read canonical project state directly

### Concrete scope

- create an editor-side document session layer
- route layer changes through `@viz-engine/actions`
- route graph changes through `@viz-engine/actions`
- make the preview recompute from updated working head
- keep editor-only UI state separate from document state
- add project-state panels that inspect the current canonical document

### Non-goals

- full polished editor UX
- cloud sync
- agent chat UI
- specialized runners

### Exit criteria

- the editor foundation can load one canonical example or bundle-backed project
- the editor foundation can mutate the project via canonical actions
- the preview updates without manual restart
- the working head can be serialized/exported again without hidden editor-only
  state leaking into it

### Validation

- editor/client integration tests for action-driven scene mutation
- roundtrip tests:
  - load project
  - apply actions
  - export bundle
  - reload bundle
  - render same project successfully
- explicit assertion that editor-only UI state is not serialized into project
  truth

## Phase 2: Live Preview And Audio Session Loop

### Goal

Make the real editor foundation a serious live audio-reactive authoring
environment instead of
only a deterministic frame preview shell.

### Why this phase matters

The final vision is not only “the agent edits JSON”.
It is “the user plays music and watches the visual respond while the agent
keeps iterating”.

That requires a clean live transport and audio session model.

### Deliverables

- explicit studio transport model:
  - play
  - pause
  - seek
  - current time/frame
- explicit audio source/session model for live preview
- runtime live-mode execution path integrated into the studio
- clear parity posture between:
  - live analyzer inputs
  - baked deterministic inputs
- first audio session diagnostics and status surface

### Concrete scope

- define a studio transport controller
- define a studio audio source lifecycle
- feed live timing into runtime session/live evaluation
- preserve the deterministic render-mode path separately
- make it obvious when preview is using:
  - live audio analysis
  - baked feature artifacts
  - mixed fallback behavior

### Non-goals

- final production audio engine perfection
- cloud media session management
- hidden analyzer state smuggled into scene truth

### Exit criteria

- the user can load audio and play/pause/seek in the editor
- the preview reacts live through the runtime path
- the same scene still renders deterministically in render mode
- the system can clearly explain what live inputs versus baked inputs are in
  use

### Validation

- transport-state tests
- live-preview integration tests
- deterministic render regression tests proving live-mode additions did not
  corrupt render semantics
- manual browser verification of the play/pause/seek loop in the editor

## Phase 3: Local Agent Control Surface

### Goal

Give the agent a real local operating surface for the editor and runtime
without requiring fragile UI-level control as the primary mechanism.

### Why this phase matters

This is the real bridge from “good architecture” to “the agent can actually
drive the system”.

Without it, the agent is still mostly a code editor plus browser observer.

### Deliverables

- a local tool surface for:
  - reading the working head
  - applying project actions
  - inspecting graphs
  - inspecting preview/runtime outputs
  - triggering bundle export
  - triggering bake/preview helpers
- a small set of stable editor-facing operations such as:
  - open project
  - switch example/bundle
  - inspect preview state
  - request a frame/debug snapshot
- clear shared semantics between:
  - CLI
  - tests
  - future MCP/tool surfaces

### Concrete scope

- grow the local-first operator surface toward the future MCP inventory
- add structured JSON outputs for agent use where missing
- define a local editor control contract
- allow the agent to inspect current working head and preview state without
  scraping arbitrary UI text
- keep browser automation as optional verification, not primary mutation path

### Non-goals

- full cloud/MCP product layer
- multi-user collaboration
- speculative large agent-runner infrastructure

### Exit criteria

- the agent can open the editor and inspect the current scene state
- the agent can mutate the scene without editing random files by hand
- the agent can request useful preview/runtime diagnostics through stable local
  surfaces
- the browser remains useful, but the main mutations happen through contracts

### Validation

- contract tests for the local tool/operator surface
- end-to-end local tests:
  - start from example/bundle project
  - apply actions through operator surface
  - verify working head change
  - verify preview/runtime outputs update
- manual browser verification that those changes are visible in the live editor

## Phase 4: Live Component Authoring Loop

### Goal

Make it realistic for the agent to create or change a visual component while
the user keeps the editor open and sees the result update with minimal friction.

### Why this phase matters

The vision is not only about reusing prebuilt components.
It also includes:

- “write the component for it”
- “set up the audio reactivity”
- “let me see it immediately”

That requires a cleaner component-authoring loop than V1 had.

### Deliverables

- a documented and enforced component registration path
- reliable hot-reload or equivalent code-refresh behavior in the editor
- minimal component scaffolding path for new V2 components
- strong validation around component metadata and executable contract shape
- a few intentionally ported V1 visual ideas rebuilt as true V2 components

### Concrete scope

- tighten component package registration and discovery
- make new component creation predictable
- ensure editor reload path is fast and stable for component edits
- add tests for component registry and contract validation
- port a few meaningful V1 visuals into V2 the right way

### Non-goals

- full V1 parity
- giant component marketplace complexity
- speculative remote code execution

### Exit criteria

- the agent can add a new component cleanly
- the editor can pick it up without restart-heavy workflows
- the component can consume graphs/assets/artifacts through the canonical V2
  path
- at least a few serious visuals exist that prove V2 is not only framework
  infrastructure

### Validation

- component registry tests
- component contract validation tests
- manual editor verification of live component iteration
- regression tests for ported V1-derived components

## Phase 5: Rich Scene Authoring And Debugging

### Goal

Make the editor strong enough as a shared inspection and debugging surface that
the user can comfortably watch, inspect, and intervene while the agent does the
heavier work.

### Why this phase matters

The editor should not just be a canvas.
It should be the shared truth surface for:

- scene structure
- graph behavior
- asset/artifact state
- runtime diagnostics
- preview understanding

### Deliverables

- better scene tree inspection
- graph inspection/debug surfaces
- preview/runtime diagnostics surfaces
- clearer asset/artifact provenance visibility
- better issue surfacing for invalid scene state

### Concrete scope

- make the current working head inspectable in the UI
- make graph outputs and important node state inspectable
- add layer/component/graph issue surfaces
- expose whether values are coming from:
  - literals
  - graph outputs
  - assets
  - baked artifacts
- make runtime warnings legible without reading console noise

### Non-goals

- giant visual design overhaul
- trying to solve every advanced editor workflow at once

### Exit criteria

- the user can understand what the scene is doing from the editor
- the agent can use the same inspection surfaces to reason about problems
- debugging a broken scene no longer depends mostly on repo diving

### Validation

- UI integration tests for inspection surfaces
- runtime issue snapshot tests
- manual inspection workflow verification in the browser

## Phase 6: Agent-Native Creative Loop

### Goal

Make the collaborative workflow genuinely real:

- user gives direction
- agent builds and iterates the scene live
- user watches, listens, and steers
- the system stays truthful, modular, and testable

### Why this phase matters

This is the phase where the architecture starts to feel like the product
thesis, not only a good internal structure.

### Deliverables

- a stable local agent workflow for:
  - open studio
  - inspect scene
  - mutate working head
  - write component code
  - verify preview
  - continue iterating
- a documented creative loop for human-plus-agent authoring
- first intentional prompt-to-visual authoring demonstrations
- stronger connection between:
  - action surface
  - studio
  - code authoring
  - preview verification

### Concrete scope

- define the actual local iterative workflow
- formalize the most useful operation sequences
- tighten failure surfaces where the agent can get stuck
- ensure the live loop survives repeated edits without falling apart

### Non-goals

- final hosted chat product
- generalized cloud runner system
- speculative large orchestration platform work

### Exit criteria

- the user can plausibly direct a visual in conversation while the agent drives
  most of the actual construction work live
- the editor remains truthful to the runtime and project document
- the workflow feels like a real creation harness rather than a toy demo

### Validation

- scripted local end-to-end authoring scenario
- repeated manual scenario verification:
  - open studio
  - change scene
  - add or edit component logic
  - play audio
  - inspect and iterate
- explicit regression coverage for the key operator paths used in that loop

## Phase 7: Later Cloud And Runner Expansion

### Goal

Layer the broader hosted and specialized-agent future on top of a proven local
baseline.

### Why this phase is later

We should not destabilize the baseline by rushing into cloud/operator
complexity before the local collaborative loop is real.

### Deliverables

- hosted working-head/project/version flows
- cloud tool surfaces
- specialized runners
- later publishing/integration workflows

### Exit criteria

- hosted Viz reuses the same real local core instead of becoming a separate
  architecture

### Validation

- should be defined when this phase becomes active

## Cross-Phase Validation Rules

Every phase should preserve or improve these gates:

- `pnpm check:foundation` stays green
- golden outputs are updated deliberately
- new behavior gets direct tests, not only manual confidence
- the studio build stays healthy
- bundle roundtrip and portable runtime paths do not regress

And every phase should add at least one new validation surface that directly
proves the thing that phase claims to unlock.

## What We Should Explicitly Avoid

- agent-only mutation paths that bypass the canonical action layer
- studio-only scene semantics that drift away from runtime truth
- live-audio shortcuts that quietly corrupt render determinism
- new editor complexity that is not clearly in service of the live
  collaborative loop
- premature cloud-first abstractions before the local authoring loop is proven
- giant speculative agent layers before the local control surface is stable

## Recommended Immediate Next Execution Order

From where the repo stands today, the next best sequence is:

1. Phase 1: working-head-driven editor foundation
2. Phase 2: live preview and audio session loop
3. Phase 3: local agent control surface
4. Phase 4: live component authoring loop

That is the minimum serious path to make the desired collaborative workflow
feel real.

## Summary

The road is now clear.

We are not aiming for:

- a manual editor with a bolted-on assistant
- a browser automation trick
- a prompt wrapper around hidden app state

We are aiming for:

- one truthful runtime
- one truthful working head
- one live editor that consumes that truth
- one stable action/tool surface
- one collaborative loop where the agent can build visuals live while the user
  watches, listens, and directs

That is the right road from the current V2 baseline to the intended future.
