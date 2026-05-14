# First Visual Runtime Proof Plan

## Purpose

This document defines the next implementation slice after the V2 foundation
runtime setup.

It exists to answer:

- what must happen to move from foundation infrastructure to actual visuals
- what the first executable component/runtime proof should look like
- how the same render path should be shared between studio and Remotion

## Core Position

The V2 foundation is now stable enough that the next bottleneck is no longer
repo structure.

The next bottleneck is:

- there is still no actual executable component contract
- there is still no actual render output contract
- there is still no actual visual output flowing through the new runtime

So the next slice must become a real visual runtime proof.

## What This Slice Must Prove

This slice should prove all of the following:

- a component can execute from canonical runtime inputs
- a component can emit deterministic render output
- multiple layers can be combined into one frame scene structure
- the studio shell can render that scene structure
- the Remotion adapter can produce the same scene structure

If those are true, V2 has crossed the line from foundation setup into real
runtime behavior.

## Scope

This slice should include:

- executable component contract
- explicit render-node contract
- runtime render-plan creation
- first real component implementations
- first simple proof renderer
- studio visual proof
- Remotion visual proof
- tests

## Non-Goals

This slice should not yet try to deliver:

- full graph execution
- final Three/WebGL compositor
- final editor rewrite
- cloud product work
- advanced asset upload/storage workflows
- multi-renderer implementation breadth

Those depend on first proving the runtime execution path.

## Recommended Package Additions

This slice likely needs two new packages:

- `packages/viz-components-core`
- `packages/viz-renderer-svg`

Why:

- components should not live in example-fixture packages
- the proof renderer should be explicit instead of hidden in the app shell

## Executable Component Contract

We need a real runtime-facing component interface, not just metadata.

The first version should stay very small.

It should let a component:

- declare identity/metadata
- receive frame context
- receive resolved layer inputs
- receive layer settings
- emit deterministic render nodes

It should not yet require:

- final backend-specific rendering
- live mutable editor coupling
- graph ownership

## Render Output Contract

Before we build the real Three compositor, we should introduce a tiny explicit
render-node scene contract.

This should be intentionally narrow.

A good first proof-level contract is:

- `group`
- `rect`
- `circle`

That is enough to prove:

- backgrounds
- bars
- glow/bloom accents

Without inventing a fake universal graphics language.

## First Proof Components

The first real components should be:

- `solid-color`
- `reactive-bars`
- `radial-bloom`

Why:

- they already match the canonical example project
- they test static, audio-reactive, and accent-layer behavior
- they let us prove real multi-layer composition without overbuilding

## First Proof Renderer

The first renderer should be an explicit SVG proof renderer.

That is the right first move because:

- it is deterministic
- it is easy to validate
- it works in studio immediately
- it can be shared with Remotion proof paths
- it does not commit us to DOM stacking as the architecture

Important:

- this is a proof renderer
- not the final long-term compositor decision

The long-term compositor baseline still remains `Three/WebGL`.

## Runtime Flow After This Slice

The intended proof flow becomes:

1. load canonical project
2. validate project
3. create runtime session
4. resolve frame plan
5. execute layer components into render nodes
6. assemble a frame render plan
7. render via SVG proof renderer

That should happen the same way for:

- studio preview
- Remotion proof output

## Studio Outcome

After this slice, `apps/viz-studio` should stop being just an inspector.

It should:

- still inspect runtime output
- also render the actual visual result from the render plan

## Remotion Outcome

After this slice, `@viz-engine/remotion-adapter` should stop being only a
frame-context shell.

It should:

- create the same render plan as studio
- expose proof-level SVG output from the shared runtime path

## Tests Required

This slice should add tests for:

- executable component registry behavior
- deterministic render-plan generation
- SVG output generation
- Remotion proof render-plan or markup output

The full V2 check should remain green after the slice.

## Final Position

The goal of this slice is to make V2 visually real for the first time without
overcommitting the final renderer/compositor architecture.

That means:

- small explicit render contract
- real component execution
- explicit proof renderer package
- shared runtime output across studio and Remotion

This is the right bridge into the first true rendering system.
