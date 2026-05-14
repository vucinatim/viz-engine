# Media-Backed Render Node Proof Plan

## Purpose

This document defines the next implementation slice after the first
`Three/WebGL` compositor proof.

It exists to answer:

- how Viz should move beyond primitive proof visuals
- how actual asset-backed visuals fit into the shared render-plan model
- what should be proven before heavier media workflows

## Core Position

The current system proves:

- deterministic runtime ownership
- executable components
- shared render plans
- SVG proof rendering
- `Three/WebGL` proof rendering

But it still only proves primitive visual nodes.

That is not enough for a music-visual product system.

The next slice should prove that the same render-plan model can carry actual
asset-backed visuals, starting with image-backed layers.

## What This Slice Must Prove

This slice should prove:

- a component can emit a media-backed render node
- the render plan can refer to concrete resolved assets
- SVG and `Three` proof renderers can both represent that node
- the canonical example project can include one asset-driven layer

## Non-Goals

This slice should not yet deliver:

- full video-texture playback
- timeline trimming
- advanced crop/mask pipelines
- final media resolver/storage behavior
- upload/cloud media workflows

Those come later.

## Recommended First Asset-Backed Node

The first asset-backed node should be:

- `image`

Why:

- simplest useful proof
- valid in both SVG and `Three`
- exercises resolved-asset flow without requiring time-based video behavior

## Architectural Rule

The asset-backed node must still fit the same ownership model:

- project document owns refs
- runtime session owns resolved assets
- component render logic emits render nodes
- renderer packages consume render nodes

No renderer may start owning asset semantics directly.

## Expected Outcome

After this slice:

- the example project should include an image-backed layer
- studio should render it through the shared `Three` path
- SVG proof output should include it too
- CLI and tests should prove it

## Final Position

This slice is successful if media-backed visuals start fitting into the exact
same system shape as primitive visuals.

That is the right next proof before video, masking, and heavier production
media paths.
