# VizEngine V2 Vision

## Why V2 Exists

VizEngine V1 proved the core creative idea:

- web-native music visuals
- live audio-reactive authoring
- typed components
- typed animation/node systems
- offline export direction

But V1 is still shaped too much like an editor application.

V2 exists to turn VizEngine into the thing it was always trying to become:

- a real runtime
- a real editor for that runtime
- a real machine-operable visual system
- a real rendering attachment for larger media systems like Magnify Core

## Critical UX Principle

V2 is not a license to throw away the V1 editor experience.

The current V1 editor should be treated as a major product asset.

Its strengths include:

- exceptional live-authoring feel
- thoughtful panel layout
- strong layer workflow
- strong audio/visual workflow
- serious creative-tool UX instincts

So the V2 posture should be:

- preserve the quality bar of the current editor experience
- preserve the core workflow shape where it is strong
- replace the hidden architecture underneath it

That preservation should be interpreted very literally unless intentionally
changed:

- same visual/editor shell identity
- same color and control language
- same layout structure
- same timeline and transport posture
- same node-editor posture
- same “serious creative tool” density

This means the rewrite is:

- aggressive about runtime/store/document architecture
- conservative about discarding proven UX without a clearly better
  replacement

## Core Product Thesis

VizEngine V2 should be the canonical system for authoring music visuals.

It should allow:

- humans to inspect, preview, and understand scenes
- AI agents to build and modify scenes directly through stable actions
- Magnify Core to preview, schedule, render, and publish those scenes
- multiple render backends to consume the same scene model

The UI remains important, but mainly as:

- a viewer
- an inspector
- a debugger
- a high-leverage editing surface

not as the only way the system can be operated.

And in practice that editing surface should still feel like a serious live
creative tool, not only a thin inspector shell.

Very important:

- V2 is not a mandate to simplify the editor
- V2 is not a mandate to redesign the editor visually
- V2 is not a mandate to replace dense tool UX with a cleaner-looking but
  weaker shell

The visible product should stay recognizably VizEngine.

VizEngine should also remain its own product, not only an internal Magnify
tool.

The preferred product model is:

- open-source Viz core
- optional hosted Viz Cloud
- deep contract-based integration with Magnify Core

## Primary Architectural Decision

The source of truth should not be:

- the React editor state
- the live playback loop
- the Remotion composition

The source of truth should be:

- a versioned Viz project document
- plus explicit assets
- plus explicit baked artifacts
- plus a deterministic runtime contract

But the product-facing authoring surface should still preserve the strengths of
the current editor where those strengths are real.

So the architectural move is:

- move truth out of app-owned hidden state
- keep the editor as the high-quality cockpit over that truth

The simplest correct phrasing is:

- the editor edits
- the runtime runs
- `VizSession` is the canonical live state engine

The editor should remain the cockpit.

The runtime should be the engine behind it.

React is an appropriate host for the editor surface, but React component
lifecycle should not define scene semantics.

The missing architectural crystallization is now explicit:

- one in-memory `VizSession`
- one canonical command surface over that session
- one canonical read/subscribe surface over that session
- many clients over that same truth

Those clients are:

- the preserved editor UI
- local programmatic hosts
- future agent/MCP tooling
- runtime preview and render attachments

The runtime should be as pure as possible at its core:

- project document
- resolved assets/artifacts
- explicit frame/time input
- explicit mode/session input
- evaluated result

And where state is truly needed, it should live in explicit runtime session
objects:

- checkpoints
- caches
- materialized assets
- live preview session state

not in hidden editor-owned mutable behavior

That same runtime should be controllable through canonical entry points from:

- the editor
- local programmatic hosts
- future MCP/tool surfaces for agents

The editor should not get a private runtime API that agents cannot use.

Agents should not get a separate runtime API that bypasses the editor/runtime
architecture.

From this point forward, “cleaner editor glue” is not the goal.

Direct convergence onto `VizSession` is the goal.

## Replacement Rewrite Principle

VizEngine V2 should be built as a full replacement rewrite, not as a timid
incremental legacy-preservation exercise.

That means:

- old architectural baggage should be removed, not memorialized
- dead code and dead folders should be purged
- long-lived deprecations should be avoided
- compatibility layers should be treated as exceptions, not defaults

The goal is a clean professional system, not a museum of earlier decisions.

That does not mean erasing the current editor’s product strengths.

We should preserve:

- the right live workflow
- the right visual density
- the right interaction posture

while removing:

- the wrong architectural ownership
- the wrong store coupling
- the wrong runtime boundaries

## What VizEngine V2 Must Be

VizEngine V2 must be:

- deterministic when asked to render
- responsive when asked to run live
- headless-capable
- AI-native
- modular
- versioned
- easy to extend with new components and nodes

## Determinism Principle

For any frame in render mode, the engine must be able to answer:

- what inputs were used
- what baked artifacts were used
- what seeded randomness was used
- what state transition rules were applied
- why this exact visual result was produced

Deterministic does not mean boring or static.

It means:

