# Multi-Renderer And Backend Capability Vision

## Purpose

This document defines the intended long-term renderer/backend posture for
VizEngine V2.

It exists to answer:

- whether Viz should plan for multiple renderer families
- how Three.js, Babylon.js, Canvas 2D, WebGL, and future WebGPU should fit
- what should stay renderer-agnostic
- what should remain renderer-specific
- how to avoid fake universal abstractions

This is intentionally a vision document, not a near-term implementation spec.

## Core Position

VizEngine V2 should absolutely plan for multiple rendering backends.

But it should do so carefully.

The right posture is:

- `yes` to backend abstraction
- `yes` to future renderer diversity
- `no` to broad multi-engine implementation in the first serious baseline

We should design for renderer pluralism without turning V2 into an
over-abstracted “supports everything” system too early.

## Why This Is The Right Posture

Viz has clear reasons to leave room for multiple backend families:

- some visuals are naturally simple 2D
- some visuals want Three.js/WebGL
- some future visuals may want Babylon.js
- some performance-oriented or compute-heavy systems may eventually want WebGPU

At the same time, pretending everything is portable across every renderer by
default would create bad architecture fast.

The clean move is:

- keep scene truth engine-agnostic
- keep runtime semantics mostly engine-agnostic
- let component implementations and renderer backends be explicit

## Core Architectural Rule

We should distinguish these layers clearly:

1. scene truth
2. runtime semantics
3. renderer backend
4. renderer adapter host

## 1. Scene Truth

The `VizProjectDocument` should remain renderer-agnostic.

It should describe:

- layers
- component ids
- configs
- graph bindings
- assets
- baked artifacts

It should not be polluted with:

- arbitrary renderer-internal scene objects
- engine-specific runtime pointers
- backend-only implementation state

## 2. Runtime Semantics

The runtime should stay mostly renderer-agnostic in terms of:

- timing
- state stepping
- node evaluation
- deterministic behavior
- validation
- layer orchestration

This is where V2 should preserve portability.

## 3. Renderer Backend

Actual drawing/execution backends may differ.

Examples:

- Canvas 2D
- Three.js
- Babylon.js
- future WebGPU
- future offscreen/image-buffer-oriented targets

This is where backend-specific implementation belongs.

## 4. Renderer Adapter Host

Some systems are not renderers themselves, but hosts/adapters for Viz runtime.

Important example:

- Remotion

Remotion should not be thought of as the source runtime.

It should be thought of as an adapter host that mounts Viz runtime/backends for
deterministic rendering.

## What We Should Plan For

We should explicitly leave room for backend families such as:

- `canvas2d`
- `three`
- `babylon`
- `webgpu`
- future custom buffer/offscreen targets

That does not mean they all need equal support early.

It means the architecture should not block them.

## What We Should Not Pretend

We should not pretend:

- every component will work identically across every backend
- every backend will support every feature
- portability between backends is free
- renderer differences can be hidden completely

That is the kind of fake abstraction that creates complexity and lies.

## Component Compatibility Model

The clean future model is explicit capability metadata.

That means components should eventually be able to declare things like:

- compatible renderer families
- preferred renderer family
- live compatibility
- render compatibility
- bake-assisted requirements
- fallback behavior if supported

This is much better than assuming universal compatibility.

## Example Capability Direction

Preferred conceptual direction:

```ts
type VizRendererFamily = "canvas2d" | "three" | "babylon" | "webgpu";

type VizComponentRendererSupport = {
  preferredRenderer?: VizRendererFamily;
  supportedRenderers: VizRendererFamily[];
  supportsLive: boolean;
  supportsRender: boolean;
  supportsBakeAssisted?: boolean;
  featureFlags?: string[];
};
```

This is not the final spec, but it is the right direction.

## Runtime Target Relationship

The existing runtime direction already points the right way:

- `canvas-2d`
- `webgl`
- `offscreen-canvas`
- `image-buffer`

That should evolve into a clearer backend capability model rather than being
collapsed into one rendering implementation.

## Baseline Backend Recommendation

For the first serious V2 implementation, my recommendation is:

- primary backend: `three`
- optional secondary/simple backend: `canvas2d`
- explicit future room for `webgpu`
- no first-class `babylon` implementation unless a specific need emerges

## Why Three.js First

Three.js is the best default baseline because:

- it already exists in the repo ecosystem
- it is a strong practical WebGL baseline
- it can support both 2D-ish and 3D-ish visual paths reasonably well
- it is the most obvious pragmatic renderer family to standardize on first

## Why Canvas 2D Still Matters

Canvas 2D is still valuable for:

- simpler visuals
- cheaper fallback paths
- some debugging or preview flows
- cases where full Three/WebGL machinery is unnecessary

So we should not architect V2 as “Three only forever.”

## Why WebGPU Should Be Planned For

WebGPU is worth planning for now because:

- future performance ceilings may matter
- some simulation/compute-heavy visual systems may benefit from it
- it may become the right target for higher-performance classes of visuals

But it should remain future-facing architecture, not a baseline requirement.

## Why Babylon Should Not Be Baseline By Default

Babylon is not a bad idea.

It is simply not the strongest default first target right now.

We should only add Babylon as a first-class renderer family if there is a
specific reason:

- a clear component family that wants it
- a clear tooling/runtime advantage
- a real product need

Not because we want optionality for its own sake.

## Capability Over Universal Promise

This is one of the most important rules in this vision.

We should prefer:

- explicit backend capability declarations

over:

- vague universal renderer promises

That means some components may be:

- cross-backend
- backend-preferred
- backend-exclusive

And that is fine.

## Example Component Families

Examples of likely trajectories:

### Simple reactive bars/waveform visuals

Could eventually support:

- Canvas 2D
- Three
- maybe WebGPU later

### Shader-heavy particle systems

More likely to be:

- Three/WebGL first
- maybe WebGPU later

### 3D scene-based visuals

More likely to be:

- Three-specific first
- maybe Babylon-specific later if intentionally built

### Compute-heavy simulation visuals

Could eventually become:

- WebGPU-preferred
- bake-assisted for deterministic rendering

## Remotion Relationship

Remotion should remain an adapter host, not a renderer family in the same
sense as Three or Canvas.

Meaning:

- Viz runtime chooses/uses backend capability
- Remotion hosts the deterministic frame render path

This is a very important distinction.

## Magnify Relationship

This posture also fits Magnify well.

Because:

- Magnify should consume Viz through runtime/adapters
- Magnify should not need to understand internal renderer-family complexity
- backend capability should remain a Viz concern

That keeps the integration seam clean.

## Timing Rule

This should stay a future-capability vision, not a baseline implementation
obligation.

The right order is:

1. one strong baseline backend first
2. maybe a second simple backend if clearly useful
3. capability metadata direction
4. broader renderer diversity later

This keeps V2 disciplined.

## Non-Goals

We are not deciding all of this yet:

- final renderer capability schema
- exact package boundaries per backend
- exact WebGPU strategy
- whether Babylon ever becomes a first-class backend
- exact fallback behavior for every component

Those should come later once the baseline runtime is real.

## Final Product Posture

The intended posture is:

- Viz scene truth stays renderer-agnostic
- runtime semantics stay mostly renderer-agnostic
- backend implementations stay explicit
- component compatibility stays explicit
- V2 avoids fake universal renderer abstractions

This is the cleanest way to preserve future renderer diversity without
damaging the baseline architecture.
