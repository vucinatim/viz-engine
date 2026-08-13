# Agent-Operated Live Editor Vision

Status: supporting long-term vision. Its later current-state assessment is
historical; implementation truth lives in
[Current State](../current-state.md), and the canonical north star lives in
[VizEngine Compounding Vision](./viz-engine-compounding-vision.md).

## Purpose

This document defines the concrete collaborative operating model we want from
VizEngine V2.

It exists to answer:

- what the ideal human-plus-agent creation loop should feel like
- whether that loop is actually achievable
- what system layers must exist to make it real
- what still lies between the current baseline and that future

## The Goal

The desired end-state should feel like this:

1. the user says `open up the editor`
2. Viz opens a live editor/preview surface
3. both the user and the agent can see the same visual state
4. the user describes the kind of visual they want
5. the agent creates or edits the scene
6. the agent writes or adjusts components, graphs, assets, and audio-reactive
   behavior as needed
7. the preview updates live without reload-oriented friction
8. the user can play audio, watch, listen, pause, and react
9. the user and agent iterate until the visual is genuinely good

The important posture is:

- the user should not need to manually operate the whole editor
- the agent should be able to drive serious creation work
- the UI should remain visible, inspectable, and overrideable
- live iteration should stay central rather than being sacrificed for
  headless-only purity

## Ideal Division Of Labor

The intended split should be:

### User

The user primarily:

- gives direction
- listens to the music
- watches the preview
- pauses/plays/seeks if desired
- inspects and approves
- occasionally nudges the process

### Agent

The agent primarily:

- opens the correct editor/runtime surface
- creates and mutates the project document
- wires graphs and audio-reactive behavior
- writes new component code when existing components are not enough
- triggers bake/preview/render operations
- inspects diagnostics
- iterates until the output is strong

### Editor

The editor should primarily act as:

- the shared visual surface
- the shared state inspector
- the shared debugger
- the shared validation/diagnostic surface
- a high-leverage override tool when needed

It should not be the only place where scene meaning exists.

## Why This Goal Matters

This is one of the clearest expressions of what V2 is trying to become.

Viz should not stop at:

- a codebase with a nicer internal architecture
- a deterministic renderer
- an editor that is still mostly manual

It should become:

- a serious visual runtime
- a serious live authoring system
- a serious machine-operable creative system

This is also the posture that makes Viz genuinely fit Magnify later.

## Is This Achievable

Yes.

But only if we keep the architecture disciplined.

This goal is achievable because the hard part is not “AI magic”.
The hard part is building the correct operating surfaces:

- one canonical scene model
- one stable mutation model
- one stable runtime
- one stable preview surface
- one stable tool/action surface

If those exist, an agent can operate the system in a clean way.

If those do not exist, the result becomes:

- brittle browser automation
- hidden editor state mutation
- fragile one-off scripts
- prompt-shaped chaos

So the answer is:

- yes, this vision is real
- no, it should not be built by making the agent “click around harder”

## Architectural Requirements

For this workflow to become real, the following must be true.

### 1. Canonical project document

The scene must exist as explicit scene truth.

That means:

- layers are explicit
- components are explicit
- graphs are explicit
- assets are explicit
- baked artifacts are explicit

The user and the agent must be collaborating on the same project document, not
on hidden editor-only state.

### 2. Stable action surface

The agent must be able to mutate the scene through stable actions.

Examples:

- create layer
- delete layer
- reorder layer
- set component
- set input binding
- attach asset
- add graph node
- connect graph nodes
- trigger bake
- export bundle

This is the real control surface.

### 3. Live runtime/editor separation

The editor must consume the runtime.

The editor should not own the meaning of:

- how graphs execute
- how temporal state evolves
- how components render
- how scene truth is interpreted

That is how the live editor can remain truthful while still being agent-driven.

### 4. Shared preview loop

The user and the agent need one shared preview loop.

That means:

- changes should flow into the same working head
- preview updates should happen through the same runtime path
- the preview should not require full-page refresh workflows
- live playback should remain first-class

### 5. Strong inspection surfaces

The agent must be able to inspect:

- current project state
- current layer tree
- graph structure
- resolved asset/artifact state
- frame outputs
- runtime issues
- preview output

The user should also be able to see those things in the editor.

### 6. Component and graph modularity

