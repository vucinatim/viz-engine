# Current State

## Project Status

VizEngine is at the boundary between:

- a strong V1 prototype/editor
- and a planned V2 rewrite into a deterministic runtime plus authoring system

One very important clarification:

- V1 is not only “legacy code”
- V1 is also the current product-quality UX reference

The editor experience in V1 should be treated as something to preserve
deliberately, even while the hidden runtime/store architecture underneath it is
replaced aggressively.

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

But this should not be misread as:

- discard the V1 editor experience
- replace the product surface with a different weaker dev-shell UI

The intended direction is:

- preserve the strength of the current editor UX
- preserve the actual visible editor shell unless a better replacement is
  intentionally proven
- rebuild that editor over V2 runtime, action, and document truth
- replace architecture, not product instincts

That means preserving by default:

- the same layout
- the same colors and controls
- the same node-editor posture
- the same audio/transport posture
- the same dense, serious-tool feel

That direction is no longer only conceptual.

The repo now has:

- a real V2 runtime/package spine
- a real action-driven working-head foundation
- a real local operator surface
- a separate dev-shell path for engine validation

So the current phase is no longer “invent V2”.

The current phase is “rebuild the real editor experience over those V2 truth
surfaces without regressing the V1 UX bar”.

One important correction:

- an earlier attempt to make a weaker V2 shell the active app surface was
  rolled back
- the V1 editor remains the active product shell
- V2 editor/session/control work should be treated as foundation work until it
  can be wired under the preserved real editor UX

## Current V1 Truth

Today the repo still contains:

- the existing Next.js editor
- Zustand-heavy runtime coupling
- component code that may depend on hidden mutable state
- node evaluation paths that are partly editor-oriented
- browser export pipelines that are useful but should not become the production
  render architecture

The important distinction is:

- these are not all equal
- some of this is architecture debt
- some of this is hard-won product UX value

We should mine V1 aggressively for:

- panel layout and spatial workflow
- live preview feel
- audio/visual interaction patterns
- layer workflow
- animation/node workflow intent
- serious-tool UX density and polish

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
- preserve the V1 editor UX quality bar explicitly
- rewrite the runtime boundaries aggressively
- purge obsolete structure decisively
- keep the authoring DX simple
- treat deterministic evaluation as a first-class requirement
- treat AI controllability as a first-class requirement

## Immediate Docs To Use

- [working-agreements.md](./working-agreements.md)
- [visions/viz-engine-v2-vision.md](./visions/viz-engine-v2-vision.md)
- [suggestions.md](./suggestions.md)
