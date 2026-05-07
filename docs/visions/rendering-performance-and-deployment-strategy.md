# Rendering Performance And Deployment Strategy

This document defines the intended rendering posture for VizEngine V2 across:

- live client preview
- deterministic local export
- hosted server rendering
- future higher-end performance paths

It also makes the compositing model explicit so Viz can preserve a real
layer-based visual system without falling back to DOM stacking or vague
renderer coupling.

## Why This Exists

VizEngine V2 needs a rendering posture that is:

- visually expressive
- deterministic in render mode
- fast enough for live authoring
- realistic to deploy early
- extensible enough for future higher-end backends

We do not want to accidentally design:

- a browser-only live toy
- a server renderer that cannot reproduce the editor
- a fake universal renderer abstraction
- a DOM-composited stack that leaks browser behavior into scene truth

## Core Position

The correct V2 rendering shape is:

- Viz owns scene semantics and compositing semantics
- Viz runtime evaluates deterministic frame state
- a scene compositor combines layer outputs into a final frame
- Remotion is the first production render host
- FFmpeg is the encoding and muxing layer

The correct early backend posture is:

- primary rendering backend: `Three/WebGL`
- optional simple secondary backend: `Canvas2D`
- future higher-end backend family: `WebGPU`

The correct deployment posture is:

- client preview runs GPU-first in the browser
- hosted renders run CPU-first on Railway at first
- heavy premium rendering may later move to dedicated GPU workers if needed

## Non-Goals

V2 should not start by trying to:

- support every rendering engine equally
- promise that every component works on every backend
- collapse all rendering into HTML/CSS/DOM stacking
- build a fully custom video encoder
- depend on hosted GPU infrastructure from day one

## Scene Compositing Model

Viz should preserve a real compositing system.

The compositor should be engine-owned and explicit, not an accident of DOM
layout.

The intended frame pipeline is:

1. evaluate deterministic runtime state for frame `N`
2. evaluate visible layers in stable order
3. ask each layer renderer to emit a compositable output surface
4. composite those surfaces in the scene compositor
5. emit the final frame target for preview or export

This means the scene compositor becomes the canonical place that owns:

- layer ordering
- visibility
- opacity
- transforms
- masks
- clipping
- blend modes
- effect passes
- background/final output assembly

The scene compositor must behave identically in:

- live preview mode
- local deterministic render mode
- hosted render mode

## Layer Output Contract

Different layer implementations may use different internal rendering methods,
but they should converge to a shared output contract before compositing.

The practical V2 contract should be conceptually close to:

- `LayerRenderInput`
  Frame index, fixed timestep context, resolved assets, baked artifacts,
  deterministic state, and renderer capability context.
- `LayerRenderOutput`
  A compositable output surface plus metadata needed for deterministic
  compositing.

That output surface will usually be one of:

- GPU texture / framebuffer-backed target
- canvas-backed image surface
- image/video texture source
- future backend-specific target that can be normalized into the compositor

The important rule is:

- layers may render differently internally
- layers may not invent their own final composition semantics

The scene compositor remains the owner of final layer combination.

## Multiple Renderer Families Per Scene

Viz should plan for multiple renderer families, but not by pretending arbitrary
mixing is free.

The clean posture is:

- one primary scene compositor backend
- explicit layer backend compatibility
- explicit cross-backend boundary when a layer must be mixed into the primary
  compositor

Examples:

- `Three/WebGL` layer renders into a framebuffer texture and stays entirely in
  GPU space
- image/video layer uploads media as textures and stays entirely in GPU space
- `Canvas2D` layer renders offscreen and is uploaded into a GPU texture before
  composition
- future `WebGPU` layer must only be mixed through an explicit bridge/export
  path if the primary compositor is not also `WebGPU`

This means cross-backend composition is possible, but it should never be
implicit.

The early rule should be:

- the primary compositor backend is `Three/WebGL`
- foreign layer backends are allowed only if they can emit a clean compositable
  surface into that compositor

## Determinism Requirements

Multiple renderers and layer types are fine as long as determinism rules are
held at the scene/runtime level.

Deterministic rendering requires:

- fixed frame number as the main time coordinate
- fixed timestep for stepping temporal state
- seeded randomness
- stable layer order
- explicit blend/composite settings
- explicit effect passes
- no dependence on wall-clock timing
- no dependence on browser DOM/compositor behavior
- no hidden mutable editor-only state

Physics, feedback systems, and temporal effects are still valid, but they must
either:

- step deterministically per frame
- or consume baked checkpoints / baked timelines

## Client Rendering Strategy

Client rendering should be GPU-first.

The baseline recommendation is:

- live preview and editor visuals should primarily use `Three/WebGL`
- simple 2D visuals may use `Canvas2D` where that is cheaper and cleaner
- future high-end compute-heavy systems may use `WebGPU`

### Why `Three/WebGL` First

`Three` is the right early baseline because:

- it already fits the current repo direction better than introducing a new 3D
  stack
- it gives access to GPU textures, shaders, render targets, batching, and
  instancing
- it is a pragmatic default for both 2D-in-3D compositing and true 3D systems
- it can host a scene compositor cleanly

### Client Performance Principles

The high-value performance posture is:

