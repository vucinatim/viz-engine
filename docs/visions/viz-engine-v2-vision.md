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

## Replacement Rewrite Principle

VizEngine V2 should be built as a full replacement rewrite, not as a timid
incremental legacy-preservation exercise.

That means:

- old architectural baggage should be removed, not memorialized
- dead code and dead folders should be purged
- long-lived deprecations should be avoided
- compatibility layers should be treated as exceptions, not defaults

The goal is a clean professional system, not a museum of earlier decisions.

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

## AI-Native Vision

VizEngine V2 should be designed so an AI agent can operate it through explicit
contracts instead of UI imitation.

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