The system needs strong reusable building blocks.

That means:

- component code remains modular capability code
- graph logic remains modular scene logic
- assets/artifacts remain explicit inputs

The agent should not have to reinvent the entire engine every time.

### 7. Code-authoring path for new visuals

The agent must be able to go beyond parameter tweaking.

That means the system must eventually support:

- generating a new component
- registering it cleanly
- previewing it live
- iterating on its code while the preview remains available

This is one of the biggest reasons V2 must stay package-based and code-native.

## What “Without Refresh” Really Means

This goal does not require pretending the browser is magical.

What it should mean in practice is:

- the editor process stays open
- project mutations are applied live
- the preview updates from the same runtime
- HMR or equivalent code reload handles component implementation changes when
  the agent edits code
- the user does not need to manually restart the whole workflow for normal
  iteration

So the real goal is not “literally no code reload events ever”.
The real goal is:

- no manual restart-heavy workflow
- no clumsy export-import-refresh loop
- no state loss during iteration

## What Full Agent Operation Should Mean

Eventually the agent should be able to do almost everything the product needs
through stable contracts and tools.

That includes:

- open the editor/dev surface
- inspect the current working head
- mutate the scene
- inspect preview/runtime state
- create or edit component code
- add or modify node logic
- trigger bake jobs
- inspect diagnostics
- export/import bundles
- later perform cloud/product operations too

Browser automation may still be useful as a fallback and verification layer.

But the real architecture should prefer:

- project actions
- runtime APIs
- CLI commands
- future MCP/tool surfaces

## Current State Against This Goal

We are not at the end-state yet.

But we are meaningfully closer than V1 ever was.

What already exists:

- canonical `VizProjectDocument`
- pure action surface
- deterministic runtime and frame planning
- graph execution baseline
- first temporal graph execution baseline
- portable bundle load/export/reload
- shared asset materialization
- SVG proof renderer
- `Three` preview renderer with explicit layer compositor ownership
- local-first CLI
- V2 studio shell
- validation and golden-output coverage

What does not yet exist in the final sense:

- a mature editor mutation experience on top of the action surface
- a full agent-callable tool surface for all important authoring flows
- richer component and graph capability depth
- full V1 capability parity where it is worth porting
- durable bake-time checkpoint artifacts
- later chat-native creation/product flows

So the current state is:

- the architecture is finally pointing at this goal
- the baseline is now strong enough to intentionally build toward it
- but the actual collaborative “you say it, the agent builds it live in front
  of you” experience is still ahead of us

## The Correct Path From Here

The path should stay disciplined.

### Phase 1: strong engine truth

Keep strengthening:

- runtime semantics
- compositor semantics
- temporal graph semantics
- bundle/import-export semantics
- action semantics
- validation coverage

This is already underway.

### Phase 2: stronger editor-as-client

The editor should become a better consumer of the real core:

- working-head mutation through actions
- stronger scene inspection
- graph inspection
- bundle/project loading flows
- clearer runtime diagnostics

### Phase 3: agent-operable local tool surface

The agent should be able to:

- inspect project state
- apply actions
- preview frames
- inspect runtime output
- trigger bake/export flows
- open/verify the live editor surface

This should work locally before cloud-first product complexity is layered in.

### Phase 4: live co-creation loop

This is the point where the intended workflow becomes real:

- user asks for a visual
- agent edits scene and code
- preview updates live
- user watches and listens
- agent continues iterating

### Phase 5: later cloud and runner sophistication

After the local baseline and real usage are strong:

- cloud workspaces
- broader agent tooling
- specialized runners
- later publishing/operational flows

## Guardrails

To reach this goal cleanly, we should keep a few strict guardrails.

- Do not let browser automation become the source of truth.
- Do not let editor state become the mutation API.
- Do not let live iteration bypass deterministic runtime contracts.
- Do not let AI-specific shortcuts fork the system into a separate architecture.
- Do not let “agent can do everything” become an excuse for weak core
  structure.

## Summary

The target is very clear:

- the user describes the visual
- the agent builds and iterates it live
- both share one truthful editor/preview surface
- the user mostly watches, listens, steers, and approves

This is achievable.

But it only becomes real if Viz keeps becoming:

- document-driven
- action-driven
- runtime-first
- modular
- inspectable
- live-preview capable

That is the right path to the future you described.
