# Current State

## Project Status

VizEngine is at the boundary between:

- a strong V1 prototype/editor
- and a planned V2 rewrite into a deterministic runtime plus authoring system

The current codebase already proves several important ideas:

- typed component definitions
- typed node graph authoring
- live audio-reactive visuals
- browser-native editing and preview
- offline audio analysis and offline export direction

But the current implementation is still fundamentally editor-first and
browser-state-driven. It is not yet a clean deterministic runtime that can be
reliably embedded into Remotion or other headless rendering systems.

## Active Focus

The active architectural focus is VizEngine V2.

That means the repo should move toward:

- a versioned project document as the canonical source of truth
- a headless runtime that can evaluate frames deterministically
- a clear split between editor state and runtime state
- first-class baking and precomputation for heavy audio or simulation work
- a clean adapter path into Magnify Core / Remotion rendering
- an AI-native command surface for scene creation and editing
- a full replacement rewrite with explicit purge of obsolete V1 architecture

## Current V1 Truth

Today the repo still contains:

- the existing Next.js editor
- Zustand-heavy runtime coupling
- component code that may depend on hidden mutable state
- node evaluation paths that are partly editor-oriented
- browser export pipelines that are useful but should not become the production
  render architecture

## What Should Not Be Assumed

Do not assume:

- the current store layout is the correct long-term runtime architecture
- the current export path should become the main production renderer
- the current Remotion scaffolding is already the right integration model
- all existing components should survive unchanged into V2
- live-first behavior and render-deterministic behavior are the same problem

## Current Rewrite Posture

Preferred posture:

- salvage the good contracts and ideas
- rewrite the runtime boundaries aggressively
- purge obsolete structure decisively
- keep the authoring DX simple
- treat deterministic evaluation as a first-class requirement
- treat AI controllability as a first-class requirement

## Immediate Docs To Use

- [working-agreements.md](./working-agreements.md)
- [visions/viz-engine-v2-vision.md](./visions/viz-engine-v2-vision.md)
- [suggestions.md](./suggestions.md)
