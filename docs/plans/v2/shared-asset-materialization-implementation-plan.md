# Shared Asset Materialization Implementation Plan

## Purpose

This document defines the next concrete V2 implementation slice after the first
media-backed render proof.

It exists to answer:

- how to stop treating resolved assets as if they are already render-ready
- how preview and render hosts should consume a shared materialization seam
- how to keep the portable runtime contract clean while improving real asset
  support

## Why This Slice Exists

The current image-backed proof works, but it still has two architectural
problems:

1. `resolvedAssets` are being used as both storage-level refs and
   render-consumable resources.
2. the `Three` proof renderer still owns image hydration behavior too directly.

That is fine for a proof, but it is not the right long-term runtime boundary.

## Goal

Introduce a shared materialization layer that sits between resolved assets and
render hosts.

The immediate output should be:

- explicit materialized asset contracts
- runtime session access to materialized assets
- asset-ref inputs resolving to materialized assets
- render nodes carrying stable asset ids instead of raw source URIs
- renderers consuming the materialized asset map from the render plan

## Non-Goals

This slice should not yet attempt:

- final cloud/object-storage backends
- async fetch orchestration inside the runtime
- full bundle import/export
- video playback and masking systems
- final compositor-pass refactor

## Implementation Steps

1. add explicit materialized asset contracts
2. add shared runtime asset materialization helpers
3. extend runtime session with materialized asset maps
4. change asset-ref input resolution to return materialized assets
5. remove raw image source URIs from render nodes
6. add materialized assets to render plans
7. rewire SVG and `Three` renderers through the shared materialization seam
8. update example fixtures, CLI, studio, and tests
9. rerun the full V2 validation surface

## Success Criteria

This slice is complete when:

- the runtime no longer treats resolved assets as if they are already render
  nodes
- renderers no longer depend on raw source URIs embedded in the render graph
- the example project still renders correctly through the shared runtime path
- `pnpm check:foundation` passes

## Next Likely Slice After This

After this materialization layer is real, the next best move should be:

- tighter compositor semantics in the `Three` path
- then portable project fixture or bundle validation