- time is explicit
- randomness is seeded
- state transitions are replayable
- simulation can be recomputed or loaded from baked checkpoints

## Live And Render Should Both Exist

V2 should not sacrifice live strengths just to fit Remotion.

Instead it should support three first-class modes:

### Live

For:

- immediate playback
- responsive tweaking
- improvisation
- visual inspection

### Render

For:

- deterministic final output
- Remotion integration
- worker rendering
- reproducible exports

### Bake

For:

- offline audio analysis
- feature extraction
- simulation checkpoint generation
- any expensive precomputation needed for render parity and speed

## Remotion Position

Remotion should be treated as:

- an important adapter
- an important render backend
- an important Magnify integration target

It should not be treated as:

- the core architecture
- the authoring model
- the only runtime contract

The clean design is:

- Viz owns the scene model and runtime contract
- Remotion mounts or calls the Viz runtime for deterministic frame evaluation

The longer-term backend diversity direction now lives here:

- [Multi-Renderer And Backend Capability Vision](./multi-renderer-and-backend-capability-vision.md)

## Magnify Core Fit

Magnify Core should own:

- orchestration
- artifacts
- approvals
- rendering jobs
- uploads
- scheduling
- operations

VizEngine should own:

- visual scene authoring
- visual runtime semantics
- audio-reactive behavior semantics
- feature-driven visual logic
- baking logic for visual assets and timelines

The clean connection point is:

- one typed scene artifact
- one typed baked-data artifact family
- one preview path
- one final-render path

Magnify should not need to understand editor internals.

The preferred integration shape is connected-workspace style integration rather
than manual copy-paste handoff.

The deeper product and integration model lives here:

- [Viz Cloud And Integration Vision](./viz-cloud-and-integration-vision.md)

## AI-Native Vision

VizEngine V2 should be designed so an AI agent can operate it through explicit
contracts instead of UI imitation.

This does not imply a different user-facing editor paradigm.

The strongest form of that rule is now:

- the agent mutates `VizSession`
- the editor mutates `VizSession`
- the runtime evaluates `VizSession`
- the browser reflects `VizSession`

The intended model is:

- human users keep the strong existing editor surface
- the editor dispatches canonical actions into canonical working-head/runtime
  systems
- the agent dispatches those same kinds of actions through a local/tool surface
- the browser remains a shared visual verification surface, not the primary
  source of truth

That requires:

- a stable project schema
- a stable action model
- strict typed component metadata
- strict typed node metadata
- stable asset references
- deterministic runtime entrypoints
- preview and debug APIs

The ideal flow is:

1. the AI creates or edits a scene
2. the user watches the preview and inspects the result
3. the AI iterates through stable actions
4. the final scene artifact is handed to Magnify for rendering and publishing

The deeper command-and-control direction now lives here:

- [AI-Native Command And Control Surface](../specs/v2/ai-native-command-and-control-surface.md)

Important timing rule:

- the heavy agent-control and specialized-runner layer should come after the
  stable baseline and after Viz proves itself in real Magnify usage

## V2 Package Shape

The preferred long-term package split is:

- `viz-contracts`
  Versioned project schema, asset refs, metadata contracts.
- `viz-runtime`
  Headless deterministic evaluator.
- `viz-bake`
  Offline analysis and simulation baking.
- `viz-editor`
  Browser authoring UI over the same contracts.
- `viz-render-adapters`
  Remotion and other renderer integrations.

The exact folder names can change, but the boundary intent should not.

## Component Model Direction

The V2 component API should preserve what is good about V1:

- typed config
- pleasant authoring
- simple mental model

But it should remove hidden app/runtime coupling.

Components should evolve toward:

- explicit inputs
- explicit local state
- explicit deterministic stepping
- optional bake hooks
- explicit compatibility metadata

Compatibility metadata should distinguish:

- render-safe
- bake-required
- live-only

## Node Model Direction

Node authoring should also become more explicit.

Preferred categories:

- pure nodes
- temporal nodes
- bake nodes

This gives a better system for both humans and AI:

- easier reasoning
- easier validation
- easier render safety checks
- easier future compiler/runtime optimization

## What V2 Should Preserve From V1

Do not lose:

- the joy of quickly writing visuals
- strong typed config primitives
- the hybrid layer plus node mental model
- the live authoring feel
- the editor as a direct visual feedback surface
- the browser-native accessibility of the tool

V2 should be a clarification of the engine, not a betrayal of it.

## Rewrite Posture

This should be treated as a real rewrite, not a sequence of hacks on the old
runtime core.

That means:

- keep good ideas
- keep good APIs where possible
- salvage tested logic selectively
- aggressively replace wrong boundaries

A clean V2 is more important than preserving V1 structure for convenience.

## Success Criteria

V2 is successful when:

- one scene document can drive live preview and deterministic render
- the runtime can run headlessly
- Remotion can render Viz scenes without semantic drift
- AI can author and modify scenes through stable actions
- heavy audio/simulation work can be baked cleanly
- new components and nodes remain easy to write
- Magnify can consume Viz as a clean attachment instead of a special-case hack
