# Explicit Three Layer Compositor Implementation Plan

## Purpose

This slice upgrades the `Three` preview path from a flattened proof renderer
into an explicit layer compositor.

The goal is not the final compositor architecture yet.

The goal is to give the preview path a real place where layer semantics live:

- layer opacity
- layer blend mode
- isolated layer surfaces

## Why This Slice Exists

The earlier cleanup improved primitive fidelity, but it still left one major
problem:

- layer-level semantics were effectively being pushed down into primitive
  materials

That is not the right long-term architecture.

Layer compositing should be owned by a compositor, not smeared across every
mesh.

## Core Direction

The first clean step is:

1. render each layer’s content into its own isolated surface
2. composite those surfaces in stable order
3. apply layer opacity and blend at the compositor surface level

This keeps internal node/group styling separate from layer-level scene
semantics.

## Deliberate Limits

This slice should not yet attempt:

- mask pipelines
- post-processing stacks
- final production-grade render graph scheduling
- shared server-side GPU composition

It should only establish the correct ownership model in the browser preview.

## Validation Bar

This slice is only complete when:

- compositor layers are explicit in code
- tests prove layer opacity is isolated from inner group opacity
- the studio still builds
- `pnpm check:foundation` stays green
