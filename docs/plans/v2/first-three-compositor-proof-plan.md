# First Three Compositor Proof Plan

## Purpose

This document defines the next implementation slice after the first SVG proof
renderer path.

It exists to answer:

- how Viz should introduce the first actual compositor proof
- how `Three/WebGL` should fit without breaking runtime ownership
- how the SVG proof renderer should remain useful

## Core Position

The SVG proof renderer successfully proved:

- executable components
- explicit render nodes
- deterministic render-plan generation
- shared output across studio, Remotion, and CLI

But it is still a proof renderer.

The next step is not replacing the shared render plan.
The next step is proving that the same render plan can drive a real compositor
baseline.

That baseline should be `Three/WebGL`.

## What This Slice Must Prove

This slice should prove all of the following:

- a `VizRenderPlan` can drive a real `Three` scene
- the studio app can render that scene through WebGL
- the runtime and component layers do not need to change ownership to support
  the compositor
- the SVG proof path remains available as a deterministic debug/fallback
  renderer

## Non-Goals

This slice should not yet attempt:

- final production-grade compositor architecture
- full shader/effect pipeline
- final layer masking pipeline
- full media texture/video support
- headless server-side WebGL rendering
- replacing the SVG proof renderer entirely

## Architectural Rule

The shared `VizRenderPlan` remains the contract boundary.

That means:

- runtime owns frame and render-plan generation
- renderer packages consume the render plan
- renderer packages do not redefine scene semantics

This is the key thing we must preserve.

## Recommended New Package

The next package should be:

- `packages/viz-renderer-three`

Immediate ownership:

- mapping proof-level render nodes into `Three` scene objects
- creating/updating a scene graph from a `VizRenderPlan`
- keeping proof-level rendering behavior explicit and testable

## What The First Three Renderer Should Support

Only support what the current render-node contract already has:

- `group`
- `rect`
- `circle`
- opacity
- basic transforms

That is enough to prove:

- background fill
- bar visuals
- bloom circles

Without overreaching.

## Studio Outcome

After this slice, `apps/viz-studio` should:

- compute the shared render plan once
- show the real `Three/WebGL` preview as the primary proof surface
- keep the SVG proof surface available as a debug/inspection view

This is important.

We do not want to lose the deterministic inspection posture while adding the
real compositor proof.

## Testing Requirements

This slice should add tests for:

- mapping render nodes into scene nodes or scene metadata
- deterministic renderer preparation logic
- no regression in the shared `check:foundation` path

We do not need browser pixel-perfect snapshot testing yet.

## Final Position

This slice is successful if:

- the same `VizRenderPlan` drives both SVG and `Three`
- studio renders through WebGL from the shared runtime path
- the architecture stays clean

That will make V2 visually more real without compromising the ownership model
we just established.