- keep media as GPU textures
- do transforms and effects in shaders when possible
- minimize CPU pixel work
- minimize GPU readbacks
- batch draw calls when possible
- use instancing for repeated geometry
- use render targets/framebuffers for feedback and multi-pass effects
- use `OffscreenCanvas` and workers where they actually help
- keep audio-reactive inputs precomputed and sample them cheaply at runtime

Avoid:

- `getImageData()` loops
- CPU-side per-pixel frame processing in hot paths
- repeated texture uploads that could be cached
- final composition via stacked DOM elements

## Server Rendering Strategy

The first production server rendering posture should be:

- Viz runtime computes deterministic frame behavior
- Remotion hosts the composition and frame rendering pipeline
- native FFmpeg encodes and muxes the final media

That means the early production path is:

- deterministic Viz scene input
- Viz Remotion adapter
- Chromium-driven frame rendering
- native FFmpeg encode/mux

### Why Remotion

Remotion is the correct first render host because it already gives us:

- a stable composition model
- production-oriented render orchestration
- existing Magnify compatibility
- browser-backed frame rendering
- integration with existing server render workflows

For Viz, Remotion should remain:

- an adapter host
- not the core scene architecture
- not the canonical authoring model

### Why FFmpeg Still Matters

Remotion and FFmpeg do different jobs.

Remotion is for:

- evaluating the composition
- driving frame rendering
- orchestrating server render flow

FFmpeg is for:

- encoding video
- encoding audio
- muxing audio and video
- container output
- bitrate/pixel-format/codec concerns

So the correct mental model is not:

- `Remotion or FFmpeg`

It is:

- `Viz runtime` draws frames
- `Remotion` hosts and orchestrates frame rendering
- `FFmpeg` produces the final distributable media artifact

FFmpeg alone is not enough because it does not run Viz scene/runtime semantics.

Remotion alone is also not the whole story for final media output, because the
final encoding/muxing layer is still a codec/container problem.

## Railway Deployment Posture

The default deployed compute posture should be:

- Railway for API and worker compute
- CPU-first server rendering at first
- native FFmpeg available in render workers
- R2 for input/output artifact storage

This is the clean early shape because it is simple and deployable.

It also matches the current likely reality that Railway is appropriate for:

- API services
- orchestration workers
- bake workers
- render workers

But not the right place to assume always-available hosted GPU rendering.

That means V2 should not require GPU-backed server rendering to succeed.

## How To Keep Server Rendering Fast Without GPU Dependence

The main performance wins should come from architecture first:

- deterministic runtime
- standard feature auto-bakes
- optional heavy offline analyses
- baked simulation checkpoints for expensive temporal systems
- explicit render-safe vs bake-required classification
- native FFmpeg encoding
- avoiding repeated recomputation from scratch for heavy scenes

The strongest practical server-side performance techniques are:

- pre-bake standard audio feature timelines
- pre-bake heavy analysis only when needed
- pre-bake simulation checkpoints when random access would be expensive
- keep final render stepping sequential where possible
- avoid runtime graph work that should have been cached or baked

## Future Higher-End Path

If Railway CPU rendering eventually becomes the proven bottleneck, the clean
upgrade path is:

- keep Railway for API, orchestration, auth, DB-backed product services, and
  normal workers
- move only heavy premium render workers to a dedicated GPU-capable provider
- preserve the same Viz runtime, scene contract, artifact contract, and job
  model

That means the future scaling move is:

- swap the heavy render execution environment
- not rewrite Viz scene semantics

This is important because it keeps the system stable even if render
infrastructure evolves.

## Recommended Early V2 Rendering Stack

The recommended first serious stack is:

- scene compositor backend: `Three/WebGL`
- simple fallback/backend adjunct: `Canvas2D`
- runtime render host for production export: `Remotion`
- encoder/muxer: native `FFmpeg`
- hosted deployment baseline: `Railway`
- durable media/object storage: `Cloudflare R2`

This is the cleanest combination of:

- realism
- performance
- determinism
- Magnify compatibility
- deployment simplicity

## Explicit Anti-Patterns

V2 should explicitly avoid:

- making DOM stacking the real compositor
- letting every layer define its own final composition semantics
- promising universal backend portability without capability metadata
- making hosted rendering depend on GPU availability from the beginning
- treating Remotion as the core Viz architecture
- treating FFmpeg as a scene runtime

## Implementation Order

The rendering architecture should become real in this order:

1. define the compositor and layer output contracts in code
2. implement the first primary compositor backend in `Three/WebGL`
3. support one simple real layer path end-to-end
4. wire the deterministic runtime into the Remotion adapter
5. prove local deterministic render
6. prove package-first Magnify render
7. add more backend diversity only after the baseline is stable

## Final Position

VizEngine V2 should preserve a real compositing system and make it more
explicit, more deterministic, and more portable.

The clean architecture is:

- explicit scene compositor
- explicit layer output contract
- `Three/WebGL` as the first strong compositor backend
- Remotion as the first production render host
- native FFmpeg as the encoding and muxing layer
- Railway as the first deployed compute environment

That gives Viz a rendering system that is:

- live-capable
- deterministic
- packageable
- Magnify-compatible
- deployable now
- extensible later
