# V2 Bake Artifact Contract

## Purpose

VizEngine V2 needs a first-class baking system.

Bake artifacts exist so expensive work can happen outside the render loop while
still remaining explicit, portable, and inspectable.

## Core Rule

If a computation is expensive and reused across preview or render, it should be
representable as a baked artifact.

## Artifact Categories

The first baked artifact categories should include:

- audio feature timeline
- beat/onset timeline
- song section map
- waveform summary
- simulation checkpoint set
- simulation full-frame cache
- derived geometry cache

## Desired Shape

Preferred conceptual shape:

```ts
type VizBakedArtifactRef = {
  id: string;
  kind: VizBakedArtifactKind;
  version: number;
  source: VizArtifactSource;
  metadata?: Record<string, unknown>;
};
```

And the underlying artifact payload should be strongly typed per kind.

## Requirements

Bake artifacts should be:

- versioned
- typed
- explicit in the project document
- reusable across modes
- inspectable by humans and AI

## Audio Feature Timeline

The first important artifact family is audio feature data.

This should support:

- frame-aligned values
- source sample rate metadata
- fps metadata
- source window metadata
- feature descriptors

It should be possible for both Viz runtime and Magnify adapters to consume the
same baked feature artifact.

The deeper contract now lives here:

- [Audio Feature Timeline Spec](./audio-feature-timeline-spec.md)

## Simulation Checkpoints

For heavier physics or simulation systems, V2 should support checkpoint baking.

This allows render mode to:

- avoid recomputing from frame zero every time
- remain deterministic
- jump efficiently to arbitrary frames

## Bake Ownership

Baking should be owned by explicit `viz-bake` contracts, not hidden inside
editor-only helpers.

## No Legacy Rule

Do not treat V1 caches or temporary export-side data as the V2 bake system.

The V2 bake system should have explicit contracts from the start.
