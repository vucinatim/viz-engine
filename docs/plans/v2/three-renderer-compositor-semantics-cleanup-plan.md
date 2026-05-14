# Three Renderer Compositor Semantics Cleanup Plan

## Purpose

This document defines the next implementation slice after the first shared
asset materialization layer.

It exists to answer:

- how to make the `Three` preview path less proof-like
- how to stop losing group-level opacity and blend semantics
- how to fix primitive-style mistakes that make preview diverge from the shared
  render graph meaning

## Why This Slice Exists

The current `Three` path proves that the shared `VizRenderPlan` can drive a
real WebGL preview, but two important semantics are still too weak:

1. group-level opacity and blend are not propagated correctly because groups do
   not own materials
2. stroke-only rects are rendered incorrectly because the proof renderer treats
   them like filled planes

That is enough drift to become a real architecture problem if left alone.

## Goal

Make the `Three` preview consume the shared render graph with cleaner semantic
fidelity without overreaching into a full pass-based compositor yet.

## Implementation Steps

1. add explicit inherited compositing-state propagation through the render tree
2. make group nodes accumulate opacity and blend for descendants
3. stop applying style directly to non-material `Group` objects
4. render rect stroke semantics explicitly instead of faking them as fills
5. add tests that prove inherited opacity/blend and stroke-only rect behavior
6. rerun the full V2 validation surface

## Non-Goals

This slice should not yet attempt:

- full offscreen pass-based compositing
- mask pipelines
- shader/post stack
- final production compositor architecture

## Success Criteria

This slice is complete when:

- group opacity and blend semantics are no longer ignored in the `Three` path
- stroke-only rects no longer render as filled quads
- tests prove the new behavior
- `pnpm check:foundation` passes
